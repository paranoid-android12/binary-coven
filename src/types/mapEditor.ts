export interface TilesetInfo {
  key: string;
  tileSize: number;
  columns: number;
  rows: number;
}

export interface TileData {
  type: string;
  spriteKey: string;
  frame: number;
  spriteX: number;
  spriteY: number;
}

export interface MapEditorState {
  isActive: boolean;
  selectedTile: TileData | null;
  tileset: TilesetInfo;
} 