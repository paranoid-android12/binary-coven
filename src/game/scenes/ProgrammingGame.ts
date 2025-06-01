import { Scene } from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import { GridSystem } from '../systems/GridSystem';
import { CodeExecutor } from '../systems/CodeExecutor';
import { BuiltInFunctionRegistry } from '../systems/BuiltInFunctions';
import { Entity, GridTile, Position } from '../../types/game';
import { EventBus } from '../EventBus';
import TaskManager from '../systems/TaskManager';

export class ProgrammingGame extends Scene {
  private gameStore: ReturnType<typeof useGameStore.getState>;
  private gridSystem: GridSystem;
  private codeExecutor?: CodeExecutor;
  private taskManager: TaskManager;
  
  // Visual elements
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private entitySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private gridSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private progressBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  
  // Camera controls
  private cameraKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key, A: Phaser.Input.Keyboard.Key, S: Phaser.Input.Keyboard.Key, D: Phaser.Input.Keyboard.Key };
  private isLockedToQubit: boolean = true;
  private cameraSpeed: number = 300;
  
  // Constants
  private readonly GRID_SIZE = 64;
  private readonly GRID_COLOR = 0x444444;
  private readonly GRID_ALPHA = 0.3;

  constructor() {
    super({ key: 'ProgrammingGame' });
    this.gameStore = useGameStore.getState();
    this.gridSystem = new GridSystem();
    this.taskManager = TaskManager.getInstance();
  }

  preload() {
    // Create simple colored rectangles as sprites for prototyping
    this.createPlaceholderSprites();
  }

  create() {
    // Initialize the game
    this.gameStore.initializeGame();
    
    // Create visual grid
    this.createVisualGrid();
    
    // Create some sample grids
    this.createSampleWorld();
    
    // Set up camera
    this.setupCamera();
    
    // Listen to game state changes
    this.setupStateListeners();
    
    // Create UI elements
    this.createUI();
    
    console.log('Programming Game Scene Created');
    
    // Emit event so React component can get scene reference
    EventBus.emit('current-scene-ready', this);
  }

  private createPlaceholderSprites() {
    // Create colored rectangles for different game objects
    const graphics = this.add.graphics();
    
    // Qubit (player entity) - Blue square
    graphics.fillStyle(0x4a90e2);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('qubit', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Mining Terminal - Yellow square
    graphics.fillStyle(0xf5a623);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('mining_terminal', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Dynamo - Green square
    graphics.fillStyle(0x7ed321);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('dynamo', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    // Wallet - Purple square
    graphics.fillStyle(0x9013fe);
    graphics.fillRect(0, 0, this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.generateTexture('wallet', this.GRID_SIZE - 4, this.GRID_SIZE - 4);
    graphics.clear();
    
    graphics.destroy();
  }

  private createVisualGrid() {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, this.GRID_COLOR, this.GRID_ALPHA);
    
    const gameState = useGameStore.getState();
    const { width, height } = gameState.gridSize;
    
    // Draw vertical lines
    for (let x = 0; x <= width; x++) {
      this.gridGraphics.lineBetween(
        x * this.GRID_SIZE, 
        0, 
        x * this.GRID_SIZE, 
        height * this.GRID_SIZE
      );
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= height; y++) {
      this.gridGraphics.lineBetween(
        0, 
        y * this.GRID_SIZE, 
        width * this.GRID_SIZE, 
        y * this.GRID_SIZE
      );
    }
  }

  private createSampleWorld() {
    const store = useGameStore.getState();
    
    // Add some sample grids with proper initialization
    const miningTerminalData = this.gridSystem.initializeGrid('mining_terminal', '');
    const miningTerminalId = store.addGrid({
      type: 'mining_terminal',
      position: { x: 8, y: 6 },
      name: 'Mining Terminal #1',
      description: 'A bitcoin mining terminal',
      properties: {},
      isActive: true,
      functions: miningTerminalData.functions || [],
      state: miningTerminalData.state || {},
      taskState: miningTerminalData.taskState || {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    });
    
    const dynamoData = this.gridSystem.initializeGrid('dynamo', '');
    const dynamoId = store.addGrid({
      type: 'dynamo',
      position: { x: 12, y: 6 },
      name: 'Power Dynamo',
      description: 'Manual energy generator',
      properties: {},
      isActive: true,
      functions: dynamoData.functions || [],
      state: dynamoData.state || {},
      taskState: dynamoData.taskState || {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    });
    
    const walletData = this.gridSystem.initializeGrid('wallet', '');
    const walletId = store.addGrid({
      type: 'wallet',
      position: { x: 16, y: 6 },
      name: 'Storage Wallet',
      description: 'Secure bitcoin storage',
      properties: {},
      isActive: true,
      functions: walletData.functions || [],
      state: walletData.state || {},
      taskState: walletData.taskState || {
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
    const targetZoom = baseZoom * 1.8; // Show more of the world than fits on screen
    
    camera.setZoom(targetZoom);
    
    // Center camera on the grid initially
    camera.centerOn(worldWidth / 2, worldHeight / 2);
    
    // Set up smooth camera following
    this.setupCameraControls();
    
    // Start following the active entity if available
    this.lockCameraToQubit();
  }

  private setupCameraControls() {
    // Set up WASD keys for camera movement
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    
    // Also set up arrow keys as backup
    this.cameraKeys = this.input.keyboard!.createCursorKeys();
    
    // Add event listeners for WASD manual camera movement only
    // Arrow keys will be handled in update() for qubit movement when locked
    this.input.keyboard!.on('keydown-W', () => this.unlockCamera());
    this.input.keyboard!.on('keydown-A', () => this.unlockCamera());
    this.input.keyboard!.on('keydown-S', () => this.unlockCamera());
    this.input.keyboard!.on('keydown-D', () => this.unlockCamera());
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
      sprite = this.add.sprite(
        entity.position.x * this.GRID_SIZE + this.GRID_SIZE / 2,
        entity.position.y * this.GRID_SIZE + this.GRID_SIZE / 2,
        entity.type
      );
      sprite.setDisplaySize(this.GRID_SIZE - 4, this.GRID_SIZE - 4);
      sprite.setInteractive();
      
      // Add click handler for entity
      sprite.on('pointerdown', () => {
        console.log('Entity clicked:', entity.name);
        EventBus.emit('entity-clicked', entity);
      });
      
      this.entitySprites.set(entity.id, sprite);
    } else {
      // Update position
      sprite.setPosition(
        entity.position.x * this.GRID_SIZE + this.GRID_SIZE / 2,
        entity.position.y * this.GRID_SIZE + this.GRID_SIZE / 2
      );
    }
    
    // Update sprite properties based on entity state
    if (entity.stats.energy <= 0) {
      sprite.setTint(0x888888); // Gray tint for low energy
    } else if (entity.taskState.isBlocked) {
      sprite.setTint(0xffaa00); // Orange tint for busy
    } else {
      sprite.clearTint();
    }

    // Update progress bar for entity
    this.updateProgressBar(entity.id, entity.taskState.progress, sprite.x, sprite.y - 40);
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
      
      // Add click handler for grid
      sprite.on('pointerdown', () => {
        console.log('Grid clicked:', grid.name);
        EventBus.emit('grid-clicked', grid);
      });
      
      this.gridSprites.set(grid.id, sprite);
    }
    
    // Update sprite based on grid state
    if (grid.state.isMining || grid.state.isCranking || grid.taskState.isBlocked) {
      sprite.setTint(0xffff00); // Yellow tint for active state
    } else if (grid.state.bitcoinReady) {
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
    
    // Emit execution stopped event
    EventBus.emit('code-execution-stopped');
  }

  private showExecutionError(message: string) {
    // Create error message display
    const errorText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `Execution Error:\n${message}`,
      {
        fontSize: '16px',
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
        align: 'center'
      }
    );
    
    errorText.setOrigin(0.5);
    errorText.setScrollFactor(0); // Keep fixed on screen
    
    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      errorText.destroy();
    });
  }

  // Manual control for testing (can be removed later)
  update(time: number, delta: number) {
    const cursors = this.input.keyboard?.createCursorKeys();
    if (!cursors) return;
    
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    // Handle camera movement when not locked to qubit
    if (!this.isLockedToQubit) {
      const camera = this.cameras.main;
      const moveSpeed = this.cameraSpeed * (delta / 1000); // Smooth movement based on delta time
      
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
      
      // Arrow keys also move camera when unlocked
      if (cursors.up!.isDown) {
        camera.scrollY -= moveSpeed;
      }
      if (cursors.down!.isDown) {
        camera.scrollY += moveSpeed;
      }
      if (cursors.left!.isDown) {
        camera.scrollX -= moveSpeed;
      }
      if (cursors.right!.isDown) {
        camera.scrollX += moveSpeed;
      }
    }
    
    if (!activeEntity) return;
    
    // Arrow key qubit movement (only when camera is locked and not in unlocked mode)
    if (this.isLockedToQubit) {
      if (Phaser.Input.Keyboard.JustDown(cursors.up!)) {
        gameState.moveEntity(activeEntity.id, { x: activeEntity.position.x, y: activeEntity.position.y - 1 });
      }
      if (Phaser.Input.Keyboard.JustDown(cursors.down!)) {
        gameState.moveEntity(activeEntity.id, { x: activeEntity.position.x, y: activeEntity.position.y + 1 });
      }
      if (Phaser.Input.Keyboard.JustDown(cursors.left!)) {
        gameState.moveEntity(activeEntity.id, { x: activeEntity.position.x - 1, y: activeEntity.position.y });
      }
      if (Phaser.Input.Keyboard.JustDown(cursors.right!)) {
        gameState.moveEntity(activeEntity.id, { x: activeEntity.position.x + 1, y: activeEntity.position.y });
      }
    }
  }
} 