import { Scene } from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import { GridSystem, initializeDefaultGridTypes } from '../systems/GridSystem';
import { CodeExecutor } from '../systems/CodeExecutor';
import { BuiltInFunctionRegistry } from '../systems/BuiltInFunctions';
import { Entity, GridTile, Position } from '../../types/game';
import { EventBus } from '../EventBus';
import TaskManager from '../systems/TaskManager';
import { MapEditor } from '../systems/MapEditor';

// Movement Manager for smooth entity transitions
export class MovementManager {
  private scene: Scene;
  private gridSize: number;

  constructor(scene: Scene, gridSize: number) {
    this.scene = scene;
    this.gridSize = gridSize;
  }

  /**
   * Move entity smoothly from current position to target position
   * Returns a promise that resolves when movement is complete
   */
  async moveEntity(entity: Entity, targetPosition: Position): Promise<boolean> {
    // Check if entity is already moving
    if (entity.movementState?.isMoving) {
      console.warn(`Entity ${entity.name} is already moving`);
      return false;
    }

    // Validate target position bounds
    const gameState = useGameStore.getState();
    const { width, height } = gameState.gridSize;
    if (targetPosition.x < 0 || targetPosition.x >= width || 
        targetPosition.y < 0 || targetPosition.y >= height) {
      console.warn(`Target position (${targetPosition.x}, ${targetPosition.y}) is out of bounds`);
      return false;
    }

    // Initialize visual position if not set
    if (!entity.visualPosition) {
      entity.visualPosition = { ...entity.position };
    }

    // Calculate movement duration based on entity's walking speed
    // walkingSpeed is in grids per second, so duration = 1000ms / walkingSpeed
    const movementDuration = Math.max(100, 1000 / entity.stats.walkingSpeed);

    // Set up movement state
    entity.movementState = {
      isMoving: true,
      fromPosition: { ...entity.position },
      toPosition: { ...targetPosition },
      startTime: this.scene.time.now,
      duration: movementDuration
    };

    // Get the entity sprite
    const sprite = entity.sprite;
    if (!sprite) {
      console.warn(`Entity ${entity.name} has no sprite for movement`);
      return false;
    }

    // Calculate pixel positions
    const fromPixelX = entity.position.x * this.gridSize + this.gridSize / 2;
    const fromPixelY = entity.position.y * this.gridSize + this.gridSize / 2;
    const toPixelX = targetPosition.x * this.gridSize + this.gridSize / 2;
    const toPixelY = targetPosition.y * this.gridSize + this.gridSize / 2;

    // Create movement promise
    return new Promise((resolve) => {
      // Create smooth movement tween
      const movementTween = this.scene.tweens.add({
        targets: sprite,
        x: toPixelX,
        y: toPixelY,
        duration: movementDuration,
        ease: 'Power2',
        onUpdate: () => {
          // Update visual position during movement
          if (entity.visualPosition) {
            entity.visualPosition.x = (sprite.x - this.gridSize / 2) / this.gridSize;
            entity.visualPosition.y = (sprite.y - this.gridSize / 2) / this.gridSize;
          }
        },
        onComplete: () => {
          // Movement completed - update logical position
          entity.position = { ...targetPosition };
          entity.visualPosition = { ...targetPosition };
          
          // Clear movement state
          entity.movementState = {
            isMoving: false,
            fromPosition: entity.position,
            toPosition: entity.position
          };

          // Emit movement completed event
          EventBus.emit('entity-movement-completed', { entityId: entity.id, position: targetPosition });
          
          resolve(true);
        },
        onStop: () => {
          // Movement was interrupted
          entity.movementState = {
            isMoving: false,
            fromPosition: entity.position,
            toPosition: entity.position
          };
          resolve(false);
        }
      });

      // Store tween reference
      if (entity.movementState) {
        entity.movementState.tween = movementTween;
      }

      // Emit movement started event
      EventBus.emit('entity-movement-started', { 
        entityId: entity.id, 
        fromPosition: entity.position, 
        toPosition: targetPosition,
        duration: movementDuration
      });
    });
  }

  /**
   * Stop entity movement immediately
   */
  stopMovement(entity: Entity): void {
    if (entity.movementState?.isMoving && entity.movementState.tween) {
      entity.movementState.tween.stop();
    }
  }

