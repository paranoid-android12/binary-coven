import { Scene } from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import GridSystem, { initializeDefaultGridTypes } from '../systems/GridSystem';
import { CodeExecutor } from '../systems/CodeExecutor';
import { BuiltInFunctionRegistry } from '../systems/BuiltInFunctions';
import { Entity, GridTile, Position, FarmlandState, CodeWindow } from '../../types/game';
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

    // Check for wall collision using MapEditor
    // Get the scene's MapEditor instance to check for walls
    const programmingGameScene = this.scene as any;
    if (programmingGameScene.mapEditor && programmingGameScene.mapEditor.hasWallAt(targetPosition)) {
      console.warn(`Cannot move to (${targetPosition.x}, ${targetPosition.y}) - wall blocking path`);
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
  private save_game: Phaser.GameObjects.Sprite;
  private load_game: Phaser.GameObjects.Sprite;
  
  // Upgrade system
  private upgradeModal: Phaser.GameObjects.Container | null = null;
  private isUpgradeModalOpen: boolean = false;
  
  // Visual elements
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private entitySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private gridSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private progressBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private progressTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  
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
  
  // Wheat sprite management
  private wheatSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  // Map editor grid management
  private editorFarmlandSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private editorWallSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private wallsVisible: boolean = false;

  constructor() {
    super({ key: 'ProgrammingGame' });
    this.gameStore = useGameStore.getState();
    this.gridSystem = new GridSystem();
    this.taskManager = TaskManager.getInstance();
    this.movementManager = new MovementManager(this, this.GRID_SIZE);
    this.mapEditor = new MapEditor(this);
    
    // Initialize farming grid types
    initializeDefaultGridTypes();
    
    // Listen for map editor events to update visuals
    EventBus.on('farmland-grid-added', () => {
      this.updateVisuals();
    });
    
    EventBus.on('farmland-grid-removed', () => {
      this.updateVisuals();
    });
    
    EventBus.on('map-editor-loaded', () => {
      this.updateVisuals();
    });
  }

  preload() {
    // Configure pixel-perfect rendering for crisp sprites
    this.load.on('filecomplete', (key: string) => {
      if (key === 'qubit_walk' || key === 'qubit_idle' || key === 'wheat_growth') {
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



    this.load.atlas("save_game", "button.png", {
      "frames": {
        "save_game_up": {
          "frame": {
            "x": 608,
            "y": 256,
            "w": 16,
            "h": 16
          }
        },
        "save_game_down": {
          "frame": {
            "x": 608,
            "y": 272,
            "w": 16,
            "h": 16
          }
        }
      }
    });

    this.load.atlas("load_game", "button.png", {
      "frames": {
        "load_game_up": {
          "frame": {
            "x": 624,
            "y": 256,
            "w": 16,
            "h": 16
          }
        },
        "load_game_down": {
          "frame": {
            "x": 624,
            "y": 272,
            "w": 16,
            "h": 16
          }
        }
      }
    });


    
    // Load the idle spritesheet for qubit
    this.load.spritesheet('qubit_idle', 'Idle.png', {
      frameWidth: 32,  // Same dimensions as walk sprite
      frameHeight: 32
    });

    this.load.spritesheet('qubit_planting', 'Hoe.png', {
      frameWidth: 32,
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

    // Load wheat growth sprites (6 phases in the last row, 16x16 each)
    // The wheat sprites are at the very last row with 6 phases: seed to fully grown
    this.load.spritesheet('wheat_growth', 'summer_crops.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    
    // Create simple colored rectangles as sprites for prototyping (other entities)
    this.createPlaceholderSprites();
  }

  create() {
    // Configure pixel-perfect rendering for the entire scene
    this.cameras.main.setRoundPixels(true);

    const camera = this.cameras.main;

     // Create save button
     this.save_game = this.add.sprite(250, 250, "save_game", "save_game_up")
      .setScale(5)
      .setScrollFactor(0)
      .setInteractive()
      .setDepth(1000);

     this.save_game.setPosition(
       camera.width - this.save_game.displayWidth + 640,
       -180
     );

     this.save_game.on('pointerdown', () => {
      this.save_game.setFrame("save_game_down");
     });

     this.save_game.on('pointerup', () => {
      this.save_game.setFrame("save_game_up");
      this.saveGameState();
     });

     // Create load button
     this.load_game = this.add.sprite(250, 250, "load_game", "load_game_up")
       .setScale(5)
       .setScrollFactor(0) // Fix to camera
       .setInteractive()
       .setDepth(1000);

     this.load_game.setPosition(
       camera.width - this.load_game.displayWidth + 730,  // 20px from right edge
       -180  // 20px from top
     );

     this.load_game.on('pointerdown', () => {
      this.load_game.setFrame("load_game_down");
     });
     this.load_game.on('pointerup', () => {
      this.load_game.setFrame("load_game_up");
      this.loadGameState();
     });
    
    // Create placeholder sprites first (fallback sprites)
    this.createPlaceholderSprites();
    
    // Create animations after placeholder sprites
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
    
    // Force initial visual update to render any existing entities
    this.updateVisuals();
    
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
    
    // Farmland - Invisible
    graphics.fillStyle(0x8B4513, 0); // Set alpha to 0 for invisibility
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
    
    // Map Editor Grid Types
    // Farmland Grid (for map editor) - Invisible
    graphics.fillStyle(0x8B4513, 0); // Set alpha to 0 for invisibility
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('editor_farmland', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Wall Grid (for map editor) - Yellow (toggleable visibility)
    graphics.fillStyle(0xFFFF00);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('editor_wall', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Create wheat growth sprites as placeholders (6 phases)
    // These will be replaced when user provides the actual spritesheet
    const wheatColors = [0x8B4513, 0x9ACD32, 0x7CFC00, 0x32CD32, 0xFFD700, 0xDAA520]; // Brown to gold progression (6 phases)
    for (let i = 0; i < 6; i++) {
      graphics.fillStyle(wheatColors[i]);
      graphics.fillRect(0, 0, 16, 16);
      graphics.generateTexture(`wheat_${i}`, 16, 16);
      graphics.clear();
    }
    
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

  private createFarmLand(x: number, y: number, plotNumber: number) {
    const store = useGameStore.getState();
    const farmlandData = this.gridSystem.initializeGrid('farmland', '');
    store.addGrid({
      id: `farmland_${x}_${y}`,
      type: 'farmland',
      position: { x, y },
      name: `Farmland Plot #${plotNumber}`,
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
  }

  private createSampleWorld() {
    const store = useGameStore.getState();
    
    // Add some sample grids with proper initialization
    const farmlandData = this.gridSystem.initializeGrid('farmland', '');
    const farmlandId = store.addGrid({
      id: 'farmland_8_7',
      type: 'farmland',
      position: { x: 8, y: 7 },
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

    // Create farmlands in first rectangular area (11-14, 11-14)
    let plotNumber = 2;
    for (let x = 11; x <= 14; x++) {
      for (let y = 11; y <= 14; y++) {
        const farmlandData = this.gridSystem.initializeGrid('farmland', '');
        store.addGrid({
          id: `farmland_${x}_${y}`,
          type: 'farmland',
          position: { x, y },
          name: `Farmland Plot #${plotNumber}`,
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
        plotNumber++;
      }
    }

    // Create farmlands in second rectangular area (16-19, 11-14)
    for (let x = 16; x <= 19; x++) {
      for (let y = 11; y <= 14; y++) {
        this.createFarmLand(x, y, plotNumber);
        plotNumber++;
      }
    }

    // Create them farmlands in the splintered area
    this.createFarmLand(21, 11, 21);
    this.createFarmLand(22, 11, 22);

    this.createFarmLand(21, 12, 23);
    this.createFarmLand(22, 12, 24);
    this.createFarmLand(23, 12, 25);

    this.createFarmLand(21, 13, 26);
    this.createFarmLand(22, 13, 27);
    this.createFarmLand(23, 13, 28);
    this.createFarmLand(24, 13, 29);

    this.createFarmLand(21, 14, 26);
    this.createFarmLand(22, 14, 27);
    this.createFarmLand(23, 14, 28);
    this.createFarmLand(24, 14, 29);
    
    const foodData = this.gridSystem.initializeGrid('food', '');
    const foodId = store.addGrid({
      id: 'food_station',
      type: 'food',
      position: { x: 12, y: 7 },
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
      id: 'storage_silo',
      type: 'silo',
      position: { x: 16, y: 7 },
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

    // Handle upgrade modal requests from GameInterface
    EventBus.on('request-upgrade-modal', () => {
      this.openUpgradeModal();
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
            `Wheat: ${gameState.globalResources.wheat || 0}\n` +
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
        if (this.textures.exists('qubit_walk') && this.textures.exists('qubit_idle')) {
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
          sprite.setDepth(1000); // Qubit should always be on top of everything
          
          // Start with idle animation facing down if it exists
          if (this.anims.exists('qubit_idle')) {
            sprite.play('qubit_idle');
          }
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
      // sprite.setTint(0xffaa00); // Orange tint for busy/moving
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
    } else if (entity.taskState.currentTask === "planting") {
      // Play planting animation
      let plantingAnimationKey = 'qubit_planting';
      if (this.anims.exists(plantingAnimationKey)) {
        sprite.play(plantingAnimationKey, true);
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

    // Handle wheat sprites for farmland
    if (grid.type === 'farmland') {
      this.updateWheatSprite(grid);
    }

    // Update progress bar for grid
    this.updateProgressBar(grid.id, grid.taskState.progress, sprite.x, sprite.y - 40);
  }

  private updateWheatSprite(grid: GridTile) {
    const wheatSpriteId = `wheat_${grid.id}`;
    let wheatSprite = this.wheatSprites.get(wheatSpriteId);
    
    // Determine which wheat frame to show based on farmland state
    let wheatFrame = -1; // -1 means no wheat sprite
    
    if (grid.state.status === FarmlandState.PLANTING) {
      wheatFrame = 0; // Phase 1: Seed planted
    } else if (grid.state.status === FarmlandState.GROWING) {
      // Get progress from centralized task system
      const gameState = useGameStore.getState();
      const progressPercent = gameState.getTaskProgress(grid.id);
      const progressValue = progressPercent / 100; // Convert to 0-1 range
      
      // Map progress to 6 phases (0-5): seed, growth stages 1-4, fully grown
      if (progressValue < 0.2) wheatFrame = 1;      // Phase 2: Early growth
      else if (progressValue < 0.4) wheatFrame = 2; // Phase 3: Small growth
      else if (progressValue < 0.6) wheatFrame = 3; // Phase 4: Medium growth
      else if (progressValue < 0.8) wheatFrame = 4; // Phase 5: Large growth  
      else wheatFrame = 5; // Phase 6: Nearly fully grown
    } else if (grid.state.status === FarmlandState.READY) {
      wheatFrame = 5; // Phase 6: Fully grown wheat
    }
    
    if (wheatFrame >= 0) {
      // Create or update wheat sprite
      if (!wheatSprite) {
        // For placeholder sprites, use individual wheat textures
        // For the actual spritesheet, use frame-based approach
        if (this.textures.exists('wheat_growth')) {
          // Use the actual spritesheet - need to calculate frame number
          // If wheat is in the last row with 6 phases, we need to know the spritesheet dimensions
          // For now, assume we need to calculate the offset to the last row
          wheatSprite = this.add.sprite(
            grid.position.x * this.GRID_SIZE + this.GRID_SIZE / 2,
            grid.position.y * this.GRID_SIZE + this.GRID_SIZE / 2,
            'wheat_growth'
          );

          wheatSprite.setDepth(5); // Above grid sprites but below qubit
          
          // Set the correct frame using our calculation method
          const actualFrameNumber = this.getWheatFrameNumber(wheatFrame);
          wheatSprite.setFrame(actualFrameNumber);
        } else {
          // Fallback to placeholder individual textures
          wheatSprite = this.add.sprite(
            grid.position.x * this.GRID_SIZE + this.GRID_SIZE / 2,
            grid.position.y * this.GRID_SIZE + this.GRID_SIZE / 2,
            `wheat_${wheatFrame}`
          );
          wheatSprite.setDepth(5); // Above grid sprites but below qubit
        }
        
        // Scale wheat sprite to fit grid
        wheatSprite.setDisplaySize(this.GRID_SIZE - 8, this.GRID_SIZE - 8);
        wheatSprite.setDepth(10); // Above grid sprites
        wheatSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        
        this.wheatSprites.set(wheatSpriteId, wheatSprite);
      } else {
        // Update existing sprite frame
        if (this.textures.exists('wheat_growth')) {
          const actualFrameNumber = this.getWheatFrameNumber(wheatFrame);
          wheatSprite.setFrame(actualFrameNumber);
        } else {
          wheatSprite.setTexture(`wheat_${wheatFrame}`);
        }
      }
      
      wheatSprite.setVisible(true);
    } else {
      // Hide or remove wheat sprite
      if (wheatSprite) {
        wheatSprite.setVisible(false);
      }
    }
  }

  private updateProgressBar(id: string, progress: any, x: number, y: number) {
    let progressBar = this.progressBars.get(id);

    // Check if there's an active task for this target using centralized system
    const gameState = useGameStore.getState();
    const progressPercent = gameState.getTaskProgress(id);
    const hasActiveTask = progressPercent > 0;

    if (hasActiveTask) {
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
    
    // Force unblock the active entity before starting execution
    console.log(`[CODE-EXECUTION] Entity ${activeEntity.id} blocked state before unblock: ${activeEntity.taskState.isBlocked}`);
    gameState.forceUnblockEntity(activeEntity.id);
    
    // Get fresh entity data after potential unblocking
    const freshEntity = gameState.entities.get(gameState.activeEntityId);
    if (!freshEntity) {
      console.warn('No active entity for code execution');
      EventBus.emit('code-execution-failed', 'No active entity found');
      return;
    }
    
    console.log(`[CODE-EXECUTION] Entity ${freshEntity.id} blocked state after unblock: ${freshEntity.taskState.isBlocked}`);
    console.log(`[CODE-EXECUTION] Entity can perform action: ${gameState.canPerformAction(freshEntity.id)}`);
    
    const executionContext = {
      entity: freshEntity,
      availableFunctions: BuiltInFunctionRegistry.createFunctionMap(),
      globalVariables: {},
      isRunning: true,
      currentGrid: gameState.getGridAt(freshEntity.position)
    };
    
    console.log(`[CODE-EXECUTION] Creating CodeExecutor with entity: ${freshEntity.id}`);
    this.codeExecutor = new CodeExecutor(executionContext, this.gridSystem);
    this.codeExecutor.setUserFunctions(gameState.codeWindows);
    
    // Emit execution started event
    EventBus.emit('code-execution-started');
    
    console.log(`[CODE-EXECUTION] Starting executeMain()`);
    
    try {
      const executePromise = this.codeExecutor.executeMain();
      console.log(`[CODE-EXECUTION] executeMain() promise created`);
      
      executePromise.then(result => {
        console.log('[CODE-EXECUTION] executeMain() resolved with result:', result);
      if (result.success) {
        // Emit successful completion
        EventBus.emit('code-execution-completed', result);
      } else {
        // Emit execution error
        EventBus.emit('code-execution-failed', result.message || 'Unknown error');
        this.showExecutionError(result.message || 'Unknown error');
      }
      }).catch(error => {
        console.error('[CODE-EXECUTION] executeMain() rejected with error:', error);
        const errorMessage = error.message || 'Unknown error';
        EventBus.emit('code-execution-failed', errorMessage);
        this.showExecutionError(errorMessage);
      });
    } catch (syncError) {
      console.error('[CODE-EXECUTION] Synchronous error in startCodeExecution:', syncError);
      EventBus.emit('code-execution-failed', 'Failed to start code execution');
    }
  }

  stopCodeExecution() {
    if (this.codeExecutor) {
      this.codeExecutor.stop();
      this.codeExecutor = undefined;
    }
    
    // Cancel only entity-related tasks, leave grid tasks running
    const currentGameState = useGameStore.getState();
    currentGameState.forceUnblockEntity(currentGameState.activeEntityId);
    
    // Stop all entity movements
    this.movementManager.stopAllMovements();
    
    // Clean up movement states
    for (const [_, entity] of currentGameState.entities) {
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
      // Only allow movement if entity is not currently moving and not blocked by tasks
      if (!activeEntity.movementState?.isMoving && !activeEntity.taskState.isBlocked) {
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

    if (!this.textures.exists('qubit_planting')) {
      console.warn('qubit_planting texture not found. Planting animations will not be created.');
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
    
    // Planting animation
    this.anims.create({
      key: 'qubit_planting',
      frames: this.anims.generateFrameNumbers('qubit_planting', { start: 0, end: 3 }),
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

  /**
   * Calculate the correct frame number for wheat sprites in the spritesheet
   * @param wheatPhase - The wheat phase (0-5)
   * @returns The frame number in the spritesheet
   */
  private getWheatFrameNumber(wheatPhase: number): number {
    // Since the wheat is in the very last row with 6 phases
    // We need to calculate the offset to the last row
    if (this.textures.exists('wheat_growth')) {
      const texture = this.textures.get('wheat_growth');
      const sourceWidth = texture.source[0].width;
      const sourceHeight = texture.source[0].height;
      
      // Calculate how many columns and rows are in the spritesheet
      const columns = Math.floor(sourceWidth / 16);
      const rows = Math.floor(sourceHeight / 16);
      
      // The wheat is in the last row (rows - 1) and starts from column 0
      // Frame number = (row * columns) + column
      const lastRowStartFrame = (rows - 1) * columns;
      
      return lastRowStartFrame + wheatPhase;
    }
    
    // Fallback for placeholder sprites
    return wheatPhase;
  }

  // Method to easily change wheat sprite key (for when user provides actual spritesheet)
  public setWheatSpriteKey(spriteKey: string): void {
    
    // Update all existing wheat sprites
    this.wheatSprites.forEach((sprite, id) => {
      const gridId = id.replace('wheat_', '');
      const grid = this.gameStore.grids.get(gridId);
      if (grid) {
        this.updateWheatSprite(grid);
      }
    });
    
    console.log(`Wheat sprite key changed to: ${spriteKey}`);
  }

  // =====================================================================
  // UPGRADE SYSTEM
  // =====================================================================

  private openUpgradeModal(): void {
    if (this.isUpgradeModalOpen) return;
    
    this.isUpgradeModalOpen = true;
    this.createUpgradeModal();
  }

  private closeUpgradeModal(): void {
    if (!this.isUpgradeModalOpen) return;
    
    this.isUpgradeModalOpen = false;
    if (this.upgradeModal) {
      this.upgradeModal.destroy();
      this.upgradeModal = null;
    }
  }

  private createUpgradeModal(): void {
    const camera = this.cameras.main;
    const modalWidth = 500;
    const modalHeight = 400;
    
    // Create modal container
    this.upgradeModal = this.add.container(camera.centerX, camera.centerY);
    this.upgradeModal.setScrollFactor(0);
    this.upgradeModal.setDepth(2000);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.lineStyle(2, 0xf5a623);
    bg.fillRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 8);
    bg.strokeRoundedRect(-modalWidth/2, -modalHeight/2, modalWidth, modalHeight, 8);
    this.upgradeModal.add(bg);

    // Title
    const title = this.add.text(0, -modalHeight/2 + 30, 'UPGRADES', {
      fontSize: '24px',
      color: '#f5a623',
      fontFamily: 'Arial, sans-serif'
    });
    title.setOrigin(0.5);
    this.upgradeModal.add(title);

    // Current wheat display
    const gameState = useGameStore.getState();
    const wheatText = this.add.text(0, -modalHeight/2 + 70, `Available Wheat: ${gameState.globalResources.wheat || 0}`, {
      fontSize: '16px',
      color: '#cccccc',
      fontFamily: 'Arial, sans-serif'
    });
    wheatText.setOrigin(0.5);
    this.upgradeModal.add(wheatText);

    // Upgrade buttons
    this.createUpgradeButtons();

    // Close button
    const closeBtn = this.add.text(0, modalHeight/2 - 30, 'CLOSE', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#666666',
      padding: { x: 20, y: 10 }
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeUpgradeModal());
    closeBtn.on('pointerover', () => closeBtn.setTint(0xaaaaaa));
    closeBtn.on('pointerout', () => closeBtn.clearTint());
    this.upgradeModal.add(closeBtn);
  }

  private createUpgradeButtons(): void {
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    if (!activeEntity) return;

    const upgrades = [
      {
        name: 'Movement Speed +0.5',
        description: 'Increase walking speed',
        cost: 15,
        current: activeEntity.stats.walkingSpeed,
        apply: () => {
          gameState.updateEntity(activeEntity.id, {
            stats: { ...activeEntity.stats, walkingSpeed: activeEntity.stats.walkingSpeed + 0.5 }
          });
        }
      },
      {
        name: 'Max Energy +20',
        description: 'Increase maximum energy capacity',
        cost: 10,
        current: activeEntity.stats.maxEnergy,
        apply: () => {
          const newMaxEnergy = activeEntity.stats.maxEnergy + 20;
          gameState.updateEntity(activeEntity.id, {
            stats: { 
              ...activeEntity.stats, 
              maxEnergy: newMaxEnergy,
              energy: Math.min(activeEntity.stats.energy + 20, newMaxEnergy) // Also restore 20 energy
            }
          });
        }
      },
      {
        name: 'Harvest Amount +2',
        description: 'Get more wheat per harvest',
        cost: 25,
        current: activeEntity.stats.harvestAmount || 1,
        apply: () => {
          gameState.updateEntity(activeEntity.id, {
            stats: { ...activeEntity.stats, harvestAmount: (activeEntity.stats.harvestAmount || 1) + 2 }
          });
        }
      },
      {
        name: 'Planting Speed +25%',
        description: 'Reduce planting time',
        cost: 20,
        current: `${Math.round((1 - (activeEntity.stats.plantingSpeedMultiplier || 1)) * 100)}% faster`,
        apply: () => {
          const currentMultiplier = activeEntity.stats.plantingSpeedMultiplier || 1;
          gameState.updateEntity(activeEntity.id, {
            stats: { ...activeEntity.stats, plantingSpeedMultiplier: Math.max(0.1, currentMultiplier - 0.25) }
          });
        }
      }
    ];

    upgrades.forEach((upgrade, index) => {
      const yOffset = -80 + (index * 80);
      const canAfford = (gameState.globalResources.wheat || 0) >= upgrade.cost;
      
      // Upgrade container
      const upgradeContainer = this.add.container(0, yOffset);
      
      // Background for upgrade item
      const itemBg = this.add.graphics();
      itemBg.fillStyle(0x333333, 0.8);
      itemBg.lineStyle(1, canAfford ? 0x16c60c : 0x666666);
      itemBg.fillRoundedRect(-200, -25, 400, 50, 4);
      itemBg.strokeRoundedRect(-200, -25, 400, 50, 4);
      upgradeContainer.add(itemBg);
      
      // Upgrade name
      const nameText = this.add.text(-180, -15, upgrade.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      });
      upgradeContainer.add(nameText);
      
      // Current value
      const currentText = this.add.text(-180, 5, `Current: ${upgrade.current}`, {
        fontSize: '10px',
        color: '#cccccc',
        fontFamily: 'Arial, sans-serif'
      });
      upgradeContainer.add(currentText);
      
      // Cost
      const costText = this.add.text(0, -5, `Cost: ${upgrade.cost} Wheat`, {
        fontSize: '12px',
        color: '#f5a623',
        fontFamily: 'Arial, sans-serif'
      });
      costText.setOrigin(0.5);
      upgradeContainer.add(costText);
      
      // Buy button
      const buyBtn = this.add.text(150, 0, 'BUY', {
        fontSize: '12px',
        color: canAfford ? '#ffffff' : '#888888',
        backgroundColor: canAfford ? '#16c60c' : '#444444',
        padding: { x: 15, y: 8 }
      });
      buyBtn.setOrigin(0.5);
      
      if (canAfford) {
        buyBtn.setInteractive({ useHandCursor: true });
        buyBtn.on('pointerdown', () => {
          // Consume wheat
          gameState.updateResources({ wheat: (gameState.globalResources.wheat || 0) - upgrade.cost });
          
          // Apply upgrade
          upgrade.apply();
          
          console.log(`[UPGRADES] Applied upgrade: ${upgrade.name}`);
          
          // Close and reopen modal to refresh
          this.closeUpgradeModal();
          this.openUpgradeModal();
        });
        buyBtn.on('pointerover', () => buyBtn.setTint(0xaaaaaa));
        buyBtn.on('pointerout', () => buyBtn.clearTint());
      }
      
      upgradeContainer.add(buyBtn);
      this.upgradeModal!.add(upgradeContainer);
    });
  }

  // =====================================================================
  // SAVE/LOAD SYSTEM
  // =====================================================================
  
  private reinitializeGridFunctions(): void {
    const gameState = useGameStore.getState();
    
    // Reinitialize functions for all grids
    gameState.grids.forEach((grid, gridId) => {
      // Get fresh function objects from GridSystem
      const freshFunctions = this.gridSystem.getFunctionsForGridType(grid.type);
      
      if (freshFunctions.length > 0) {
        // Update the grid with proper function objects
        gameState.updateGrid(gridId, {
          functions: freshFunctions
        });
        
        console.log(`[LOAD] Reinitialized functions for ${grid.type} grid: ${gridId}`);
      }
    });
    
    console.log(`[LOAD] Reinitialized functions for ${gameState.grids.size} grids`);
  }

  private clearAllSprites(): void {
    // Destroy all entity sprites
    this.entitySprites.forEach((sprite, id) => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.entitySprites.clear();
    
    // Destroy all grid sprites
    this.gridSprites.forEach((sprite, id) => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.gridSprites.clear();
    
    // Destroy all wheat sprites
    this.wheatSprites.forEach((sprite, id) => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.wheatSprites.clear();
    
    // Clear progress bars
    this.progressBars.forEach((graphics, id) => {
      if (graphics && graphics.active) {
        graphics.destroy();
      }
    });
    this.progressBars.clear();
    
    // Clear progress texts
    this.progressTexts.forEach((text, id) => {
      if (text && text.active) {
        text.destroy();
      }
    });
    this.progressTexts.clear();
    
    // Clear execution texts
    this.clearExecutionTexts();
    
    console.log('[SPRITES] All sprites cleared');
  }

  private saveGameState(): void {
    try {
      const gameState = useGameStore.getState();

      console.log('Saving game state');
      console.log(gameState);
      
      const saveData = {
        version: '1.0',
        timestamp: Date.now(),
        gridSize: gameState.gridSize,
        entities: Array.from(gameState.entities.entries()).map(([id, entity]) => ({
          ...entity,
          id,
          // Convert Phaser sprite reference to null for serialization
          sprite: null,
          // Reset movement state for clean loading
          movementState: {
            isMoving: false,
            fromPosition: entity.position,
            toPosition: entity.position
          }
        })),
        grids: Array.from(gameState.grids.entries()).map(([id, grid]) => ({
          ...grid,
          id,
          // Clear any active progress/runtime task state
          taskState: {
            isBlocked: false,
            currentTask: undefined,
            progress: undefined
          }
        })),
        activeEntityId: gameState.activeEntityId,
        globalResources: gameState.globalResources,
        codeWindows: Array.from(gameState.codeWindows.entries()).map(([id, window]) => ({
          ...window,
          id
        })),
        mainWindowId: gameState.mainWindowId
        // Note: activeTasks and taskTimer are runtime-only and should NOT be saved
      };
      
      localStorage.setItem('binary-coven-save', JSON.stringify(saveData));
      console.log('[SAVE] Game state saved successfully');
      
      // Show save confirmation
      this.showNotification('Game Saved!', 0x16c60c);
      console.log("Finalized save", gameState)
    } catch (error) {
      console.error('[SAVE] Failed to save game state:', error);
      this.showNotification('Save Failed!', 0xff0000);
    }
  }

  private loadGameState(): void {
    try {
      const saveDataStr = localStorage.getItem('binary-coven-save');
      if (!saveDataStr) {
        this.showNotification('No Save Found!', 0xff6600);
        return;
      }
      
      const saveData = JSON.parse(saveDataStr);
      const gameState = useGameStore.getState();
      
      console.log('[LOAD] Starting game state load...');
      
      // Clear and destroy all existing sprites first
      this.clearAllSprites();
      
      // Clear current state completely
      // gameState.reset();
      
      // Create new Maps directly with the saved data
      const newEntities = new Map<string, Entity>();
      const newGrids = new Map<string, GridTile>();
      const newCodeWindows = new Map<string, CodeWindow>();
      
      // Restore entities with their original IDs
      saveData.entities.forEach((entityData: any) => {
        const entity = {
          ...entityData,
          // Ensure sprite reference is null for serialization safety
          sprite: null,
          // Reset movement state
          movementState: {
            isMoving: false,
            fromPosition: entityData.position,
            toPosition: entityData.position
          },
          // Reset task state to ensure clean startup
          taskState: {
            isBlocked: false,
            currentTask: undefined,
            progress: undefined
          }
        };
        newEntities.set(entityData.id, entity);
        console.log(`[LOAD] Restored entity: ${entity.name} (${entity.id}) at (${entity.position.x}, ${entity.position.y})`);
      });
      
      // Restore grids with their original IDs
      saveData.grids.forEach((gridData: any) => {
        const grid = {
          ...gridData,
          // Reset any runtime state if needed
          taskState: {
            ...gridData.taskState,
            // Clear any active progress
            progress: undefined
          }
        };
        newGrids.set(gridData.id, grid);
        console.log(`[LOAD] Restored grid: ${grid.name} (${grid.id}) at (${grid.position.x}, ${grid.position.y})`);
      });
      
      // Restore code windows with their original IDs
      saveData.codeWindows.forEach((windowData: any) => {
        newCodeWindows.set(windowData.id, windowData);
        console.log(`[LOAD] Restored code window: ${windowData.name} (${windowData.id})`);
      });
      
      // Apply all the restored data at once
      useGameStore.setState({
        entities: newEntities,
        grids: newGrids,
        codeWindows: newCodeWindows,
        activeEntityId: saveData.activeEntityId,
        globalResources: saveData.globalResources,
        mainWindowId: saveData.mainWindowId,
        // Reset execution state
        executionContext: undefined,
        isPaused: false,
        // Reset runtime task system state
        activeTasks: new Map(),
        taskTimer: undefined
      });
      
      // Reinitialize the task system after loading
      const freshGameState = useGameStore.getState();
      freshGameState.initializeTaskSystem();
      
      // Reinitialize grid functions that were lost during JSON serialization
      this.reinitializeGridFunctions();
      
      // Recreate sprites for the loaded entities and grids
      this.updateVisuals();
      
      // Ensure camera follows the active entity
      if (saveData.activeEntityId) {
        this.lockCameraToQubit();
      }
      
      console.log('[LOAD] Game state loaded successfully');
      console.log('[LOAD] Active entity ID:', saveData.activeEntityId);
      console.log('[LOAD] Entities loaded:', newEntities.size);
      console.log('[LOAD] Grids loaded:', newGrids.size);
      
      this.showNotification('Game Loaded!', 0x16c60c);
      console.log("Finalized load", gameState)
      
    } catch (error) {
      console.error('[LOAD] Failed to load game state:', error);
      this.showNotification('Load Failed!', 0xff0000);
    }
  }

  private showNotification(message: string, color: number): void {
    const camera = this.cameras.main;
    const notification = this.add.text(camera.centerX, camera.centerY - 200, message, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
      padding: { x: 20, y: 10 }
    });
    notification.setOrigin(0.5);
    notification.setScrollFactor(0);
    notification.setDepth(3000);
    
    // Fade out animation
    this.tweens.add({
      targets: notification,
      alpha: 0,
      y: notification.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => notification.destroy()
    });
  }
} 