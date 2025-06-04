import { Scene } from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import { GridTile, Position } from '../../types/game';
import { MapEditorState, TileData } from '../../types/mapEditor';
import { EventBus } from '../EventBus';

export interface GroundTileData {
  id: string;
  position: Position;
  tilesetX: number;
  tilesetY: number;
  frame: number;
}

export class MapEditor {
  private scene: Scene;
  private gameStore: ReturnType<typeof useGameStore.getState>;
  private state: MapEditorState;
  private tilesetSprite: Phaser.GameObjects.Sprite | null = null;
  private selectedTile: TileData | null = null;
  private _isActive: boolean = false;
  private groundTiles: Map<string, GroundTileData> = new Map();
  private groundTileSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private clickHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  
  // Constants
  private readonly TILE_SIZE = 16; // Each tile in the tileset is 16x16 pixels
  private readonly GAME_GRID_SIZE = 128; // The game grid size (each cell is 128x128 pixels)
  private readonly TILESET_COLUMNS = 16; // Number of columns in the Ground_Tileset.png
  private readonly TILESET_ROWS = 16; // Number of rows in the Ground_Tileset.png

  constructor(scene: Scene) {
    this.scene = scene;
    this.gameStore = useGameStore.getState();
    this.state = {
      isActive: false,
      selectedTile: null,
      tileset: {
        key: 'Ground_Tileset',
        tileSize: this.TILE_SIZE,
        columns: this.TILESET_COLUMNS,
        rows: this.TILESET_ROWS
      }
    };

    this.loadGroundTiles();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for tile selection from UI
    EventBus.on('map-editor-tile-selected', (tileData: TileData) => {
      this.selectTile(tileData);
      this.debug('Tile selected:', tileData);
    });

    // Listen for save/load requests
    EventBus.on('map-editor-save', () => {
      this.saveMap();
    });

    EventBus.on('map-editor-load', () => {
      this.loadMap();
    });
  }