  /**
   * Check if any entity is currently moving
   */
  isAnyEntityMoving(): boolean {
    const gameState = useGameStore.getState();
    for (const [_, entity] of gameState.entities) {
      if (entity.movementState?.isMoving) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get movement progress for an entity (0-1)
   */
  getMovementProgress(entity: Entity): number {
    if (!entity.movementState?.isMoving || !entity.movementState.startTime || !entity.movementState.duration) {
      return 1;
    }

    const elapsed = this.scene.time.now - entity.movementState.startTime;
    return Math.min(1, elapsed / entity.movementState.duration);
  }

  /**
   * Stop all entity movements
   */
  stopAllMovements(): void {
    const gameState = useGameStore.getState();
    for (const [_, entity] of gameState.entities) {
      if (entity.movementState?.isMoving) {
        this.stopMovement(entity);
      }
    }
  }
}

export class ProgrammingGame extends Scene {
  private gameStore: ReturnType<typeof useGameStore.getState>;
  private gridSystem: GridSystem;
  private codeExecutor?: CodeExecutor;
  private taskManager: TaskManager;
  private movementManager: MovementManager;
  private mapEditor: MapEditor;
  private mapEditorUI: React.ComponentType<any> | null = null;
  
  // Visual elements
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private entitySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private gridSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private progressBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  
  // Floating text system for code execution
  private executionTexts: Phaser.GameObjects.Text[] = [];
  private executionTextContainer!: Phaser.GameObjects.Container;
  
  // Camera controls
  private cameraKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
  private isLockedToQubit: boolean = true;
  private cameraSpeed: number = 300;
  
  // Constants
  private readonly GRID_SIZE = 128; // About 1/3 of 128 for smaller, more detailed grids
  private readonly GRID_COLOR = 0x444444;
  private readonly GRID_ALPHA = 0.3;
  private readonly QUBIT_SCALE_FACTOR = 1.5; // Qubit is 1.5x larger than grid cells
  private readonly CAMERA_ZOOM_FACTOR = 3; // Camera zoom level (lower = more zoomed out)
  
  // Animation tracking
  private lastQubitPosition: Position | null = null;
  private qubitDirection: 'idle' | 'down' | 'up' | 'left' | 'right' = 'idle';

  constructor() {
    super({ key: 'ProgrammingGame' });
    this.gameStore = useGameStore.getState();
    this.gridSystem = new GridSystem();
    this.taskManager = TaskManager.getInstance();
    this.movementManager = new MovementManager(this, this.GRID_SIZE);
    this.mapEditor = new MapEditor(this);
    
    // Initialize farming grid types
    initializeDefaultGridTypes();
  }

  preload() {
    // Configure pixel-perfect rendering for crisp sprites
    this.load.on('filecomplete', (key: string) => {
      if (key === 'qubit_walk' || key === 'qubit_idle') {
        const texture = this.textures.get(key);
        // Set texture filtering to nearest neighbor for pixel-perfect scaling
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });
    
    // Load the walking spritesheet for qubit
    this.load.spritesheet('qubit_walk', 'Walk.png', {
      frameWidth: 32,  // Updated to match user's adjustment
      frameHeight: 32  // Updated to match user's adjustment
    });
    
    // Load the idle spritesheet for qubit
    this.load.spritesheet('qubit_idle', 'Idle.png', {
      frameWidth: 32,  // Same dimensions as walk sprite
      frameHeight: 32
    });

    // Load the Ground_Tileset for map editor (16x16 tiles in a spritesheet)
    this.load.spritesheet('Ground_Tileset', 'Ground_Tileset.png', {
      frameWidth: 16,
      frameHeight: 16
    });

    // Load the Fence_Wood tileset for map editor (16x16 tiles in a spritesheet)
    this.load.spritesheet('Fence_Wood', 'Fence Wood.png', {
      frameWidth: 16,
      frameHeight: 16
    });

    // Load the Fence_Wood tileset for map editor (16x16 tiles in a spritesheet)
    this.load.spritesheet('Fence_Wood', 'Fence Wood.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    
    // Create simple colored rectangles as sprites for prototyping (other entities)
    this.createPlaceholderSprites();
  }

  create() {
    // Configure pixel-perfect rendering for the entire scene
    this.cameras.main.setRoundPixels(true);
    
    // Initialize the game
    this.gameStore.initializeGame();
    
    // Create animations first
    this.createAnimations();
    
    // Create visual grid
    this.createVisualGrid();
    
    // Load and render ground tiles from MapEditor
    this.mapEditor.loadMap();
    
    // Create some sample grids
    this.createSampleWorld();
    
    // Set up camera
    this.setupCamera();
    
    // Listen to game state changes
    this.setupStateListeners();
    
    // Set up EventBus handlers for movement system
    this.setupMovementEventHandlers();
    
    // Set up execution text system
    this.setupExecutionTextSystem();
    
    // Create UI elements
    this.createUI();
    
    console.log('Programming Game Scene Created');
    
    // Emit event so React component can get scene reference
    EventBus.emit('current-scene-ready', this);
  }

  private createPlaceholderSprites() {
    // Create colored rectangles for different game objects
    const graphics = this.add.graphics();
    
    // Qubit (player entity) - Blue square (fallback for non-animated usage)
    graphics.fillStyle(0x4a90e2);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('qubit', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Farmland - Brown square
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('farmland', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Food Station - Orange square
    graphics.fillStyle(0xFF6600);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('food', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Silo - Gray square
    graphics.fillStyle(0x808080);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('silo', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    graphics.destroy();
  }

  private createVisualGrid() {
    const gameState = useGameStore.getState();
    const { width, height } = gameState.gridSize;
    
    // Create solid color background layer using RGB(240, 162, 84)
    const backgroundGraphics = this.add.graphics();
    backgroundGraphics.fillStyle(0xF0A254); // RGB(240, 162, 84) converted to hex
    backgroundGraphics.fillRect(0, 0, width * this.GRID_SIZE, height * this.GRID_SIZE);
    backgroundGraphics.setDepth(-20); // Below everything else
    
    // Create background sprites for normal grid cells using sprite 13, 2 from Ground_Tileset
    // Frame calculation: row * columns + column = 2 * 16 + 13 = 45
    const defaultTileFrame = 4 * 16 + 13; // Sprite at position (13, 2)
    
    if (this.textures.exists('Ground_Tileset')) {
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          // Position sprites at exact integer coordinates
          const worldX = Math.floor(x * this.GRID_SIZE);
          const worldY = Math.floor(y * this.GRID_SIZE);
          
          const sprite = this.add.sprite(worldX, worldY, 'Ground_Tileset');
          sprite.setFrame(63);
          
          // Set origin to top-left to eliminate gaps
          sprite.setOrigin(0, 0);
          
          // Use setDisplaySize for exact pixel dimensions (no scaling issues)
          sprite.setDisplaySize(this.GRID_SIZE, this.GRID_SIZE);
          
          // Set pixel-perfect rendering
          sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          
          // Set to lowest depth (behind everything)
          sprite.setDepth(-10);
        }
      }
    }
    
    // Grid lines removed for cleaner appearance
  }

  private createSampleWorld() {
    const store = useGameStore.getState();
    
    // Add some sample grids with proper initialization
    const farmlandData = this.gridSystem.initializeGrid('farmland', '');
    const farmlandId = store.addGrid({
      type: 'farmland',
      position: { x: 8, y: 6 },
      name: 'Farmland Plot #1',
      description: 'A fertile plot of land for growing crops',
      properties: {},
      isActive: true,
      functions: farmlandData.functions || [],
      state: farmlandData.state || {},
      taskState: farmlandData.taskState || {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    });
    
    const foodData = this.gridSystem.initializeGrid('food', '');
    const foodId = store.addGrid({
      type: 'food',
      position: { x: 12, y: 6 },
      name: 'Food Station',
      description: 'A station for eating and restoring energy',
      properties: {},
      isActive: true,
      functions: foodData.functions || [],
      state: foodData.state || {},
      taskState: foodData.taskState || {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    });
    
    const siloData = this.gridSystem.initializeGrid('silo', '');
    const siloId = store.addGrid({
      type: 'silo',
      position: { x: 16, y: 6 },
      name: 'Storage Silo',
      description: 'Secure storage for crops and farm items',
      properties: {},
      isActive: true,
      functions: siloData.functions || [],
      state: siloData.state || {},
      taskState: siloData.taskState || {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    });
    
    // Update visual representation
    this.updateVisuals();
  }

  private setupCamera() {
    const gameState = useGameStore.getState();
    const { width, height } = gameState.gridSize;
    
    // Set world bounds to the grid size
    this.cameras.main.setBounds(0, 0, width * this.GRID_SIZE, height * this.GRID_SIZE);
    
    // Set camera to show only part of the world (make world bigger than screen)
    const camera = this.cameras.main;
    camera.setZoom(1);
    
    // Calculate zoom to show about 60% of the world, making it larger than screen
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    const worldWidth = width * this.GRID_SIZE;
    const worldHeight = height * this.GRID_SIZE;
    
    // Make the world larger than the viewport
    const zoomX = gameWidth / worldWidth;
    const zoomY = gameHeight / worldHeight;
    const baseZoom = Math.min(zoomX, zoomY);
    const targetZoom = baseZoom * this.CAMERA_ZOOM_FACTOR; // Use configurable zoom factor
    
    camera.setZoom(targetZoom);
    
    // Center camera on the grid initially
    camera.centerOn(worldWidth / 2, worldHeight / 2);
    
    // Set up smooth camera following
    this.setupCameraControls();
    
    // Set up zoom controls
    this.setupZoomControls();
    
    // Start following the active entity if available
    this.lockCameraToQubit();
  }

  private setupCameraControls() {
    // Set up WASD keys for camera movement
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D, false)
    };
    
    // Set up arrow keys individually (instead of createCursorKeys to avoid spacebar capture)
    this.cameraKeys = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false)
    };
    
    // Helper function to check if an input element has focus
    const isTypingInInput = () => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;
      
      const tagName = activeElement.tagName.toLowerCase();
      const hasContentEditable = activeElement.getAttribute('contenteditable') === 'true';
      const isInput = ['input', 'textarea', 'select'].includes(tagName);
      const isMonacoEditor = activeElement.classList.contains('monaco-editor') || 
                           activeElement.closest('.monaco-editor') !== null;
      
      return isInput || hasContentEditable || isMonacoEditor;
    };
    
    // Add event listeners for WASD manual camera movement only when not typing
    // Arrow keys will be handled in update() for qubit movement when locked
    this.input.keyboard!.on('keydown-W', () => {
      if (!isTypingInInput()) {
        this.unlockCamera();
      }
    });
    this.input.keyboard!.on('keydown-A', () => {
      if (!isTypingInInput()) {
        this.unlockCamera();
      }
    });
    this.input.keyboard!.on('keydown-S', () => {
      if (!isTypingInInput()) {
        this.unlockCamera();
      }
    });
    this.input.keyboard!.on('keydown-D', () => {
      if (!isTypingInInput()) {
        this.unlockCamera();
      }
    });
  }

  private setupZoomControls() {
    // Add wheel zoom functionality
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
      const camera = this.cameras.main;
      const zoomSpeed = 0.2;
      const minZoom = 0.3;
      const maxZoom = 10;
      
      // Calculate new zoom based on wheel direction
      let newZoom = camera.zoom;
      if (deltaY > 0) {
        newZoom = Math.max(minZoom, camera.zoom - zoomSpeed);
      } else if (deltaY < 0) {
        newZoom = Math.min(maxZoom, camera.zoom + zoomSpeed);
      }
      
      // Apply smooth zoom
      this.tweens.add({
        targets: camera,
        zoom: newZoom,
        duration: 100,
        ease: 'Power2'
      });
      
      // Temporarily unlock camera from qubit during zoom
      if (this.isLockedToQubit) {
        const gameState = useGameStore.getState();
        const activeEntity = gameState.entities.get(gameState.activeEntityId);
        if (activeEntity && activeEntity.sprite) {
          // Keep camera centered on qubit during zoom
          camera.centerOn(activeEntity.sprite.x, activeEntity.sprite.y);
        }
      }
    });
    
    // Add pinch zoom functionality for trackpads/touch devices
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Handle trackpad pinch gestures if supported
      if (pointer.event && (pointer.event as any).scale) {
        const camera = this.cameras.main;
        const scale = (pointer.event as any).scale;
        const minZoom = 0.3;
        const maxZoom = 10;
        
        const newZoom = Phaser.Math.Clamp(scale, minZoom, maxZoom);
        camera.setZoom(newZoom);
      }
    });
  }

