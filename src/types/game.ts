// Core Game Types
export interface Position {
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
}

// Progress and Task Management
export interface ProgressInfo {
  isActive: boolean;
  startTime: number;
  duration: number;
  description: string;
  entityId?: string;
}

export interface TaskState {
  isBlocked: boolean;
  currentTask?: string;
  progress?: ProgressInfo;
}

// Entity System
export interface EntityStats {
  walkingSpeed: number;
  energy: number;
  maxEnergy: number;
  harvestAmount?: number;
  plantingSpeedMultiplier?: number;
  [key: string]: number | undefined;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  position: Position;
  visualPosition?: Position;
  stats: EntityStats;
  inventory: Inventory;
  sprite?: Phaser.GameObjects.Sprite;
  isActive: boolean;
  taskState: TaskState;
  movementState?: {
    isMoving: boolean;
    fromPosition: Position;
    toPosition: Position;
    startTime?: number;
    duration?: number;
    tween?: Phaser.Tweens.Tween;
  };
  // Drone-specific properties
  isDrone?: boolean; // Indicates if this entity is a programmable drone
  codeWindows?: Map<string, CodeWindow>; // Drone's own code windows
  mainWindowId?: string; // Drone's main execution window
  isExecuting?: boolean; // Whether the drone is currently executing code
  spriteKey?: string; // Sprite key for rendering (e.g., 'drone_idle')
  scale?: number; // Visual scale factor
}

// Inventory System
export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  icon?: string;
  description?: string;
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
  requiresEntityOnGrid?: boolean;
  blocksEntity?: boolean;
  blocksGrid?: boolean;
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
  taskState: TaskState;
  isChallengeGrid?: boolean; // Indicates if this grid is part of a challenge (no manual movement allowed)
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
  blocksEntity?: boolean;
  blocksGrid?: boolean;
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
  category?: string;
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

// Grid State Enums for better type safety
export enum MiningTerminalState {
  IDLE = 'idle',
  INITIATING = 'initiating',
  MINING = 'mining',
  READY = 'ready'
}

export enum DynamoState {
  IDLE = 'idle',
  CRANKING = 'cranking'
}

export enum WalletState {
  IDLE = 'idle',
  STORING = 'storing'
}

// Farming State Enums
export enum FarmlandState {
  IDLE = 'idle',
  PLANTING = 'planting',
  GROWING = 'growing',
  READY = 'ready'
}

export enum FoodState {
  IDLE = 'idle',
  EATING = 'eating'
}

export enum SiloState {
  IDLE = 'idle',
  STORING = 'storing'
}

// NPC System Types
export interface NPCConfig {
  id: string;
  name: string;
  position: Position;
  spriteKey: string; // Base sprite key for idle animation (e.g., 'npc_manu')
  dialogueFile?: string; // Optional dialogue file to trigger on click
  scale?: number; // Optional scale factor (default 1.5 like Qubit)
  showHoverAnimation?: boolean; // Whether to show the hover animation (default true)
}

export interface NPC {
  id: string;
  name: string;
  position: Position;
  sprite?: Phaser.GameObjects.Sprite;
  hoverAnimation?: any; // Reference to hover animation instance
  config: NPCConfig;
}

// Drone System Types
export interface DroneConfig {
  id: string;
  name: string;
  position: Position;
  spriteKey: string; // Sprite for the drone (e.g., 'drone_idle')
  scale?: number; // Optional scale factor (default 1.5)
  showHoverAnimation?: boolean; // Whether to show hover animation (default true)
  stats?: Partial<EntityStats>; // Optional custom stats
}

export interface Drone extends Entity {
  isDrone: true;
  codeWindows: Map<string, CodeWindow>;
  mainWindowId: string;
  isExecuting: boolean;
  spriteKey: string;
  scale: number;
} 