  private ensureTilesetSprite(): void {
    if (!this.tilesetSprite && this.scene.textures.exists('Ground_Tileset')) {
      this.tilesetSprite = this.scene.add.sprite(-1000, -1000, 'Ground_Tileset');
      this.tilesetSprite.setVisible(false);
      this.debug('Tileset sprite created');
    }
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public activate(): void {
    this._isActive = true;
    this.ensureTilesetSprite();
    this.setupInputHandlers();
    this.renderGroundTiles();
    this.debug('Map editor activated');
    
    // Notify UI
    EventBus.emit('map-editor-activated', {
      tileset: this.state.tileset
    });
  }

  public deactivate(): void {
    this._isActive = false;
    this.removeInputHandlers();
    this.selectedTile = null;
    this.debug('Map editor deactivated');
    
    // Notify UI
    EventBus.emit('map-editor-deactivated');
  }

  private setupInputHandlers(): void {
    this.clickHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this._isActive || !this.selectedTile) return;

      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gridX = Math.floor(worldPoint.x / this.GAME_GRID_SIZE);
      const gridY = Math.floor(worldPoint.y / this.GAME_GRID_SIZE);

      // Check if click is within grid bounds
      const { width, height } = this.gameStore.gridSize;
      if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
        this.placeGroundTile({ x: gridX, y: gridY });
      }
    };

    this.scene.input.on('pointerdown', this.clickHandler);
  }

  private removeInputHandlers(): void {
    if (this.clickHandler) {
      this.scene.input.off('pointerdown', this.clickHandler);
      this.clickHandler = null;
    }
  }

  private placeGroundTile(position: Position): void {
    if (!this.selectedTile) {
      this.debug('No tile selected for placement');
      return;
    }

    const tileId = `ground_${position.x}_${position.y}`;
    
    // Remove existing ground tile if any
    this.removeGroundTile(position);

    // Create new ground tile data
    const groundTile: GroundTileData = {
      id: tileId,
      position,
      tilesetX: this.selectedTile.spriteX,
      tilesetY: this.selectedTile.spriteY,
      frame: this.selectedTile.frame
    };

    // Store ground tile data
    this.groundTiles.set(tileId, groundTile);

    // Create visual sprite
    this.createGroundTileSprite(groundTile);

    this.debug('Ground tile placed:', {
      position,
      tilesetCoords: { x: this.selectedTile.spriteX, y: this.selectedTile.spriteY },
      frame: this.selectedTile.frame
    });
  }

  private removeGroundTile(position: Position): void {
    const tileId = `ground_${position.x}_${position.y}`;
    const existingTile = this.groundTiles.get(tileId);
    
    if (existingTile) {
      // Remove sprite
      const sprite = this.groundTileSprites.get(tileId);
      if (sprite) {
        sprite.destroy();
        this.groundTileSprites.delete(tileId);
      }
      
      // Remove data
      this.groundTiles.delete(tileId);
      this.debug('Ground tile removed:', position);
    }
  }

  private createGroundTileSprite(groundTile: GroundTileData): void {
    if (!this.scene.textures.exists('Ground_Tileset')) {
      this.debug('ERROR: Ground_Tileset texture not found');
      return;
    }

    // Create sprite at the correct world position
    const worldX = groundTile.position.x * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;
    const worldY = groundTile.position.y * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;

    const sprite = this.scene.add.sprite(worldX, worldY, 'Ground_Tileset');
    
    // Set the specific frame from the tileset
    sprite.setFrame(groundTile.frame);
    
    // Scale the 16x16 tile to fill the 128x128 game grid
    const scale = this.GAME_GRID_SIZE / this.TILE_SIZE;
    sprite.setScale(scale);
    
    // Set pixel-perfect rendering
    sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    
    // Make it non-interactive and behind other sprites
    sprite.setDepth(-1);
    
    this.groundTileSprites.set(groundTile.id, sprite);
    
    this.debug('Ground tile sprite created:', {
      id: groundTile.id,
      worldPos: { x: worldX, y: worldY },
      scale,
      frame: groundTile.frame
    });
  }

  private renderGroundTiles(): void {
    // Render all existing ground tiles
    this.groundTiles.forEach(groundTile => {
      if (!this.groundTileSprites.has(groundTile.id)) {
        this.createGroundTileSprite(groundTile);
      }
    });
  }

  public selectTile(tileData: TileData): void {
    this.selectedTile = tileData;
    this.debug('Tile selected for painting:', tileData);
  }

  public saveMap(): void {
    const mapData = {
      version: '1.0',
      gridSize: this.gameStore.gridSize,
      groundTiles: Array.from(this.groundTiles.values()),
      gameGrids: Array.from(this.gameStore.grids.entries()).map(([id, tile]) => ({
        id,
        position: tile.position,
        type: tile.type,
        name: tile.name,
        description: tile.description,
        functions: tile.functions,
        properties: tile.properties,
        state: tile.state,
        isActive: tile.isActive,
        taskState: tile.taskState
      })),
      timestamp: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem('mapEditorData', JSON.stringify(mapData, null, 2));
    
    // Also save to download (for backup)
    this.downloadMapData(mapData);
    
    this.debug('Map saved successfully:', {
      groundTilesCount: this.groundTiles.size,
      gameGridsCount: this.gameStore.grids.size
    });
    
    // Notify UI
    EventBus.emit('map-editor-saved', { success: true });
  }

  public loadMap(): void {
    try {
      const savedData = localStorage.getItem('mapEditorData');
      if (!savedData) {
        this.debug('No saved map data found');
        return;
      }

      const mapData = JSON.parse(savedData);
      this.debug('Loading map data:', mapData);
      
      // Clear existing ground tiles
      this.clearAllGroundTiles();
      
      // Load ground tiles
      if (mapData.groundTiles) {
        mapData.groundTiles.forEach((tileData: GroundTileData) => {
          this.groundTiles.set(tileData.id, tileData);
        });
      }
      
      // Clear existing game grids
      this.gameStore.grids.forEach((_, id) => {
        this.gameStore.removeGrid(id);
      });

      // Load game grids
      if (mapData.gameGrids) {
        mapData.gameGrids.forEach((gridData: any) => {
          this.gameStore.addGrid({
            position: gridData.position,
            type: gridData.type,
            name: gridData.name,
            description: gridData.description,
            functions: gridData.functions || [],
            properties: gridData.properties || {},
            state: gridData.state || {},
            isActive: gridData.isActive !== false,
            taskState: gridData.taskState || {
              isBlocked: false,
              currentTask: undefined,
              progress: undefined
            }
          });
        });
      }

      // Render loaded ground tiles
      this.renderGroundTiles();
      
      this.debug('Map loaded successfully:', {
        groundTilesCount: this.groundTiles.size,
        gameGridsCount: this.gameStore.grids.size
      });
      
      // Notify UI
      EventBus.emit('map-editor-loaded', { success: true });
      
    } catch (error) {
      this.debug('ERROR loading map:', error);
      EventBus.emit('map-editor-loaded', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private loadGroundTiles(): void {
    // Try to load existing ground tiles from localStorage
    try {
      const savedData = localStorage.getItem('mapEditorData');
      if (savedData) {
        const mapData = JSON.parse(savedData);
        if (mapData.groundTiles) {
          mapData.groundTiles.forEach((tileData: GroundTileData) => {
            this.groundTiles.set(tileData.id, tileData);
          });
          this.debug('Loaded ground tiles from storage:', this.groundTiles.size);
        }
      }
    } catch (error) {
      this.debug('Error loading ground tiles:', error);
    }
  }

  private clearAllGroundTiles(): void {
    // Destroy all sprites
    this.groundTileSprites.forEach(sprite => {
      sprite.destroy();
    });
    
    // Clear collections
    this.groundTileSprites.clear();
    this.groundTiles.clear();
    
    this.debug('All ground tiles cleared');
  }

  private downloadMapData(mapData: any): void {
    const dataStr = JSON.stringify(mapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `map_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Debugging methods
  private debug(...args: any[]): void {
    console.log('[MapEditor]', ...args);
  }

  public getDebugInfo(): any {
    return {
      isActive: this._isActive,
      selectedTile: this.selectedTile,
      groundTilesCount: this.groundTiles.size,
      groundTileSpritesCount: this.groundTileSprites.size,
      tilesetLoaded: this.scene.textures.exists('Ground_Tileset'),
      constants: {
        TILE_SIZE: this.TILE_SIZE,
        GAME_GRID_SIZE: this.GAME_GRID_SIZE,
        TILESET_COLUMNS: this.TILESET_COLUMNS,
        TILESET_ROWS: this.TILESET_ROWS
      }
    };
  }

  public logDebugInfo(): void {
    this.debug('=== DEBUG INFO ===');
    const info = this.getDebugInfo();
    Object.entries(info).forEach(([key, value]) => {
      this.debug(`${key}:`, value);
    });
    this.debug('==================');
  }
} 