  public lockCameraToQubit() {
    this.isLockedToQubit = true;
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    if (activeEntity) {
      const sprite = this.entitySprites.get(activeEntity.id);
      if (sprite) {
        // Set up smooth camera following with lerp
        this.cameras.main.stopFollow();
        this.cameras.main.startFollow(sprite, true, 0.05, 0.05); // Smooth following with 0.05 lerp
      }
    }
    
    // Emit event so UI can update
    EventBus.emit('camera-locked-to-qubit', true);
  }

  private unlockCamera() {
    if (this.isLockedToQubit) {
      this.isLockedToQubit = false;
      this.cameras.main.stopFollow();
      EventBus.emit('camera-locked-to-qubit', false);
    }
  }

  private setupStateListeners() {
    // This would be implemented with proper state management
    // For now, we'll update visuals periodically
    this.time.addEvent({
      delay: 100,
      callback: () => this.updateVisuals(),
      loop: true
    });

    // Handle map editor events
    EventBus.on('tile-selected', (tile: any) => {
      if (this.mapEditor) {
        this.mapEditor.selectTile(tile);
      }
    });

    EventBus.on('save-map', () => {
      if (this.mapEditor) {
        this.mapEditor.saveMap();
      }
    });

    EventBus.on('load-map', () => {
      if (this.mapEditor) {
        this.mapEditor.loadMap();
      }
    });

    EventBus.on('toggle-map-editor', () => {
      if (this.mapEditor) {
        if (this.mapEditor.isActive) {
          this.mapEditor.deactivate();
        } else {
          this.mapEditor.activate();
        }
      }
    });

    // Handle debug requests from map editor UI
    EventBus.on('map-editor-debug-request', () => {
      if (this.mapEditor) {
        console.log('=== MAP EDITOR DEBUG (Scene) ===');
        console.log('Map editor exists:', !!this.mapEditor);
        console.log('Map editor active:', this.mapEditor?.isActive);
        console.log('Ground_Tileset loaded:', this.textures.exists('Ground_Tileset'));
        
        if (this.textures.exists('Ground_Tileset')) {
          const texture = this.textures.get('Ground_Tileset');
          console.log('Ground_Tileset dimensions:', texture.source[0].width, 'x', texture.source[0].height);
          console.log('Ground_Tileset frames:', texture.frameTotal);
        }
        
        if (this.mapEditor.logDebugInfo) {
          this.mapEditor.logDebugInfo();
        }
        console.log('================================');
      }
    });
  }

