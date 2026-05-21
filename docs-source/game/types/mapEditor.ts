export interface TilesetInfo {
  key: string;
  tileSize: number;
  columns: number;
  rows: number;
  name: string;
}

export interface TileData {
  type: string;
  spriteKey: string;
  frame: number;
  spriteX: number;
  spriteY: number;
  layer: number;
}

export interface MapEditorState {
  isActive: boolean;
  selectedTile: TileData | null;
  activeTileset: string;
  selectedLayer: number;
  tilesets: { [key: string]: TilesetInfo };
} 