// Core Game Types
export interface Position {
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
}

// Entity System
export interface EntityStats {
  walkingSpeed: number;
  energy: number;
  maxEnergy: number;
  [key: string]: number;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  position: Position;
  stats: EntityStats;
  inventory: Inventory;
  sprite?: Phaser.GameObjects.Sprite;
  isActive: boolean;
}

// Inventory System
export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  icon?: string;
  properties?: Record<string, any>;
}

export interface Inventory {
  items: InventoryItem[];
  capacity: number;
}

// Grid System
export interface GridFunction {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: 'number' | 'string' | 'boolean';
    required: boolean;
    default?: any;
  }>;
  execute: (entity: Entity, params: any[], grid: GridTile) => Promise<ExecutionResult>;
}

export interface GridTile {
  id: string;
  type: string;
  position: Position;
  name: string;
  description: string;
  functions: GridFunction[];
  properties: Record<string, any>;
  state: Record<string, any>;
  sprite?: Phaser.GameObjects.Sprite;
  isActive: boolean;
  energyRequired?: number;
}

// Code Execution System
export interface CodeWindow {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
  isActive: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface ExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  duration?: number;
  energyCost?: number;
}

export interface ExecutionContext {
  entity: Entity;
  currentGrid?: GridTile;
  availableFunctions: Map<string, Function>;
  globalVariables: Record<string, any>;
  isRunning: boolean;
}

// Game State
export interface GameState {
  // World
  gridSize: GridSize;
  grids: Map<string, GridTile>;
  
  // Entities
  entities: Map<string, Entity>;
  activeEntityId: string;
  
  // Code
  codeWindows: Map<string, CodeWindow>;
  mainWindowId: string;
  
  // Resources & Economy
  globalResources: Record<string, number>;
  
  // Execution
  executionContext?: ExecutionContext;
  
  // UI State
  selectedCodeWindow?: string;
  isPaused: boolean;
  gameSpeed: number;
}

// Built-in Function Types
export interface BuiltInFunction {
  name: string;
  description: string;
  category: 'movement' | 'interaction' | 'utility' | 'system';
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  execute: (context: ExecutionContext, ...params: any[]) => Promise<ExecutionResult>;
}

// Grid Type Definitions
export interface GridTypeDefinition {
  type: string;
  name: string;
  description: string;
  defaultProperties: Record<string, any>;
  defaultState: Record<string, any>;
  functions: Omit<GridFunction, 'execute'>[];
  spriteKey: string;
  energyRequired?: number;
}

// Events
export interface GameEvent {
  type: string;
  entityId?: string;
  gridId?: string;
  data?: any;
  timestamp: number;
}

// Resource Types
export interface Resource {
  id: string;
  name: string;
  type: string;
  value: number;
  icon?: string;
} 