  private createUI() {
    // Create basic UI elements
    const uiContainer = this.add.container(10, 10);
    
    // Resource display
    const resourceText = this.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    
    uiContainer.add(resourceText);
    
    // Update resource display
    this.time.addEvent({
      delay: 500,
      callback: () => {
        const gameState = useGameStore.getState();
        const activeEntity = gameState.entities.get(gameState.activeEntityId);
        
        if (activeEntity) {
          resourceText.setText(
            `Energy: ${activeEntity.stats.energy}/${activeEntity.stats.maxEnergy}\n` +
            `Bitcoin: ${gameState.globalResources.bitcoin || 0}\n` +
            `Currency: ${gameState.globalResources.currency || 0}\n` +
            `Position: (${activeEntity.position.x}, ${activeEntity.position.y})`
          );
        }
      },
      loop: true
    });
  }

  private updateVisuals() {
    const gameState = useGameStore.getState();
    
    // Update entity sprites
    gameState.entities.forEach((entity, id) => {
      this.updateEntitySprite(entity);
    });
    
    // Update grid sprites
    gameState.grids.forEach((grid, id) => {
      this.updateGridSprite(grid);
    });
  }

  private updateEntitySprite(entity: Entity) {
    let sprite = this.entitySprites.get(entity.id);
    
    if (!sprite) {
      // Use visual position if available, otherwise use logical position
      const displayPosition = entity.visualPosition || entity.position;
      
      // Create different sprite types based on entity type
      if (entity.type === 'qubit') {
        // Check if animated spritesheets are available
        if (this.textures.exists('qubit_walk') && this.anims.exists('qubit_idle')) {
          // Create animated sprite for qubit
          sprite = this.add.sprite(
            displayPosition.x * this.GRID_SIZE + this.GRID_SIZE / 2,
            displayPosition.y * this.GRID_SIZE + this.GRID_SIZE / 2,
            'qubit_idle'
          );
          
          // Set qubit to be 1.5x the grid size for better visual presence
          sprite.setDisplaySize(this.GRID_SIZE * this.QUBIT_SCALE_FACTOR, this.GRID_SIZE * this.QUBIT_SCALE_FACTOR);
          
          // Disable texture smoothing for crisp pixel art
          sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          
          // Start with idle animation facing down
          sprite.play('qubit_idle');
        } else {
          // Fallback to static sprite if animation assets not available
          console.warn('Qubit animations not available, falling back to static sprite');
          sprite = this.add.sprite(
            displayPosition.x * this.GRID_SIZE + this.GRID_SIZE / 2,
            displayPosition.y * this.GRID_SIZE + this.GRID_SIZE / 2,
            'qubit'
          );
          sprite.setDisplaySize(this.GRID_SIZE * this.QUBIT_SCALE_FACTOR, this.GRID_SIZE * this.QUBIT_SCALE_FACTOR);
        }
      } else {
        // Create static sprite for other entities (keep them grid-sized)
        sprite = this.add.sprite(
          displayPosition.x * this.GRID_SIZE + this.GRID_SIZE / 2,
          displayPosition.y * this.GRID_SIZE + this.GRID_SIZE / 2,
          entity.type
        );
        sprite.setDisplaySize(this.GRID_SIZE - 4, this.GRID_SIZE - 4);
      }
      
      sprite.setInteractive();
      
      // Set depth for entity sprites (qubit on top)
      sprite.setDepth(2);
      
      // Add click handler for entity
      sprite.on('pointerdown', () => {
        console.log('Entity clicked:', entity.name);
        EventBus.emit('entity-clicked', entity);
      });
      
      this.entitySprites.set(entity.id, sprite);
      
      // Link sprite to entity for movement system
      entity.sprite = sprite;
    } else {
      // Update sprite position only if entity is not currently moving
      // (during movement, the tween controls sprite position)
      if (!entity.movementState?.isMoving) {
        const displayPosition = entity.visualPosition || entity.position;
        sprite.setPosition(
          displayPosition.x * this.GRID_SIZE + this.GRID_SIZE / 2,
          displayPosition.y * this.GRID_SIZE + this.GRID_SIZE / 2
        );
      }
    }
    
    // Handle qubit animations based on movement (only if animations are available)
    if (entity.type === 'qubit' && this.anims.exists('qubit_idle')) {
      this.updateQubitAnimation(entity, sprite);
    }
    
    // Update sprite properties based on entity state
    if (entity.stats.energy <= 0) {
      sprite.setTint(0x888888); // Gray tint for low energy
    } else if (entity.taskState.isBlocked || entity.movementState?.isMoving) {
      sprite.setTint(0xffaa00); // Orange tint for busy/moving
    } else {
      sprite.clearTint();
    }

    // Update progress bar for entity (adjust position for larger qubit sprite)
    const progressBarY = entity.type === 'qubit' ? 
      sprite.y - (this.GRID_SIZE * this.QUBIT_SCALE_FACTOR / 2) - 20 : 
      sprite.y - 40;
    this.updateProgressBar(entity.id, entity.taskState.progress, sprite.x, progressBarY);
  }
  
