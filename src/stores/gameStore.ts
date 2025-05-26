import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  GameState, 
  Entity, 
  GridTile, 
  CodeWindow, 
  Position, 
  ExecutionContext,
  InventoryItem,
  ExecutionResult
} from '../types/game';

interface GameStore extends GameState {
  // Grid Management
  addGrid: (grid: Omit<GridTile, 'id'>) => string;
  removeGrid: (gridId: string) => void;
  updateGrid: (gridId: string, updates: Partial<GridTile>) => void;
  getGridAt: (position: Position) => GridTile | undefined;
  
  // Entity Management
  addEntity: (entity: Omit<Entity, 'id'>) => string;
  removeEntity: (entityId: string) => void;
  updateEntity: (entityId: string, updates: Partial<Entity>) => void;
  moveEntity: (entityId: string, newPosition: Position) => boolean;
  setActiveEntity: (entityId: string) => void;
  
  // Code Window Management
  addCodeWindow: (window: Omit<CodeWindow, 'id'>) => string;
  removeCodeWindow: (windowId: string) => void;
  updateCodeWindow: (windowId: string, updates: Partial<CodeWindow>) => void;
  setMainWindow: (windowId: string) => void;
  
  // Inventory Management
  addToInventory: (entityId: string, item: InventoryItem) => boolean;
  removeFromInventory: (entityId: string, itemId: string, quantity?: number) => boolean;
  getInventoryItem: (entityId: string, itemId: string) => InventoryItem | undefined;
  
  // Resource Management
  addResource: (resourceType: string, amount: number) => void;
  consumeResource: (resourceType: string, amount: number) => boolean;
  getResource: (resourceType: string) => number;
  updateGlobalResources: (updates: Record<string, number>) => void;
  
  // Execution Management
  startExecution: (entityId: string) => void;
  stopExecution: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setGameSpeed: (speed: number) => void;
  
  // Game Control
  resetGame: () => void;
  initializeGame: () => void;
}

const createInitialState = (): GameState => ({
  gridSize: { width: 20, height: 15 },
  grids: new Map(),
  entities: new Map(),
  activeEntityId: '',
  codeWindows: new Map(),
  mainWindowId: '',
  globalResources: {
    bitcoin: 0,
    energy: 100,
    currency: 0
  },
  executionContext: undefined,
  selectedCodeWindow: undefined,
  isPaused: false,
  gameSpeed: 1.0
});

