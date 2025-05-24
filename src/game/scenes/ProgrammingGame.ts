import { Scene } from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import { GridSystem } from '../systems/GridSystem';
import { CodeExecutor } from '../systems/CodeExecutor';
import { BuiltInFunctionRegistry } from '../systems/BuiltInFunctions';
import { Entity, GridTile, Position } from '../../types/game';
import { EventBus } from '../EventBus';

export class ProgrammingGame extends Scene {
  private gameStore: ReturnType<typeof useGameStore.getState>;
  private gridSystem: GridSystem;
  private codeExecutor?: CodeExecutor;
  
  // Visual elements
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private entitySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private gridSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  // Constants
  private readonly GRID_SIZE = 32;
  private readonly GRID_COLOR = 0x444444;
  private readonly GRID_ALPHA = 0.3;

  constructor() {
    super({ key: 'ProgrammingGame' });
    this.gameStore = useGameStore.getState();
    this.gridSystem = new GridSystem();
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
    
    // Add some sample grids
    const miningTerminalId = store.addGrid({
      type: 'mining_terminal',
      position: { x: 3, y: 3 },
      name: 'Mining Terminal #1',
      description: 'A bitcoin mining terminal',
      functions: [],
      properties: {},
      state: {},
      isActive: true
    });
    
    const dynamoId = store.addGrid({
      type: 'dynamo',
      position: { x: 6, y: 3 },
      name: 'Power Dynamo',
      description: 'Manual energy generator',
      functions: [],
      properties: {},
      state: {},
      isActive: true
    });
    
    const walletId = store.addGrid({
      type: 'wallet',
      position: { x: 9, y: 3 },
      name: 'Storage Wallet',
      description: 'Secure bitcoin storage',
      functions: [],
      properties: {},
      state: {},
      isActive: true
    });
    
    // Update visual representation
    this.updateVisuals();
  }

  private setupCamera() {
    const gameState = useGameStore.getState();
    const { width, height } = gameState.gridSize;
    
    // Set world bounds
    this.cameras.main.setBounds(0, 0, width * this.GRID_SIZE, height * this.GRID_SIZE);
    
    // Follow the active entity
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    if (activeEntity) {
      const sprite = this.entitySprites.get(activeEntity.id);
      if (sprite) {
        this.cameras.main.startFollow(sprite);
      }
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
    } else {
      sprite.clearTint();
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
      this.gridSprites.set(grid.id, sprite);
    }
    
    // Update sprite based on grid state
    if (grid.state.isMining || grid.state.isCranking) {
      sprite.setTint(0xffff00); // Yellow tint for active state
    } else if (grid.state.bitcoinReady) {
      sprite.setTint(0x00ff00); // Green tint for ready state
    } else {
      sprite.clearTint();
    }
  }

  // Public methods for external control
  startCodeExecution() {
    console.log('ProgrammingGame.startCodeExecution() called');
    
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    console.log('gameState:', gameState);
    console.log('activeEntity:', activeEntity);
    console.log('codeWindows:', gameState.codeWindows);
    
    if (!activeEntity) {
      console.warn('No active entity for code execution');
      return;
    }
    
    const executionContext = {
      entity: activeEntity,
      availableFunctions: BuiltInFunctionRegistry.createFunctionMap(),
      globalVariables: {},
      isRunning: true,
      currentGrid: gameState.getGridAt(activeEntity.position)
    };
    
    console.log('executionContext:', executionContext);
    
    this.codeExecutor = new CodeExecutor(executionContext, this.gridSystem);
    this.codeExecutor.setUserFunctions(gameState.codeWindows);
    
    console.log('codeExecutor created, calling executeMain()');
    
    this.codeExecutor.executeMain().then(result => {
      console.log('Code execution result:', result);
      if (!result.success) {
        this.showExecutionError(result.message || 'Unknown error');
      }
    }).catch(error => {
      console.error('Code execution error:', error);
      this.showExecutionError(error.message || 'Unknown error');
    });
  }

  stopCodeExecution() {
    if (this.codeExecutor) {
      this.codeExecutor.stop();
      this.codeExecutor = undefined;
    }
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
  update() {
    const cursors = this.input.keyboard?.createCursorKeys();
    if (!cursors) return;
    
    const gameState = useGameStore.getState();
    const activeEntity = gameState.entities.get(gameState.activeEntityId);
    
    if (!activeEntity) return;
    
    // Manual movement controls for testing
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