  private updateQubitAnimation(entity: Entity, sprite: Phaser.GameObjects.Sprite) {
    // Safety check: ensure sprite has animation component
    if (!sprite.anims) {
      console.warn('Sprite does not have animation component');
      return;
    }
    
    // Check if entity is currently moving
    if (entity.movementState?.isMoving) {
      // Entity is in smooth movement - determine direction and play walking animation
      const fromPos = entity.movementState.fromPosition;
      const toPos = entity.movementState.toPosition;
      
      const deltaX = toPos.x - fromPos.x;
      const deltaY = toPos.y - fromPos.y;
      
      let walkAnimationKey = '';
      let shouldFlip = false;
      
      if (deltaY > 0) {
        // Moving down
        this.qubitDirection = 'down';
        walkAnimationKey = 'qubit_walk_down';
      } else if (deltaY < 0) {
        // Moving up
        this.qubitDirection = 'up';
        walkAnimationKey = 'qubit_walk_up';
      } else if (deltaX < 0) {
        // Moving left (use right sprites but flipped)
        this.qubitDirection = 'left';
        walkAnimationKey = 'qubit_walk_right';
        shouldFlip = true;
      } else if (deltaX > 0) {
        // Moving right
        this.qubitDirection = 'right';
        walkAnimationKey = 'qubit_walk_right';
      }
      
      // Apply horizontal flip for left-facing directions
      sprite.setFlipX(shouldFlip);
      
      // Play walking animation if not already playing
      if (walkAnimationKey && this.anims.exists(walkAnimationKey)) {
        if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== walkAnimationKey) {
          sprite.play(walkAnimationKey, true);
        }
      }
    } else {
      // Entity is stationary - play appropriate idle animation
      let idleAnimationKey = '';
      let shouldFlip = false;
      
      switch (this.qubitDirection) {
        case 'down':
          idleAnimationKey = 'qubit_idle_down';
          break;
        case 'up':
          idleAnimationKey = 'qubit_idle_up';
          break;
        case 'left':
          idleAnimationKey = 'qubit_idle_right';
          shouldFlip = true;
          break;
        case 'right':
          idleAnimationKey = 'qubit_idle_right';
          break;
        default:
          idleAnimationKey = 'qubit_idle_down';
          this.qubitDirection = 'down';
          break;
      }
      
      // Apply horizontal flip for left-facing directions
      sprite.setFlipX(shouldFlip);
      
      // Play idle animation if not already playing
      if (idleAnimationKey && this.anims.exists(idleAnimationKey)) {
        if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== idleAnimationKey) {
          sprite.play(idleAnimationKey, true);
        }
      }
    }
  }

  private updateGridSprite(grid: GridTile) {
    let sprite = this.gridSprites.get(grid.id);
    
    if (!sprite) {
      sprite = this.add.sprite(
        grid.position.x * this.GRID_SIZE + this.GRID_SIZE / 2,
        grid.position.y * this.GRID_SIZE + this.GRID_SIZE / 2,
        grid.type
      );
      sprite.setDisplaySize(this.GRID_SIZE - 4, this.GRID_SIZE - 4);
      sprite.setInteractive();
      
      // Set depth for unique grid sprites (above ground tiles)
      sprite.setDepth(1);
      
      // Add click handler for grid
      sprite.on('pointerdown', () => {
        console.log('Grid clicked:', grid.name);
        EventBus.emit('grid-clicked', grid);
      });
      
      this.gridSprites.set(grid.id, sprite);
    }
    
    // Update sprite based on grid state
    if (grid.state.isPlanted || grid.state.isEating || grid.taskState.isBlocked) {
      sprite.setTint(0xffff00); // Yellow tint for active state
    } else if (grid.state.cropReady || grid.state.isGrown) {
      sprite.setTint(0x00ff00); // Green tint for ready state
    } else {
      sprite.clearTint();
    }

    // Update progress bar for grid
    this.updateProgressBar(grid.id, grid.taskState.progress, sprite.x, sprite.y - 40);
  }

  private updateProgressBar(id: string, progress: any, x: number, y: number) {
    let progressBar = this.progressBars.get(id);

    if (progress?.isActive) {
      const progressPercent = this.taskManager.getEntityProgress(id) || this.taskManager.getGridProgress(id);
      
      if (!progressBar) {
        progressBar = this.add.graphics();
        progressBar.setDepth(3); // Progress bars on top of everything
        this.progressBars.set(id, progressBar);
      }

      progressBar.clear();
      
      // Background
      progressBar.fillStyle(0x444444);
      progressBar.fillRect(x - 25, y, 50, 6);
      
      // Progress fill
      progressBar.fillStyle(0xf5a623);
      progressBar.fillRect(x - 25, y, (50 * progressPercent) / 100, 6);
      
      // Border
      progressBar.lineStyle(1, 0x666666);
      progressBar.strokeRect(x - 25, y, 50, 6);
    } else {
      if (progressBar) {
        progressBar.clear();
      }
    }
  }

  // Public methods for external control
  startCodeExecution() {
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    if (!activeEntity) {
      console.warn('No active entity for code execution');
      EventBus.emit('code-execution-failed', 'No active entity found');
      return;
    }
    
    // Cancel any existing tasks and reset entity state
    this.taskManager.cancelAllTasks();
    
    // Force unblock the active entity if it's stuck
    if (activeEntity.taskState.isBlocked) {
      console.log('Entity was blocked, force unblocking before execution...');
      gameState.forceUnblockEntity(activeEntity.id);
    }
    
    // Get fresh entity data after potential unblocking
    const freshEntity = gameState.entities.get(gameState.activeEntityId);
    if (!freshEntity) {
      console.warn('No active entity for code execution');
      EventBus.emit('code-execution-failed', 'No active entity found');
      return;
    }
    
    const executionContext = {
      entity: freshEntity,
      availableFunctions: BuiltInFunctionRegistry.createFunctionMap(),
      globalVariables: {},
      isRunning: true,
      currentGrid: gameState.getGridAt(freshEntity.position)
    };
    
    this.codeExecutor = new CodeExecutor(executionContext, this.gridSystem);
    this.codeExecutor.setUserFunctions(gameState.codeWindows);
    
    // Emit execution started event
    EventBus.emit('code-execution-started');
    
    this.codeExecutor.executeMain().then(result => {
      console.log('Code execution result:', result);
      if (result.success) {
        // Emit successful completion
        EventBus.emit('code-execution-completed', result);
      } else {
        // Emit execution error
        EventBus.emit('code-execution-failed', result.message || 'Unknown error');
        this.showExecutionError(result.message || 'Unknown error');
      }
    }).catch(error => {
      console.error('Code execution error:', error);
      const errorMessage = error.message || 'Unknown error';
      EventBus.emit('code-execution-failed', errorMessage);
      this.showExecutionError(errorMessage);
    });
  }

  stopCodeExecution() {
    if (this.codeExecutor) {
      this.codeExecutor.stop();
      this.codeExecutor = undefined;
    }
    
    // Cancel all active tasks
    this.taskManager.cancelAllTasks();
    
    // Stop all entity movements
    this.movementManager.stopAllMovements();
    
    // Clean up movement states
    const gameState = useGameStore.getState();
    for (const [_, entity] of gameState.entities) {
      if (entity.movementState?.isMoving) {
        entity.movementState = {
          isMoving: false,
          fromPosition: entity.position,
          toPosition: entity.position
        };
      }
    }
    
    // Emit execution stopped event
    EventBus.emit('code-execution-stopped');
  }

  private showExecutionError(message: string) {
    // Emit error event for the UI to handle
    EventBus.emit('show-execution-error', message);
  }

  // Manual control for testing (can be removed later)
  update(time: number, delta: number) {
    // Don't use createCursorKeys() as it captures spacebar - use our custom keys
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    // Helper function to check if an input element has focus
    const isTypingInInput = () => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;
      
      const tagName = activeElement.tagName.toLowerCase();
      const hasContentEditable = activeElement.getAttribute('contenteditable') === 'true';
      const isInput = ['input', 'textarea', 'select'].includes(tagName);
      const isMonacoEditor = activeElement.classList.contains('monaco-editor') || 
                           activeElement.closest('.monaco-editor') !== null;
      
      return isInput || hasContentEditable || isMonacoEditor;
    };
    
    // Handle camera movement when not locked to qubit
    if (!this.isLockedToQubit) {
      const camera = this.cameras.main;
      const moveSpeed = this.cameraSpeed * (delta / 1000); // Smooth movement based on delta time
      
      // Only handle camera movement if not typing in input fields
      if (!isTypingInInput()) {
        // WASD camera movement (only when unlocked)
        if (this.wasdKeys.W.isDown) {
          camera.scrollY -= moveSpeed;
        }
        if (this.wasdKeys.S.isDown) {
          camera.scrollY += moveSpeed;
        }
        if (this.wasdKeys.A.isDown) {
          camera.scrollX -= moveSpeed;
        }
        if (this.wasdKeys.D.isDown) {
          camera.scrollX += moveSpeed;
        }
        
        // Arrow keys also move camera when unlocked (using our custom keys)
        if (this.cameraKeys.up.isDown) {
          camera.scrollY -= moveSpeed;
        }
        if (this.cameraKeys.down.isDown) {
          camera.scrollY += moveSpeed;
        }
        if (this.cameraKeys.left.isDown) {
          camera.scrollX -= moveSpeed;
        }
        if (this.cameraKeys.right.isDown) {
          camera.scrollX += moveSpeed;
        }
      }
    }
    
    if (!activeEntity) return;
    
    // Arrow key qubit movement (only when camera is locked and not in unlocked mode)
    if (this.isLockedToQubit && !isTypingInInput()) {
      // Only allow movement if entity is not currently moving
      if (!activeEntity.movementState?.isMoving) {
        // Handle movement with smooth transitions
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.up)) {
          const targetPos = { x: activeEntity.position.x, y: activeEntity.position.y - 1 };
          this.movementManager.moveEntity(activeEntity, targetPos);
        }
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.down)) {
          const targetPos = { x: activeEntity.position.x, y: activeEntity.position.y + 1 };
          this.movementManager.moveEntity(activeEntity, targetPos);
        }
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.left)) {
          const targetPos = { x: activeEntity.position.x - 1, y: activeEntity.position.y };
          this.movementManager.moveEntity(activeEntity, targetPos);
        }
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.right)) {
          const targetPos = { x: activeEntity.position.x + 1, y: activeEntity.position.y };
          this.movementManager.moveEntity(activeEntity, targetPos);
        }
      }
    }
  }

  private createAnimations() {
    // Check if the spritesheets loaded successfully
    if (!this.textures.exists('qubit_walk')) {
      console.warn('qubit_walk texture not found. Walk animations will not be created.');
      return;
    }
    
    if (!this.textures.exists('qubit_idle')) {
      console.warn('qubit_idle texture not found. Idle animations will not be created.');
      return;
    }
    
    // Log frame information for debugging
    const walkTexture = this.textures.get('qubit_walk');
    const idleTexture = this.textures.get('qubit_idle');
    console.log('Qubit walk texture frames:', walkTexture.getFrameNames());
    console.log('Qubit idle texture frames:', idleTexture.getFrameNames());
    
    // === IDLE ANIMATIONS ===
    // Idle down (first row of idle sheet)
    this.anims.create({
      key: 'qubit_idle_down',
      frames: this.anims.generateFrameNumbers('qubit_idle', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1
    });
    
    // Idle up (second row of idle sheet)
    this.anims.create({
      key: 'qubit_idle_up',
      frames: this.anims.generateFrameNumbers('qubit_idle', { start: 4, end: 7 }),
      frameRate: 4,
      repeat: -1
    });
    
    // Idle right (third row of idle sheet)
    this.anims.create({
      key: 'qubit_idle_right',
      frames: this.anims.generateFrameNumbers('qubit_idle', { start: 8, end: 11 }),
      frameRate: 4,
      repeat: -1
    });
    
    // Idle left (third row of idle sheet, flipped)
    this.anims.create({
      key: 'qubit_idle_left',
      frames: this.anims.generateFrameNumbers('qubit_idle', { start: 8, end: 11 }),
      frameRate: 4,
      repeat: -1
    });
    
    // === WALKING ANIMATIONS ===
    // Walking down (first row of walk sheet)
    this.anims.create({
      key: 'qubit_walk_down',
      frames: this.anims.generateFrameNumbers('qubit_walk', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Walking up (second row of walk sheet)
    this.anims.create({
      key: 'qubit_walk_up',
      frames: this.anims.generateFrameNumbers('qubit_walk', { start: 6, end: 11 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Walking right (third row of walk sheet)
    this.anims.create({
      key: 'qubit_walk_right',
      frames: this.anims.generateFrameNumbers('qubit_walk', { start: 12, end: 17 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Walking left (third row of walk sheet, flipped)
    this.anims.create({
      key: 'qubit_walk_left',
      frames: this.anims.generateFrameNumbers('qubit_walk', { start: 12, end: 17 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Default idle animation (down facing)
    this.anims.create({
      key: 'qubit_idle',
      frames: this.anims.generateFrameNumbers('qubit_idle', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1
    });
    
    console.log('Qubit animations created successfully');
  }

  private setupMovementEventHandlers() {
    // Handle smooth movement requests from built-in functions
    EventBus.on('request-smooth-movement', async (data: {
      entityId: string,
      targetPosition: Position,
      callback: (success: boolean) => void
    }) => {
      const gameState = useGameStore.getState();
      const entity = gameState.entities.get(data.entityId);
      
      if (!entity) {
        data.callback(false);
        return;
      }
      
      // Perform smooth movement
      const success = await this.movementManager.moveEntity(entity, data.targetPosition);
      
      // Update game store with new position if successful
      if (success) {
        gameState.updateEntity(data.entityId, { 
          position: data.targetPosition,
          visualPosition: data.targetPosition
        });
      }
      
      // Call the callback with result
      data.callback(success);
    });
    
    // Handle movement manager requests (if needed)
    EventBus.on('request-movement-manager', (callback: (manager: MovementManager) => void) => {
      callback(this.movementManager);
    });
  }

  private setupExecutionTextSystem() {
    // Create container for execution texts
    this.executionTextContainer = this.add.container(0, 0);
    
    // Listen for code execution line events
    EventBus.on('code-execution-line', (data: {
      line: string;
      lineNumber: number;
      functionName: string;
      entityId: string;
    }) => {
      this.showExecutionLine(data.line, data.functionName);
    });
    
    // Listen for function call events 
    EventBus.on('code-execution-function-call', (data: {
      functionName: string;
      args: any[];
      entityId: string;
    }) => {
      const argsString = data.args.length > 0 ? `(${data.args.join(', ')})` : '()';
      this.showExecutionLine(`${data.functionName}${argsString}`, 'function');
    });
    
    // Clear execution texts when execution stops or completes
    EventBus.on('code-execution-stopped', () => {
      this.clearExecutionTexts();
    });
    
    EventBus.on('code-execution-completed', () => {
      this.clearExecutionTexts();
    });
    
    EventBus.on('code-execution-failed', () => {
      this.clearExecutionTexts();
    });
  }

  private showExecutionLine(line: string, context: string) {
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    if (!activeEntity) return;
    
    const entitySprite = this.entitySprites.get(activeEntity.id);
    if (!entitySprite) return;
    
    // Limit text length for better display
    const displayText = line.length > 30 ? line.substring(0, 27) + '...' : line;
    
    // Create floating text above the entity
    const textY = entitySprite.y - (this.GRID_SIZE * this.QUBIT_SCALE_FACTOR / 2) - 60;
    const executionText = this.add.text(entitySprite.x, textY, displayText, {
      fontSize: '12px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2
    });
    
    executionText.setOrigin(0.5);
    
    // Add to container
    this.executionTextContainer.add(executionText);
    this.executionTexts.push(executionText);
    
    // Slide existing texts up
    this.executionTexts.forEach((text, index) => {
      if (text !== executionText) {
        // Move older texts up
        this.tweens.add({
          targets: text,
          y: text.y - 20,
          alpha: Math.max(0.1, text.alpha - 0.3), // Fade out older texts
          duration: 300,
          ease: 'Power2'
        });
      }
    });
    
    // Animate the new text sliding in
    executionText.setAlpha(0);
    executionText.setScale(0.8);
    
    this.tweens.add({
      targets: executionText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Auto-remove text after a delay
        this.time.delayedCall(2000, () => {
          if (executionText && executionText.active) {
            this.tweens.add({
              targets: executionText,
              alpha: 0,
              y: executionText.y - 10,
              duration: 500,
              ease: 'Power2',
              onComplete: () => {
                this.removeExecutionText(executionText);
              }
            });
          }
        });
      }
    });
    
    // Limit the number of visible texts (keep only the last 3)
    if (this.executionTexts.length > 3) {
      const oldestText = this.executionTexts.shift();
      if (oldestText) {
        this.tweens.add({
          targets: oldestText,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            oldestText.destroy();
          }
        });
      }
    }
  }

  private removeExecutionText(text: Phaser.GameObjects.Text) {
    const index = this.executionTexts.indexOf(text);
    if (index > -1) {
      this.executionTexts.splice(index, 1);
    }
    
    if (text.active) {
      text.destroy();
    }
  }

  private clearExecutionTexts() {
    // Clear all execution texts with a fade out animation
    this.executionTexts.forEach(text => {
      if (text.active) {
        this.tweens.add({
          targets: text,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            text.destroy();
          }
        });
      }
    });
    
    this.executionTexts = [];
  }
} 