export const useGameStore = create<GameStore>()((set, get) => ({
  ...createInitialState(),

  // Grid Management
  addGrid: (gridData: Omit<GridTile, 'id'>) => {
    const id = uuidv4();
    const grid: GridTile = { ...gridData, id };
    
    set((state: GameState) => ({
      grids: new Map(state.grids).set(id, grid)
    }));
    
    return id;
  },

  removeGrid: (gridId: string) => {
    set((state: GameState) => {
      const newGrids = new Map(state.grids);
      newGrids.delete(gridId);
      return { grids: newGrids };
    });
  },

  updateGrid: (gridId: string, updates: Partial<GridTile>) => {
    set((state: GameState) => {
      const grid = state.grids.get(gridId);
      if (!grid) return state;
      
      const updatedGrid = { ...grid, ...updates };
      const newGrids = new Map(state.grids);
      newGrids.set(gridId, updatedGrid);
      
      return { grids: newGrids };
    });
  },

  getGridAt: (position: Position) => {
    const { grids } = get();
    return Array.from(grids.values()).find(
      grid => grid.position.x === position.x && grid.position.y === position.y
    );
  },

  // Entity Management
  addEntity: (entityData: Omit<Entity, 'id'>) => {
    const id = uuidv4();
    const entity: Entity = { ...entityData, id };
    
    set((state: GameState) => ({
      entities: new Map(state.entities).set(id, entity),
      activeEntityId: state.activeEntityId || id
    }));
    
    return id;
  },

  removeEntity: (entityId: string) => {
    set((state: GameState) => {
      const newEntities = new Map(state.entities);
      newEntities.delete(entityId);
      
      return {
        entities: newEntities,
        activeEntityId: state.activeEntityId === entityId ? '' : state.activeEntityId
      };
    });
  },

  updateEntity: (entityId: string, updates: Partial<Entity>) => {
    set((state: GameState) => {
      const entity = state.entities.get(entityId);
      if (!entity) return state;
      
      const updatedEntity = { ...entity, ...updates };
      const newEntities = new Map(state.entities);
      newEntities.set(entityId, updatedEntity);
      
      return { entities: newEntities };
    });
  },

  moveEntity: (entityId: string, newPosition: Position) => {
    const { entities, gridSize } = get();
    const entity = entities.get(entityId);
    
    if (!entity) return false;
    
    // Check bounds
    if (newPosition.x < 0 || newPosition.x >= gridSize.width ||
        newPosition.y < 0 || newPosition.y >= gridSize.height) {
      return false;
    }
    
    get().updateEntity(entityId, { position: newPosition });
    return true;
  },

  setActiveEntity: (entityId: string) => {
    set({ activeEntityId: entityId });
  },

  // Code Window Management
  addCodeWindow: (windowData: Omit<CodeWindow, 'id'>) => {
    const id = uuidv4();
    const window: CodeWindow = { ...windowData, id };
    
    set((state: GameState) => ({
      codeWindows: new Map(state.codeWindows).set(id, window),
      mainWindowId: windowData.isMain ? id : state.mainWindowId
    }));
    
    return id;
  },

  removeCodeWindow: (windowId: string) => {
    set((state: GameState) => {
      const newWindows = new Map(state.codeWindows);
      newWindows.delete(windowId);
      
      return {
        codeWindows: newWindows,
        mainWindowId: state.mainWindowId === windowId ? '' : state.mainWindowId
      };
    });
  },

  updateCodeWindow: (windowId: string, updates: Partial<CodeWindow>) => {
    set((state: GameState) => {
      const window = state.codeWindows.get(windowId);
      if (!window) return state;
      
      const updatedWindow = { ...window, ...updates };
      const newWindows = new Map(state.codeWindows);
      newWindows.set(windowId, updatedWindow);
      
      return { codeWindows: newWindows };
    });
  },

  setMainWindow: (windowId: string) => {
    const { codeWindows } = get();
    
    // Remove main flag from all windows
    codeWindows.forEach((window, id) => {
      if (window.isMain) {
        get().updateCodeWindow(id, { isMain: false });
      }
    });
    
    // Set new main window
    get().updateCodeWindow(windowId, { isMain: true });
    set({ mainWindowId: windowId });
  },

  // Inventory Management
  addToInventory: (entityId: string, item: InventoryItem) => {
    const { entities } = get();
    const entity = entities.get(entityId);
    
    if (!entity) return false;
    
    const existingItemIndex = entity.inventory.items.findIndex(
      inv => inv.id === item.id
    );
    
    const newInventory = { ...entity.inventory };
    
    if (existingItemIndex >= 0) {
      newInventory.items[existingItemIndex].quantity += item.quantity;
    } else {
      if (newInventory.items.length >= newInventory.capacity) {
        return false; // Inventory full
      }
      newInventory.items.push(item);
    }
    
    get().updateEntity(entityId, { inventory: newInventory });
    return true;
  },

  removeFromInventory: (entityId: string, itemId: string, quantity = 1) => {
    const { entities } = get();
    const entity = entities.get(entityId);
    
    if (!entity) return false;
    
    const itemIndex = entity.inventory.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return false;
    
    const newInventory = { ...entity.inventory };
    const item = newInventory.items[itemIndex];
    
    if (item.quantity <= quantity) {
      newInventory.items.splice(itemIndex, 1);
    } else {
      newInventory.items[itemIndex] = { ...item, quantity: item.quantity - quantity };
    }
    
    get().updateEntity(entityId, { inventory: newInventory });
    return true;
  },

  getInventoryItem: (entityId: string, itemId: string) => {
    const { entities } = get();
    const entity = entities.get(entityId);
    
    if (!entity) return undefined;
    
    return entity.inventory.items.find(item => item.id === itemId);
  },

  // Resource Management
  addResource: (resourceType: string, amount: number) => {
    set((state: GameState) => ({
      globalResources: {
        ...state.globalResources,
        [resourceType]: (state.globalResources[resourceType] || 0) + amount
      }
    }));
  },

  consumeResource: (resourceType: string, amount: number) => {
    const { globalResources } = get();
    const currentAmount = globalResources[resourceType] || 0;
    
    if (currentAmount < amount) return false;
    
    set((state: GameState) => ({
      globalResources: {
        ...state.globalResources,
        [resourceType]: currentAmount - amount
      }
    }));
    
    return true;
  },

  getResource: (resourceType: string) => {
    const { globalResources } = get();
    return globalResources[resourceType] || 0;
  },

  updateGlobalResources: (updates: Record<string, number>) => {
    set((state: GameState) => ({
      globalResources: {
        ...state.globalResources,
        ...updates
      }
    }));
  },

  // Execution Management
  startExecution: (entityId: string) => {
    const { entities } = get();
    const entity = entities.get(entityId);
    
    if (!entity) return;
    
    // Dynamically import to avoid circular dependency issues
    const { BuiltInFunctionRegistry } = require('../game/systems/BuiltInFunctions');
    
    const availableFunctions = BuiltInFunctionRegistry.createFunctionMap();
    console.log('Available functions:', availableFunctions.size, Array.from(availableFunctions.keys()));
    
    const executionContext: ExecutionContext = {
      entity,
      availableFunctions,
      globalVariables: {},
      isRunning: true
    };

    console.log('Starting execution', executionContext);
    
    set({ executionContext });
  },

  stopExecution: () => {
    set({ executionContext: undefined });
  },

  pauseGame: () => {
    set({ isPaused: true });
  },

  resumeGame: () => {
    set({ isPaused: false });
  },

  setGameSpeed: (speed: number) => {
    set({ gameSpeed: Math.max(0.1, Math.min(5.0, speed)) });
  },

  // Game Control
  resetGame: () => {
    set(createInitialState());
  },

  initializeGame: () => {
    const store = get();
    
    // Create main code window
    const mainWindowId = store.addCodeWindow({
      name: 'main',
      code: '# Main function - execution starts here\ndef main():\n    # Your code here\n    pass',
      isMain: true,
      isActive: true,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 }
    });
    
    // Create default qubit entity
    const qubitId = store.addEntity({
      name: 'Qubit',
      type: 'qubit',
      position: { x: 5, y: 5 },
      stats: {
        walkingSpeed: 1.0,
        energy: 100,
        maxEnergy: 100
      },
      inventory: {
        items: [],
        capacity: 10
      },
      isActive: true,
      taskState: {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    });
    
    console.log('Game initialized with main window:', mainWindowId, 'and qubit:', qubitId);
  }
})); 