import { Scene } from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import GridSystem, { initializeDefaultGridTypes } from '../systems/GridSystem';
import { CodeExecutor } from '../systems/CodeExecutor';
import { BuiltInFunctionRegistry } from '../systems/BuiltInFunctions';
import { Entity, GridTile, Position, FarmlandState, CodeWindow, NPCConfig } from '../../types/game';
import { EventBus } from '../EventBus';
import TaskManager from '../systems/TaskManager';
import { MapEditor } from '../systems/MapEditor';
import { NPCManager } from '../systems/NPCManager';
import { GridHoverAnimation } from '../systems/GridHoverAnimation';
import { DroneManager } from '../systems/DroneManager';
import { GameStateService } from '../../services/gameStateService';

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
  private npcManager: NPCManager;
  private droneManager: DroneManager;
  private droneExecutors: Map<string, CodeExecutor> = new Map(); // Code executors for each drone
  private mapEditorUI: React.ComponentType<any> | null = null;
  private well: Phaser.GameObjects.Sprite;
  
  
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
  private isLockedToQubit: boolean = true;
  private cameraSpeed: number = 300;
  private isCameraPanning: boolean = false;
  
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
    this.npcManager = new NPCManager(this, this.GRID_SIZE);
    this.droneManager = new DroneManager(this, this.GRID_SIZE);
    
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
    // Note: Spritesheets are now loaded in Preloader scene
    // Animations are created globally in Preloader scene (Phaser best practice)
    
    // Create simple colored rectangles as sprites for prototyping (other entities)
    this.createPlaceholderSprites();
  }

  create() {
    // Configure pixel-perfect rendering for the entire scene
    this.cameras.main.setRoundPixels(true);

    const camera = this.cameras.main;
    
    // Create placeholder sprites first (fallback sprites)
    this.createPlaceholderSprites();
    
    // Note: Animations are now created globally in Preloader scene (Phaser best practice)
    // No need to create them here - they're available across all scenes
    
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
    
    // Create sample NPCs
    this.createSampleNPCs();
    
    console.log('Programming Game Scene Created');

    // Emit event so React component can get scene reference
    EventBus.emit('current-scene-ready', this);

    // Note: Auto-load removed to prevent race condition with React initialization
    // Users can manually load their save via the menu if needed
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
    
    // Food Station - Invisible
    graphics.fillStyle(0xFF6600, 0); // Set alpha to 0 for invisibility
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

  private createFoodStation(x: number, y: number) {
    const store = useGameStore.getState();
    const foodData = this.gridSystem.initializeGrid('food', '');
    store.addGrid({
      id: `food_station_${x}_${y}`,
      type: 'food',
      position: { x, y },
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
  }

  private createSampleWorld() {
    const store = useGameStore.getState();

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


    //Challenge grid farms

    this.createFarmLand(19, 19, 30);
    this.createFarmLand(20, 19, 31);
    this.createFarmLand(21, 19, 32);
    this.createFarmLand(22, 19, 33);

    this.createFarmLand(19, 20, 34);
    this.createFarmLand(20, 20, 35);
    this.createFarmLand(21, 20, 36);
    this.createFarmLand(22, 20, 37);
    
    this.createFarmLand(19, 21, 38);
    this.createFarmLand(20, 21, 39);
    this.createFarmLand(21, 21, 40);
    this.createFarmLand(22, 21, 41);

    this.createFarmLand(19, 22, 42);
    this.createFarmLand(20, 22, 43);
    this.createFarmLand(21, 22, 44);
    this.createFarmLand(22, 22, 45);

    const foodData = this.gridSystem.initializeGrid('food', '');

    this.createFoodStation(10, 7);
    this.createFoodStation(10, 8);
    this.createFoodStation(9, 9);
    this.createFoodStation(8, 9);
    this.createFoodStation(7, 8);
    
    // Create a test drone
    console.log('[DRONE-INIT] ═══════════════════════════════════════');
    console.log('[DRONE-INIT] Starting drone creation...');
    console.log('[DRONE-INIT] Checking prerequisites:', {
      textureExists: this.textures.exists('drone_idle'),
      animExists: this.anims.exists('drone_idle'),
      droneManagerReady: !!this.droneManager
    });
    
    this.createDrone({
      id: 'drone_alpha',
      name: 'Alpha Drone',
      position: { x: 15, y: 20 },
      spriteKey: 'drone_idle',
      scale: 2,
      showHoverAnimation: true,
      stats: {
        walkingSpeed: 3.0,
        energy: 100,
        maxEnergy: 100,
        harvestAmount: 1,
        plantingSpeedMultiplier: 1.0
      }
    });
    
    console.log('[DRONE-INIT] ═══════════════════════════════════════');
    
    // const siloData = this.gridSystem.initializeGrid('silo', '');
    // const siloId = store.addGrid({
    //   id: 'storage_silo',
    //   type: 'silo',
    //   position: { x: 16, y: 7 },
    //   name: 'Storage Silo',
    //   description: 'Secure storage for crops and farm items',
    //   properties: {},
    //   isActive: true,
    //   functions: siloData.functions || [],
    //   state: siloData.state || {},
    //   taskState: siloData.taskState || {
    //     isBlocked: false,
    //     currentTask: undefined,
    //     progress: undefined
    //   }
    // });
    
    // // Update visual representation
    // this.updateVisuals();
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
    // Set up arrow keys individually (instead of createCursorKeys to avoid spacebar capture)
    this.cameraKeys = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false)
    };
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

  public panCameraTo(x: number, y: number, duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      // Prevent multiple simultaneous camera pans
      if (this.isCameraPanning) {
        console.log('[CAMERA] Camera is already panning, ignoring request');
        resolve();
        return;
      }

      this.isCameraPanning = true;
      console.log('[CAMERA] Starting camera pan to', x, y);

      // Ensure camera is unlocked during dialogue-driven panning
      this.unlockCamera();

      // Convert grid coordinates to pixel coordinates
      const pixelX = x * this.GRID_SIZE + this.GRID_SIZE / 2;
      const pixelY = y * this.GRID_SIZE + this.GRID_SIZE / 2;

      // Set up completion event listener
      const onPanComplete = () => {
        console.log('[CAMERA] Pan completed');
        this.isCameraPanning = false;
        this.cameras.main.off('camerapancomplete', onPanComplete);
        resolve();
      };

      // Listen for pan completion
      this.cameras.main.once('camerapancomplete', onPanComplete);

      // Start the camera pan
      this.cameras.main.pan(pixelX, pixelY, duration, 'Power2');
    });
  }

  private setupStateListeners() {
    // This would be implemented with proper state management
    // For now, we'll update visuals periodically
    this.time.addEvent({
      delay: 100,
      callback: () => this.updateVisuals(),
      loop: true
    });

    // =====================================================================
    // SPRITE CLEANUP LISTENERS
    // =====================================================================
    // Listen for entity removal events and clean up their sprites
    EventBus.on('entity-removed', (entityId: string) => {
      this.cleanupEntitySprite(entityId);
    });

    // Listen for grid removal events and clean up their sprites
    EventBus.on('grid-removed', (gridId: string) => {
      this.cleanupGridSprite(gridId);
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

    // Handle save/load/reset game state events
    EventBus.on('save-game-state', () => {
      this.saveGameState();
    });

    EventBus.on('load-game-state', () => {
      this.loadGameState();
    });

    EventBus.on('reset-game-state', () => {
      this.resetGameState();
    });

    // Auto-save on critical game events
    EventBus.on('quest-completed', () => {
      console.log('[AUTO-SAVE] Quest completed - auto-saving...');
      this.saveGameState();
    });

    EventBus.on('quest-phase-completed', () => {
      console.log('[AUTO-SAVE] Quest phase completed - auto-saving...');
      this.saveGameState();
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

    // Update entity sprites (with error handling to prevent crashes)
    gameState.entities.forEach((entity, id) => {
      try {
        this.updateEntitySprite(entity);
      } catch (error) {
        console.error(`[VISUALS] Failed to update sprite for entity ${id}:`, error);
        // Continue updating other sprites even if one fails
      }
    });

    // Update grid sprites (with error handling to prevent crashes)
    gameState.grids.forEach((grid, id) => {
      try {
        this.updateGridSprite(grid);
      } catch (error) {
        console.error(`[VISUALS] Failed to update sprite for grid ${id}:`, error);
        // Continue updating other sprites even if one fails
      }
    });
  }

  private updateEntitySprite(entity: Entity) {
    // Skip drones - DroneManager handles their sprites
    if (entity.isDrone) {
      return;
    }
    
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
      // Get progress from centralized task system; fallback to saved state percent
      const gameState = useGameStore.getState();
      let progressPercent = gameState.getTaskProgress(grid.id);
      if (!progressPercent || progressPercent === 0) {
        progressPercent = grid.state.growthProgressPercent || 0;
      }
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

  // =====================================================================
  // SPRITE CLEANUP METHODS (PHASER BEST PRACTICE)
  // =====================================================================
  
  /**
   * Clean up all visual elements associated with an entity
   * Prevents memory leaks by properly destroying Phaser game objects
   */
  private cleanupEntitySprite(entityId: string): void {
    console.log(`[CLEANUP] Cleaning up sprite for entity: ${entityId}`);
    
    // Clean up main sprite
    const sprite = this.entitySprites.get(entityId);
    if (sprite) {
      sprite.destroy();
      this.entitySprites.delete(entityId);
    }
    
    // Clean up progress bar
    const progressBar = this.progressBars.get(entityId);
    if (progressBar) {
      progressBar.destroy();
      this.progressBars.delete(entityId);
    }
    
    // Clean up progress text
    const progressText = this.progressTexts.get(entityId);
    if (progressText) {
      progressText.destroy();
      this.progressTexts.delete(entityId);
    }
    
    console.log(`[CLEANUP] Entity sprite cleanup complete: ${entityId}`);
  }
  
  /**
   * Clean up all visual elements associated with a grid tile
   * Prevents memory leaks by properly destroying Phaser game objects
   */
  private cleanupGridSprite(gridId: string): void {
    console.log(`[CLEANUP] Cleaning up sprite for grid: ${gridId}`);
    
    // Clean up main grid sprite
    const sprite = this.gridSprites.get(gridId);
    if (sprite) {
      sprite.destroy();
      this.gridSprites.delete(gridId);
    }
    
    // Clean up wheat sprite (if this is a farmland)
    const wheatSpriteId = `wheat_${gridId}`;
    const wheatSprite = this.wheatSprites.get(wheatSpriteId);
    if (wheatSprite) {
      wheatSprite.destroy();
      this.wheatSprites.delete(wheatSpriteId);
    }
    
    // Clean up progress bar
    const progressBar = this.progressBars.get(gridId);
    if (progressBar) {
      progressBar.destroy();
      this.progressBars.delete(gridId);
    }
    
    // Clean up progress text
    const progressText = this.progressTexts.get(gridId);
    if (progressText) {
      progressText.destroy();
      this.progressTexts.delete(gridId);
    }
    
    console.log(`[CLEANUP] Grid sprite cleanup complete: ${gridId}`);
  }
  
  /**
   * Clean up all sprites (useful when scene is destroyed)
   */
  private cleanupAllSprites(): void {
    console.log('[CLEANUP] Cleaning up all sprites');
    
    // Clean up all entity sprites
    this.entitySprites.forEach((sprite, id) => {
      sprite.destroy();
    });
    this.entitySprites.clear();
    
    // Clean up all grid sprites
    this.gridSprites.forEach((sprite, id) => {
      sprite.destroy();
    });
    this.gridSprites.clear();
    
    // Clean up all wheat sprites
    this.wheatSprites.forEach((sprite, id) => {
      sprite.destroy();
    });
    this.wheatSprites.clear();
    
    // Clean up all progress bars
    this.progressBars.forEach((bar, id) => {
      bar.destroy();
    });
    this.progressBars.clear();
    
    // Clean up all progress texts
    this.progressTexts.forEach((text, id) => {
      text.destroy();
    });
    this.progressTexts.clear();
    
    console.log('[CLEANUP] All sprites cleaned up');
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

  // Drone execution methods
  startDroneExecution(droneId: string) {
    const gameState = useGameStore.getState();
    const drone = gameState.entities.get(droneId);
    
    if (!drone || !drone.isDrone) {
      console.warn(`No drone found with id: ${droneId}`);
      EventBus.emit('drone-execution-failed', { droneId, error: 'Drone not found' });
      return;
    }

    // Check if drone is already executing
    if (drone.isExecuting) {
      console.warn(`Drone ${droneId} is already executing`);
      return;
    }

    // Force unblock the drone before starting execution
    console.log(`[DRONE-EXECUTION] Drone ${drone.id} blocked state before unblock: ${drone.taskState.isBlocked}`);
    gameState.forceUnblockEntity(drone.id);
    
    // Get fresh drone data after potential unblocking
    const freshDrone = gameState.entities.get(droneId);
    if (!freshDrone) {
      console.warn('Drone not found after unblocking');
      EventBus.emit('drone-execution-failed', { droneId, error: 'Drone not found after unblocking' });
      return;
    }

    console.log(`[DRONE-EXECUTION] Drone ${freshDrone.id} blocked state after unblock: ${freshDrone.taskState.isBlocked}`);
    
    // Create execution context for drone
    const executionContext = {
      entity: freshDrone,
      availableFunctions: BuiltInFunctionRegistry.createFunctionMap(),
      globalVariables: {},
      isRunning: true,
      currentGrid: gameState.getGridAt(freshDrone.position)
    };
    
    // Create code executor for this drone
    const droneExecutor = new CodeExecutor(executionContext, this.gridSystem);
    
    // Set drone's code windows
    if (freshDrone.codeWindows) {
      droneExecutor.setUserFunctions(freshDrone.codeWindows);
    } else {
      console.warn(`Drone ${droneId} has no code windows`);
      EventBus.emit('drone-execution-failed', { droneId, error: 'No code windows' });
      return;
    }
    
    // Store executor
    this.droneExecutors.set(droneId, droneExecutor);
    
    // Update drone state
    gameState.updateEntity(droneId, { isExecuting: true });
    
    // Emit execution started event
    EventBus.emit('drone-execution-started', { droneId });
    
    console.log(`[DRONE-EXECUTION] Starting drone ${drone.name} execution`);
    
    // Start execution
    try {
      const executePromise = droneExecutor.executeMain();
      
      executePromise.then(result => {
        console.log(`[DRONE-EXECUTION] Drone ${drone.name} execution completed:`, result);
        
        // Update drone state
        gameState.updateEntity(droneId, { isExecuting: false });
        
        // Clean up executor
        this.droneExecutors.delete(droneId);
        
        if (result.success) {
          EventBus.emit('drone-execution-completed', { droneId, result });
        } else {
          EventBus.emit('drone-execution-failed', { droneId, error: result.message || 'Unknown error' });
          this.showExecutionError(`Drone ${drone.name}: ${result.message || 'Unknown error'}`);
        }
      }).catch(error => {
        console.error(`[DRONE-EXECUTION] Drone ${drone.name} execution error:`, error);
        
        // Update drone state
        gameState.updateEntity(droneId, { isExecuting: false });
        
        // Clean up executor
        this.droneExecutors.delete(droneId);
        
        const errorMessage = error.message || 'Unknown error';
        EventBus.emit('drone-execution-failed', { droneId, error: errorMessage });
        this.showExecutionError(`Drone ${drone.name}: ${errorMessage}`);
      });
    } catch (syncError) {
      console.error(`[DRONE-EXECUTION] Synchronous error starting drone ${drone.name}:`, syncError);
      gameState.updateEntity(droneId, { isExecuting: false });
      this.droneExecutors.delete(droneId);
      EventBus.emit('drone-execution-failed', { droneId, error: 'Failed to start execution' });
    }
  }

  stopDroneExecution(droneId: string) {
    const droneExecutor = this.droneExecutors.get(droneId);
    
    if (droneExecutor) {
      droneExecutor.stop();
      this.droneExecutors.delete(droneId);
    }
    
    // Cancel drone tasks and stop movement
    const gameState = useGameStore.getState();
    const drone = gameState.entities.get(droneId);
    
    if (drone) {
      gameState.forceUnblockEntity(droneId);
      gameState.updateEntity(droneId, { isExecuting: false });
      
      // Stop drone movement
      if (drone.movementState?.isMoving) {
        this.movementManager.stopMovement(drone);
      }
    }
    
    // Emit execution stopped event
    EventBus.emit('drone-execution-stopped', { droneId });
    console.log(`[DRONE-EXECUTION] Stopped drone ${droneId} execution`);
  }

  stopAllDroneExecution() {
    const droneIds = Array.from(this.droneExecutors.keys());
    droneIds.forEach(id => this.stopDroneExecution(id));
    console.log('[DRONE-EXECUTION] Stopped all drone executions');
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
    
    // Camera movement via WASD has been removed
    // Camera now stays locked to the active entity
    
    if (!activeEntity) return;
    
    // Arrow key qubit movement (only when camera is locked and not in unlocked mode)
    if (this.isLockedToQubit && !isTypingInInput()) {
      // Check if player is on a Challenge Grid - if so, block manual movement
      const isOnChallengeGrid = gameState.isPlayerOnChallengeGrid();
      
      if (isOnChallengeGrid) {
        // Block manual movement but show a brief message (optional)
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.up) ||
            Phaser.Input.Keyboard.JustDown(this.cameraKeys.down) ||
            Phaser.Input.Keyboard.JustDown(this.cameraKeys.left) ||
            Phaser.Input.Keyboard.JustDown(this.cameraKeys.right)) {
          console.log('[CHALLENGE] Manual movement blocked - use code to move on Challenge Grid');
          EventBus.emit('challenge-movement-blocked');
        }
        return; // Exit early to prevent any manual movement
      }
      
      // Only allow movement if entity is not currently moving and not blocked by tasks
      if (!activeEntity.movementState?.isMoving && !activeEntity.taskState.isBlocked) {
        // Handle movement with smooth transitions
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.up)) {
          const targetPos = { x: activeEntity.position.x, y: activeEntity.position.y - 1 };
          this.movementManager.moveEntity(activeEntity, targetPos);
          EventBus.emit('tutorial-movement', { direction: 'ArrowUp' });
        }
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.down)) {
          const targetPos = { x: activeEntity.position.x, y: activeEntity.position.y + 1 };
          this.movementManager.moveEntity(activeEntity, targetPos);
          EventBus.emit('tutorial-movement', { direction: 'ArrowDown' });
        }
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.left)) {
          const targetPos = { x: activeEntity.position.x - 1, y: activeEntity.position.y };
          this.movementManager.moveEntity(activeEntity, targetPos);
          EventBus.emit('tutorial-movement', { direction: 'ArrowLeft' });
        }
        if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.right)) {
          const targetPos = { x: activeEntity.position.x + 1, y: activeEntity.position.y };
          this.movementManager.moveEntity(activeEntity, targetPos);
          EventBus.emit('tutorial-movement', { direction: 'ArrowRight' });
        }
      }
    }
  }

  // Note: createAnimations() method removed - animations are now created globally in Preloader scene
  // This follows Phaser best practices: create animations once in Preloader, use them everywhere

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

        // Update hover indicator for drones
        if (entity.isDrone) {
          const droneManager = this.getDroneManager();
          if (droneManager) {
            droneManager.updateDronePosition(data.entityId, data.targetPosition);
          }
        }
      }

      // Call the callback with result
      data.callback(success);
    });
    
    // Handle movement manager requests (if needed)
    EventBus.on('request-movement-manager', (callback: (manager: MovementManager) => void) => {
      callback(this.movementManager);
    });

    // Handle camera panning requests
    EventBus.on('pan-camera-to', async (data: { x: number, y: number, duration?: number }) => {
      await this.panCameraTo(data.x, data.y, data.duration || 1000);
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
      this.showExecutionLine(data.line, data.functionName, data.entityId);
    });
    
    // Listen for function call events
    EventBus.on('code-execution-function-call', (data: {
      functionName: string;
      args: any[];
      entityId: string;
    }) => {
      const argsString = data.args.length > 0 ? `(${data.args.join(', ')})` : '()';
      this.showExecutionLine(`${data.functionName}${argsString}`, 'function', data.entityId);
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

  private showExecutionLine(line: string, context: string, entityId: string) {
    const gameState = useGameStore.getState();
    const executingEntity = gameState.entities.get(entityId);

    if (!executingEntity) return;

    const entitySprite = this.entitySprites.get(executingEntity.id);
    if (!entitySprite) return;

    // Limit text length for better display (increased from 30 to 40)
    const displayText = line.length > 40 ? line.substring(0, 37) + '...' : line;

    // Create floating text above the entity
    const textY = entitySprite.y - (this.GRID_SIZE * this.QUBIT_SCALE_FACTOR / 2) - 60;
    const executionText = this.add.text(entitySprite.x, textY, displayText, {
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 12, y: 6 },
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
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

  private async saveGameState(): Promise<void> {
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
          },
          // Persist growth progress percent if growing
          state: {
            ...grid.state,
            growthProgressPercent: ((): number => {
              if (grid.type === 'farmland') {
                // If there's an active grid task, read current progress
                const percent = gameState.getTaskProgress(grid.id);
                if (percent > 0) return Math.floor(percent);
                // Otherwise keep existing saved value or 0
                return grid.state.growthProgressPercent || 0;
              }
              return grid.state.growthProgressPercent || 0;
            })()
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

      // Use GameStateService to save (handles both cloud and localStorage)
      await GameStateService.saveGameState(
        saveData,
        'autosave',
        (message, color) => this.showNotification(message, color)
      );

      console.log('[SAVE] Game state saved successfully');
      console.log("Finalized save", gameState);
    } catch (error) {
      console.error('[SAVE] Failed to save game state:', error);
      this.showNotification('Save Failed!', 0xff0000);
    }
  }

  private async loadGameState(): Promise<void> {
    try {
      // Use GameStateService to load (handles both cloud and localStorage)
      const result = await GameStateService.loadGameState(
        'autosave',
        (message, color) => this.showNotification(message, color)
      );

      if (!result.success || !result.gameState) {
        // No valid save data - return early WITHOUT clearing sprites
        // This prevents destroying existing sprites when there's nothing to load
        console.log('[LOAD] No valid save data, keeping current state');
        return;
      }

      const saveData = result.gameState;
      const gameState = useGameStore.getState();

      console.log('[LOAD] Starting game state load...');

      // Only clear sprites AFTER confirming we have valid data to load
      // This prevents the bug where sprites are destroyed but never recreated
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

      // If any farmland was in GROWING state, restart growth tasks from saved progress
      freshGameState.grids.forEach((grid) => {
        if (grid.type === 'farmland' && grid.state.status === FarmlandState.GROWING) {
          const savedPercent = Math.max(0, Math.min(100, grid.state.growthProgressPercent || 0));
          
          // Update the grid with the saved progress
          freshGameState.updateGrid(grid.id, {
            state: {
              ...grid.state,
              growthProgressPercent: savedPercent
            }
          } as any);
          
          console.log(`[LOAD] Resuming growth for grid ${grid.id} from ${savedPercent}%`);
          
          // Calculate remaining growth time based on saved progress
          // Original growth time is 10 seconds (from PLANT_DATA.wheat.growthTime)
          const totalGrowthTime = 10; // seconds
          const elapsedTime = (savedPercent / 100) * totalGrowthTime;
          const remainingTime = Math.max(0.1, totalGrowthTime - elapsedTime); // At least 0.1s remaining
          
          // Start growth task with remaining time and initial progress
          const growthTaskSuccess = freshGameState.startTask({
            type: 'grid',
            targetId: grid.id,
            taskName: 'growing',
            duration: totalGrowthTime, // Use full duration
            description: `${grid.state.plantType || 'Wheat'} growing...`,
            initialProgress: savedPercent, // Set initial progress
            onComplete: () => {
              console.log(`[LOAD-GROWTH] Growth completed for grid ${grid.id}`);
              
              // Get fresh reference for growth completion
              const completionStore = useGameStore.getState();
              const completionGrid = completionStore.grids.get(grid.id);
              
              if (!completionGrid) {
                console.error(`[LOAD-GROWTH] Grid not found after growth completion: ${grid.id}`);
                return;
              }
              
              console.log(`[LOAD-GROWTH] Updating grid ${grid.id} to READY state`);
              
              // Update to ready state (same as normal growth completion)
              completionStore.updateGrid(grid.id, {
                state: {
                  ...completionGrid.state,
                  status: FarmlandState.READY,
                  isGrown: true,
                  cropReady: true,
                  cropAmount: 1, // Default harvest amount
                  growthProgressPercent: 100
                }
              });
              
              console.log(`[LOAD-GROWTH] Grid ${grid.id} growth completed successfully`);
            }
          });
          
          if (!growthTaskSuccess) {
            console.error(`[LOAD] Failed to restart growth task for grid ${grid.id}`);
          } else {
            console.log(`[LOAD] Growth task restarted successfully for grid ${grid.id} from ${savedPercent}% progress`);
          }
        }
      });
      
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

      // Note: Notification already shown by GameStateService
      console.log("Finalized load", gameState)
      
    } catch (error) {
      console.error('[LOAD] Failed to load game state:', error);
      this.showNotification('Load Failed!', 0xff0000);
    }
  }

  /**
   * Auto-loads saved game if one exists
   * Called automatically when the game scene is created
   * Only loads from database saves, not localStorage
   */
  private async autoLoadSavedGame(): Promise<void> {
    try {
      console.log('[AUTO-LOAD] Checking for existing database save...');

      // Check if a saved game exists in the database only (no localStorage fallback)
      const hasSave = await GameStateService.hasDatabaseSave('autosave');

      if (hasSave) {
        console.log('[AUTO-LOAD] Found existing database save, loading...');

        // Load the saved game state
        await this.loadGameState();

        console.log('[AUTO-LOAD] Auto-load completed successfully');
      } else {
        console.log('[AUTO-LOAD] No database save found, starting fresh');
      }
    } catch (error) {
      console.error('[AUTO-LOAD] Failed to auto-load saved game:', error);
      // Don't show error notification - just proceed with normal initialization
      console.log('[AUTO-LOAD] Proceeding with fresh start due to error');
    }
  }

  private async resetGameState(): Promise<void> {
    try {
      console.log('[RESET] Resetting game state...');

      // Use GameStateService to reset (handles both cloud and localStorage)
      await GameStateService.resetGameState(
        (message, color) => this.showNotification(message, color)
      );

      console.log('[RESET] Game state reset successfully');

      // Reload the scene to start fresh
      this.scene.restart();
    } catch (error) {
      console.error('[RESET] Failed to reset game state:', error);
      this.showNotification('Reset Failed!', 0xff0000);
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

  // =====================================================================
  // NPC SYSTEM
  // =====================================================================
  
  /**
   * Create an NPC in the game
   * @param config NPC configuration object
   */
  public createNPC(config: NPCConfig): void {
    this.npcManager.createNPC(config);
  }
  
  /**
   * Remove an NPC from the game
   * @param npcId ID of the NPC to remove
   */
  public removeNPC(npcId: string): void {
    this.npcManager.removeNPC(npcId);
  }
  
  /**
   * Get the NPC manager instance (for advanced usage)
   */
  public getNPCManager(): NPCManager {
    return this.npcManager;
  }
  
  // =====================================================================
  // DRONE SYSTEM
  // =====================================================================
  
  /**
   * Create a programmable drone in the game
   * @param config Drone configuration object
   */
  public createDrone(config: any): void {
    this.droneManager.createDrone(config);
  }
  
  /**
   * Remove a drone from the game
   * @param droneId ID of the drone to remove
   */
  public removeDrone(droneId: string): void {
    this.droneManager.removeDrone(droneId);
  }
  
  /**
   * Get the Drone manager instance (for advanced usage)
   */
  public getDroneManager(): DroneManager {
    return this.droneManager;
  }
  
  /**
   * Create sample NPCs for demonstration
   */
  private createSampleNPCs(): void {    
    // Example NPC 2: Another NPC at position (10, 10)
    this.createNPC({
      id: 'npc_helper',
      name: 'Helper NPC',
      position: { x: 21, y: 17 },
      spriteKey: 'manu_idle',
      dialogueFile: 'challenge_field.json',
      scale: 1.5,
      showHoverAnimation: true
    });
  }

  /**
   * Scene shutdown lifecycle method
   * Called when the scene is shut down - clean up all resources
   * This is a Phaser best practice to prevent memory leaks
   */
  shutdown() {
    console.log('[SCENE] ProgrammingGame shutting down - cleaning up resources');
    
    // Clean up NPC manager
    if (this.npcManager) {
      this.npcManager.destroy();
    }
    
    // Clean up all sprites and visual elements
    this.cleanupAllSprites();
    
    // Remove all EventBus listeners for this scene
    EventBus.removeAllListeners('entity-removed');
    EventBus.removeAllListeners('grid-removed');
    EventBus.removeAllListeners('entity-movement-started');
    EventBus.removeAllListeners('entity-movement-completed');
    EventBus.removeAllListeners('request-smooth-movement');
    EventBus.removeAllListeners('request-movement-manager');
    EventBus.removeAllListeners('pan-camera-to');
    EventBus.removeAllListeners('tile-selected');
    EventBus.removeAllListeners('save-map');
    EventBus.removeAllListeners('load-map');
    EventBus.removeAllListeners('toggle-map-editor');
    EventBus.removeAllListeners('save-game-state');
    EventBus.removeAllListeners('load-game-state');
    EventBus.removeAllListeners('map-editor-debug-request');
    EventBus.removeAllListeners('farmland-grid-added');
    EventBus.removeAllListeners('farmland-grid-removed');
    EventBus.removeAllListeners('map-editor-loaded');

    console.log('[SCENE] ProgrammingGame shutdown complete');
  }
} 