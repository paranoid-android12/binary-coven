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
  tilesetKey: string;
  layer: number;
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
  
  // Map editor grid types
  private farmlandGrids: Map<string, Position> = new Map();
  private farmlandGridSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private wallGrids: Map<string, Position> = new Map();
  private wallGridSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private wallsVisible: boolean = false;
  private currentGridType: 'ground' | 'farmland' | 'wall' = 'ground';
  
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
      activeTileset: 'Ground_Tileset',
      selectedLayer: 1,
      tilesets: {
        'Ground_Tileset': {
          key: 'Ground_Tileset',
          name: 'Ground Tiles',
          tileSize: this.TILE_SIZE,
          columns: 25, // 400px ÷ 16px = 25 columns
          rows: 27    // 432px ÷ 16px = 27 rows
        },
        'Fence_Wood': {
          key: 'Fence_Wood',
          name: 'Fence Wood',
          tileSize: this.TILE_SIZE,
          columns: 12, // 192px ÷ 16px = 12 columns
          rows: 14     // 224px ÷ 16px = 14 rows
        },
        'Farmland_Grid': {
          key: 'editor_farmland',
          name: 'Farmland Grids',
          tileSize: this.GAME_GRID_SIZE,
          columns: 1,
          rows: 1
        },
        'Wall_Grid': {
          key: 'editor_wall',
          name: 'Wall Grids',
          tileSize: this.GAME_GRID_SIZE,
          columns: 1,
          rows: 1
        }
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

    // Listen for tileset changes
    EventBus.on('map-editor-tileset-changed', (tilesetKey: string) => {
      this.setActiveTileset(tilesetKey);
    });

    // Listen for layer changes
    EventBus.on('map-editor-layer-changed', (layer: number) => {
      this.setSelectedLayer(layer);
    });

    // Listen for save/load requests
    EventBus.on('map-editor-save', () => {
      this.saveMap();
    });

    EventBus.on('map-editor-load', () => {
      this.loadMap();
    });

    // Listen for wall visibility toggle
    EventBus.on('map-editor-toggle-walls', () => {
      this.toggleWallVisibility();
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
      tilesets: this.state.tilesets,
      activeTileset: this.state.activeTileset,
      selectedLayer: this.state.selectedLayer
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
      if (!this._isActive) return;

      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gridX = Math.floor(worldPoint.x / this.GAME_GRID_SIZE);
      const gridY = Math.floor(worldPoint.y / this.GAME_GRID_SIZE);

      // Check if click is within grid bounds
      const { width, height } = this.gameStore.gridSize;
      if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
        const position = { x: gridX, y: gridY };
        
        // Determine what to place based on active tileset
        if (this.state.activeTileset === 'Farmland_Grid') {
          this.toggleFarmlandGrid(position);
        } else if (this.state.activeTileset === 'Wall_Grid') {
          this.toggleWallGrid(position);
        } else if (this.selectedTile) {
          this.placeGroundTile(position);
        }
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

    const layer = this.state.selectedLayer;
    const tileId = `ground_${position.x}_${position.y}_${layer}`;
    
    // Remove existing ground tile on the same layer and position if any
    this.removeGroundTileAtLayer(position, layer);

    // Create new ground tile data
    const groundTile: GroundTileData = {
      id: tileId,
      position,
      tilesetX: this.selectedTile.spriteX,
      tilesetY: this.selectedTile.spriteY,
      frame: this.selectedTile.frame,
      tilesetKey: this.state.activeTileset,
      layer: layer
    };

    // Store ground tile data
    this.groundTiles.set(tileId, groundTile);

    // Create visual sprite
    this.createGroundTileSprite(groundTile);

    this.debug('Ground tile placed:', {
      position,
      layer,
      tileset: this.state.activeTileset,
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

  private removeGroundTileAtLayer(position: Position, layer: number): void {
    const tileId = `ground_${position.x}_${position.y}_${layer}`;
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
      this.debug('Ground tile removed at layer:', { position, layer });
    }
  }

  private createGroundTileSprite(groundTile: GroundTileData): void {
    if (!this.scene.textures.exists(groundTile.tilesetKey)) {
      this.debug('ERROR: Tileset texture not found:', groundTile.tilesetKey);
      return;
    }

    // Create sprite at the correct world position
    const worldX = groundTile.position.x * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;
    const worldY = groundTile.position.y * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;

    const sprite = this.scene.add.sprite(worldX, worldY, groundTile.tilesetKey);
    
    // Set the specific frame from the tileset
    sprite.setFrame(groundTile.frame);
    
    // Scale the 16x16 tile to fill the 128x128 game grid
    const scale = this.GAME_GRID_SIZE / this.TILE_SIZE;
    sprite.setScale(scale);
    
    // Set pixel-perfect rendering
    sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    
    // Set depth based on layer (higher layer = higher depth)
    // Base depth of -5, then add layer number to ensure proper layering
    sprite.setDepth(-5 + groundTile.layer);
    
    this.groundTileSprites.set(groundTile.id, sprite);
    
    this.debug('Ground tile sprite created:', {
      id: groundTile.id,
      worldPos: { x: worldX, y: worldY },
      scale,
      frame: groundTile.frame,
      tileset: groundTile.tilesetKey,
      layer: groundTile.layer,
      depth: -5 + groundTile.layer
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

  private toggleFarmlandGrid(position: Position): void {
    const gridId = `farmland_${position.x}_${position.y}`;
    
    if (this.farmlandGrids.has(gridId)) {
      // Remove existing farmland grid
      this.removeFarmlandGrid(position);
    } else {
      // Add new farmland grid
      this.addFarmlandGrid(position);
    }
  }

  private addFarmlandGrid(position: Position): void {
    const gridId = `farmland_${position.x}_${position.y}`;
    this.farmlandGrids.set(gridId, position);
    
    // Create visual sprite
    const worldX = position.x * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;
    const worldY = position.y * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;
    
    const sprite = this.scene.add.sprite(worldX, worldY, 'editor_farmland');
    sprite.setDisplaySize(this.GAME_GRID_SIZE - 4, this.GAME_GRID_SIZE - 4);
    sprite.setAlpha(0.5); // 50% opacity
    sprite.setDepth(0.5); // Above ground tiles, below regular grids
    
    this.farmlandGridSprites.set(gridId, sprite);
    
    this.debug('Farmland grid added:', position);
  }

  private removeFarmlandGrid(position: Position): void {
    const gridId = `farmland_${position.x}_${position.y}`;
    
    // Remove sprite
    const sprite = this.farmlandGridSprites.get(gridId);
    if (sprite) {
      sprite.destroy();
      this.farmlandGridSprites.delete(gridId);
    }
    
    // Remove data
    this.farmlandGrids.delete(gridId);
    
    this.debug('Farmland grid removed:', position);
  }

  private toggleWallGrid(position: Position): void {
    const gridId = `wall_${position.x}_${position.y}`;
    
    if (this.wallGrids.has(gridId)) {
      // Remove existing wall grid
      this.removeWallGrid(position);
    } else {
      // Add new wall grid
      this.addWallGrid(position);
    }
  }

  private addWallGrid(position: Position): void {
    const gridId = `wall_${position.x}_${position.y}`;
    this.wallGrids.set(gridId, position);
    
    // Create visual sprite
    const worldX = position.x * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;
    const worldY = position.y * this.GAME_GRID_SIZE + this.GAME_GRID_SIZE / 2;
    
    const sprite = this.scene.add.sprite(worldX, worldY, 'editor_wall');
    sprite.setDisplaySize(this.GAME_GRID_SIZE - 4, this.GAME_GRID_SIZE - 4);
    sprite.setDepth(0.5); // Above ground tiles, below regular grids
    sprite.setVisible(this.wallsVisible); // Respect wall visibility setting
    
    this.wallGridSprites.set(gridId, sprite);
    
    this.debug('Wall grid added:', position);
  }

  private removeWallGrid(position: Position): void {
    const gridId = `wall_${position.x}_${position.y}`;
    
    // Remove sprite
    const sprite = this.wallGridSprites.get(gridId);
    if (sprite) {
      sprite.destroy();
      this.wallGridSprites.delete(gridId);
    }
    
    // Remove data
    this.wallGrids.delete(gridId);
    
    this.debug('Wall grid removed:', position);
  }

  public toggleWallVisibility(): void {
    this.wallsVisible = !this.wallsVisible;
    
    // Update all wall sprites visibility
    this.wallGridSprites.forEach(sprite => {
      sprite.setVisible(this.wallsVisible);
    });
    
    this.debug('Wall visibility toggled:', this.wallsVisible);
  }

  // Utility method to check if a position has a wall (for collision detection)
  public hasWallAt(position: Position): boolean {
    const gridId = `wall_${position.x}_${position.y}`;
    return this.wallGrids.has(gridId);
  }

  // Utility method to check if a position has a farmland grid
  public hasFarmlandAt(position: Position): boolean {
    const gridId = `farmland_${position.x}_${position.y}`;
    return this.farmlandGrids.has(gridId);
  }

  public selectTile(tileData: TileData): void {
    this.selectedTile = tileData;
    this.debug('Tile selected for painting:', tileData);
  }

  public setActiveTileset(tilesetKey: string): void {
    if (this.state.tilesets[tilesetKey]) {
      this.state.activeTileset = tilesetKey;
      this.selectedTile = null; // Clear selection when switching tilesets
      this.debug('Active tileset changed to:', tilesetKey);
      
      // Notify UI of the tileset change
      EventBus.emit('map-editor-tileset-updated', {
        activeTileset: tilesetKey,
        tilesets: this.state.tilesets
      });
    }
  }

  public setSelectedLayer(layer: number): void {
    this.state.selectedLayer = layer;
    this.debug('Selected layer changed to:', layer);
  }

  public saveMap(): void {
    const mapData = {
      version: '1.0',
      gridSize: this.gameStore.gridSize,
      groundTiles: Array.from(this.groundTiles.values()),
      farmlandGrids: Array.from(this.farmlandGrids.values()),
      wallGrids: Array.from(this.wallGrids.values()),
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
      
      // Clear existing ground tiles and grids
      this.clearAllGroundTiles();
      this.clearAllFarmlandGrids();
      this.clearAllWallGrids();
      
      // Load ground tiles with backward compatibility
      if (mapData.groundTiles) {
        mapData.groundTiles.forEach((tileData: any) => {
          // Check if this is old format (missing layer and tilesetKey)
          if (!tileData.layer || !tileData.tilesetKey) {
            // Migrate old format to new format
            const migratedTile: GroundTileData = {
              ...tileData,
              tilesetKey: tileData.tilesetKey || 'Ground_Tileset', // Default to Ground_Tileset
              layer: tileData.layer || 1, // Default to layer 1
              id: tileData.id.includes('_1') ? tileData.id : `${tileData.id}_1` // Add layer suffix if missing
            };
            this.groundTiles.set(migratedTile.id, migratedTile);
            this.debug('Migrated old tile format:', { old: tileData, new: migratedTile });
          } else {
            // New format, use as is
            this.groundTiles.set(tileData.id, tileData);
          }
        });
      }
      
      // Load farmland grids
      if (mapData.farmlandGrids) {
        mapData.farmlandGrids.forEach((position: Position) => {
          this.addFarmlandGrid(position);
        });
      }
      
      // Load wall grids
      if (mapData.wallGrids) {
        mapData.wallGrids.forEach((position: Position) => {
          this.addWallGrid(position);
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

  private clearAllFarmlandGrids(): void {
    // Destroy all sprites
    this.farmlandGridSprites.forEach(sprite => {
      sprite.destroy();
    });
    
    // Clear collections
    this.farmlandGridSprites.clear();
    this.farmlandGrids.clear();
    
    this.debug('All farmland grids cleared');
  }

  private clearAllWallGrids(): void {
    // Destroy all sprites
    this.wallGridSprites.forEach(sprite => {
      sprite.destroy();
    });
    
    // Clear collections
    this.wallGridSprites.clear();
    this.wallGrids.clear();
    
    this.debug('All wall grids cleared');
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