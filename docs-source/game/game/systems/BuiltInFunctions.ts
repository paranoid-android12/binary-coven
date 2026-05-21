import { BuiltInFunction, ExecutionContext, ExecutionResult, Position } from '../../types/game';
import { useGameStore } from '../../stores/gameStore';
import GridSystem from './GridSystem';
import { EventBus } from '../EventBus';
import TaskManager from './TaskManager';

// Initialize grid system for scanner function
const gridSystem = new GridSystem();

// Helper function to sync context entity with game store
const syncContextEntity = (context: ExecutionContext): void => {
  const store = useGameStore.getState();
  const updatedEntity = store.entities.get(context.entity.id);
  if (updatedEntity) {
    // Update the context entity to match the game store
    Object.assign(context.entity, updatedEntity);
  }
};

// Helper function to get MovementManager from scene
const getMovementManager = (): any => {
  // Access the current scene via EventBus
  return new Promise((resolve) => {
    EventBus.emit('request-movement-manager', (movementManager: any) => {
      resolve(movementManager);
    });
  });
};

// Movement Functions
export const movementFunctions: BuiltInFunction[] = [
  {
    name: 'move_up',
    description: 'Move the entity one grid space up',
    category: 'movement',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const newPosition: Position = {
        x: entity.position.x,
        y: entity.position.y - 1
      };

      // Check bounds first
      const store = useGameStore.getState();
      const { width, height } = store.gridSize;
      if (newPosition.x < 0 || newPosition.x >= width || 
          newPosition.y < 0 || newPosition.y >= height) {
        const educationalError = {
          userFriendlyMessage: 'You tried to move outside the game world!',
          suggestion: 'Check your coordinates with get_position() or use smaller movement steps.',
          concept: 'coordinates',
          severity: 'warning' as const,
          explanation: 'The game world uses a grid system. X increases as you move right, Y increases as you move down. Start at (0,0)!'
        };
        return {
          success: false,
          message: educationalError.userFriendlyMessage,
          data: educationalError
        };
      }

      // Get MovementManager from scene and perform smooth movement
      return new Promise((resolve) => {
        EventBus.emit('request-smooth-movement', {
          entityId: entity.id,
          targetPosition: newPosition,
          callback: (success: boolean) => {
            if (success) {
              // Sync context entity with updated game store
              syncContextEntity(context);
              resolve({
                success: true,
                message: `Moved to (${newPosition.x}, ${newPosition.y})`,
                energyCost: 5,
                duration: 1000 / entity.stats.walkingSpeed
              });
            } else {
              resolve({
                success: false,
                message: 'Cannot move up - blocked or invalid position'
              });
            }
          }
        });
      });
    }
  },
  {
    name: 'move_down',
    description: 'Move the entity one grid space down',
    category: 'movement',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const newPosition: Position = {
        x: entity.position.x,
        y: entity.position.y + 1
      };

      // Check bounds first
      const store = useGameStore.getState();
      const { width, height } = store.gridSize;
      if (newPosition.x < 0 || newPosition.x >= width || 
          newPosition.y < 0 || newPosition.y >= height) {
        return {
          success: false,
          message: 'Cannot move down - out of bounds'
        };
      }

      // Get MovementManager from scene and perform smooth movement
      return new Promise((resolve) => {
        EventBus.emit('request-smooth-movement', {
          entityId: entity.id,
          targetPosition: newPosition,
          callback: (success: boolean) => {
            if (success) {
              syncContextEntity(context);
              resolve({
                success: true,
                message: `Moved to (${newPosition.x}, ${newPosition.y})`,
                energyCost: 5,
                duration: 1000 / entity.stats.walkingSpeed
              });
            } else {
              resolve({
                success: false,
                message: 'Cannot move down - blocked or invalid position'
              });
            }
          }
        });
      });
    }
  },
  {
    name: 'move_left',
    description: 'Move the entity one grid space left',
    category: 'movement',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const newPosition: Position = {
        x: entity.position.x - 1,
        y: entity.position.y
      };

      // Check bounds first
      const store = useGameStore.getState();
      const { width, height } = store.gridSize;
      if (newPosition.x < 0 || newPosition.x >= width || 
          newPosition.y < 0 || newPosition.y >= height) {
        return {
          success: false,
          message: 'Cannot move left - out of bounds'
        };
      }

      // Get MovementManager from scene and perform smooth movement
      return new Promise((resolve) => {
        EventBus.emit('request-smooth-movement', {
          entityId: entity.id,
          targetPosition: newPosition,
          callback: (success: boolean) => {
            if (success) {
              syncContextEntity(context);
              resolve({
                success: true,
                message: `Moved to (${newPosition.x}, ${newPosition.y})`,
                energyCost: 5,
                duration: 1000 / entity.stats.walkingSpeed
              });
            } else {
              resolve({
                success: false,
                message: 'Cannot move left - blocked or invalid position'
              });
            }
          }
        });
      });
    }
  },
  {
    name: 'move_right',
    description: 'Move the entity one grid space right',
    category: 'movement',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const newPosition: Position = {
        x: entity.position.x + 1,
        y: entity.position.y
      };

      // Check bounds first
      const store = useGameStore.getState();
      const { width, height } = store.gridSize;
      if (newPosition.x < 0 || newPosition.x >= width || 
          newPosition.y < 0 || newPosition.y >= height) {
        return {
          success: false,
          message: 'Cannot move right - out of bounds'
        };
      }

      // Get MovementManager from scene and perform smooth movement
      return new Promise((resolve) => {
        EventBus.emit('request-smooth-movement', {
          entityId: entity.id,
          targetPosition: newPosition,
          callback: (success: boolean) => {
            if (success) {
              syncContextEntity(context);
              resolve({
                success: true,
                message: `Moved to (${newPosition.x}, ${newPosition.y})`,
                energyCost: 5,
                duration: 1000 / entity.stats.walkingSpeed
              });
            } else {
              resolve({
                success: false,
                message: 'Cannot move right - blocked or invalid position'
              });
            }
          }
        });
      });
    }
  },
  {
    name: 'move_to',
    description: 'Move the entity to a specific grid position',
    category: 'movement',
    parameters: [
      {
        name: 'x',
        type: 'number',
        required: true,
        description: 'X coordinate to move to'
      },
      {
        name: 'y',
        type: 'number',
        required: true,
        description: 'Y coordinate to move to'
      }
    ],
    execute: async (context: ExecutionContext, x: number, y: number): Promise<ExecutionResult> => {
      const { entity } = context;
      
      if (typeof x !== 'number' || typeof y !== 'number') {
        return {
          success: false,
          message: 'Invalid coordinates - must be numbers'
        };
      }

      const newPosition: Position = { x: Math.floor(x), y: Math.floor(y) };
      
      // Calculate distance for energy cost and duration BEFORE moving
      const distance = Math.abs(entity.position.x - newPosition.x) + Math.abs(entity.position.y - newPosition.y);
      
      // Check bounds first
      const store = useGameStore.getState();
      const { width, height } = store.gridSize;
      if (newPosition.x < 0 || newPosition.x >= width || 
          newPosition.y < 0 || newPosition.y >= height) {
        return {
          success: false,
          message: `Cannot move to (${newPosition.x}, ${newPosition.y}) - out of bounds`
        };
      }

      // Get MovementManager from scene and perform smooth movement
      return new Promise((resolve) => {
        EventBus.emit('request-smooth-movement', {
          entityId: entity.id,
          targetPosition: newPosition,
          callback: (success: boolean) => {
            if (success) {
              // Sync context entity with updated game store
              syncContextEntity(context);
              
              resolve({
                success: true,
                message: `Moved to (${newPosition.x}, ${newPosition.y})`,
                energyCost: distance * 5,
                duration: (distance * 1000) / entity.stats.walkingSpeed
              });
            } else {
              resolve({
                success: false,
                message: `Cannot move to (${newPosition.x}, ${newPosition.y}) - blocked or invalid position`
              });
            }
          }
        });
      });
    }
  }
];

// Interaction Functions
export const interactionFunctions: BuiltInFunction[] = [
  {
    name: 'plant',
    description: 'Plant crops on the current farmland',
    category: 'interaction',
    parameters: [
      {
        name: 'crop_type',
        type: 'string',
        required: false,
        description: 'Type of crop to plant (default: wheat)'
      }
    ],
    execute: async (context: ExecutionContext, cropType?: string): Promise<ExecutionResult> => {
      const { entity } = context;
      const store = useGameStore.getState();
      
      // Ensure we have the latest entity position from the game store
      const latestEntity = store.entities.get(entity.id);
      if (!latestEntity) {
        return {
          success: false,
          message: 'Entity not found in game store'
        };
      }
      
      // Update context entity with latest data
      syncContextEntity(context);
      
      // Use the latest position to find the grid
      const grid = store.getGridAt(latestEntity.position);

      if (!grid) {
        return {
          success: false,
          message: `No grid found at current position (${latestEntity.position.x}, ${latestEntity.position.y}). Make sure you're standing on a farmland.`
        };
      }

      if (grid.type !== 'farmland') {
        return {
          success: false,
          message: 'Can only plant crops on farmland'
        };
      }

      const result = await gridSystem.executeGridFunction(grid.id, 'plant', latestEntity, [cropType || 'wheat']);

      // Emit event for quest tracking if plant was successful
      if (result.success) {
        EventBus.emit('entity-plant', {
          entityId: latestEntity.id,
          entityType: latestEntity.type,
          cropType: cropType || 'wheat',
          position: latestEntity.position
        });
      }

      // Check if the grid function blocks the entity and propagate the flag
      const gridFunction = grid.functions.find(f => f.name === 'plant');
      if (gridFunction?.blocksEntity && result.success) {
        result.blocksEntity = true;
      }

      // Sync context entity with updated game store after grid function
      syncContextEntity(context);

      return result;
    }
  },
  {
    name: 'harvest',
    description: 'Harvest crops from the current farmland',
    category: 'interaction',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const store = useGameStore.getState();
      
      // Ensure we have the latest entity position from the game store
      const latestEntity = store.entities.get(entity.id);
      if (!latestEntity) {
        return {
          success: false,
          message: 'Entity not found in game store'
        };
      }
      
      // Update context entity with latest data
      syncContextEntity(context);
      
      // Use the latest position to find the grid
      const grid = store.getGridAt(latestEntity.position);

      if (!grid) {
        return {
          success: false,
          message: `No grid found at current position (${latestEntity.position.x}, ${latestEntity.position.y})`
        };
      }

      if (grid.type !== 'farmland') {
        return {
          success: false,
          message: 'Can only harvest crops from farmland'
        };
      }

      const result = await gridSystem.executeGridFunction(grid.id, 'harvest', latestEntity);

      // Emit event for quest tracking if harvest was successful
      if (result.success) {
        EventBus.emit('entity-harvest', {
          entityId: latestEntity.id,
          entityType: latestEntity.type,
          position: latestEntity.position
        });
      }

      // Check if the grid function blocks the entity and propagate the flag
      const gridFunction = grid.functions.find(f => f.name === 'harvest');
      if (gridFunction?.blocksEntity && result.success) {
        result.blocksEntity = true;
      }

      // Sync context entity with updated game store after grid function
      syncContextEntity(context);
      
      return result;
    }
  },
  {
    name: 'eat',
    description: 'Eat food to restore energy at the current food station',
    category: 'interaction',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const store = useGameStore.getState();
      const grid = store.getGridAt(entity.position);

      if (!grid) {
        return {
          success: false,
          message: 'No grid found at current position'
        };
      }

      if (grid.type !== 'food') {
        return {
          success: false,
          message: 'Can only eat at food stations'
        };
      }

      const result = await gridSystem.executeGridFunction(grid.id, 'eat', entity);
      
      // Check if the grid function blocks the entity and propagate the flag
      const gridFunction = grid.functions.find(f => f.name === 'eat');
      if (gridFunction?.blocksEntity && result.success) {
        result.blocksEntity = true;
      }
      
      // Sync context entity with updated game store after grid function
      syncContextEntity(context);
      
      return result;
    }
  },
  {
    name: 'store',
    description: 'Store items from inventory to the current silo',
    category: 'interaction',
    parameters: [
      {
        name: 'item_type',
        type: 'string',
        required: true,
        description: 'Type of item to store'
      },
      {
        name: 'amount',
        type: 'number',
        required: false,
        description: 'Amount to store (default: 1)'
      }
    ],
    execute: async (context: ExecutionContext, itemType: string, amount?: number): Promise<ExecutionResult> => {
      const { entity } = context;
      const store = useGameStore.getState();
      const grid = store.getGridAt(entity.position);

      if (!grid) {
        return {
          success: false,
          message: 'No grid found at current position'
        };
      }

      if (grid.type !== 'silo') {
        return {
          success: false,
          message: 'Can only store items at storage silos'
        };
      }

      const result = await gridSystem.executeGridFunction(grid.id, 'store', entity, [itemType, amount || 1]);
      
      // Check if the grid function blocks the entity and propagate the flag
      const gridFunction = grid.functions.find(f => f.name === 'store');
      if (gridFunction?.blocksEntity && result.success) {
        result.blocksEntity = true;
      }
      
      // Sync context entity with updated game store after grid function
      syncContextEntity(context);
      
      return result;
    }
  },
  {
    name: 'get_current_grid',
    description: 'Get information about the grid the entity is currently standing on',
    category: 'interaction',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const store = useGameStore.getState();
      const grid = store.getGridAt(entity.position);

      if (grid) {
        return {
          success: true,
          message: `Standing on ${grid.name}`,
          data: {
            gridType: grid.type,
            gridName: grid.name,
            description: grid.description,
            availableFunctions: grid.functions.map(f => f.name),
            position: grid.position
          }
        };
      } else {
        return {
          success: true,
          message: 'Standing on empty ground',
          data: {
            gridType: 'empty',
            position: entity.position
          }
        };
      }
    }
  },
  {
    name: 'get_position',
    description: 'Get the current position of the entity',
    category: 'utility',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      return {
        success: true,
        message: `Current position: (${entity.position.x}, ${entity.position.y})`,
        data: { position: entity.position }
      };
    }
  },
  {
    name: 'get_energy',
    description: 'Get the current energy level of the entity',
    category: 'utility',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      return {
        success: true,
        message: `Energy: ${entity.stats.energy}/${entity.stats.maxEnergy}`,
        data: { 
          energy: entity.stats.energy,
          maxEnergy: entity.stats.maxEnergy,
          energyPercentage: (entity.stats.energy / entity.stats.maxEnergy) * 100
        }
      };
    }
  },
  {
    name: 'get_inventory',
    description: 'Get the global resources (wheat, etc.)',
    category: 'utility',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const store = useGameStore.getState();
      const globalResources = store.globalResources;

      return {
        success: true,
        message: `Global Resources - Wheat: ${globalResources.wheat || 0}`,
        data: globalResources
      };
    }
  },
  {
    name: 'debug_grid_info',
    description: 'Debug function to show current position and nearby grids',
    category: 'utility',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const store = useGameStore.getState();
      
      // Get current position
      const currentPos = entity.position;
      const currentGrid = store.getGridAt(currentPos);
      
      // Get all grids for debugging
      const allGrids = Array.from(store.grids.values()).map(grid => ({
        id: grid.id,
        type: grid.type,
        name: grid.name,
        position: grid.position
      }));
      
      // Find nearby grids (within 2 units)
      const nearbyGrids = allGrids.filter(grid => {
        const dx = Math.abs(grid.position.x - currentPos.x);
        const dy = Math.abs(grid.position.y - currentPos.y);
        return dx <= 2 && dy <= 2;
      });
      
      return {
        success: true,
        message: `Debug info for position (${currentPos.x}, ${currentPos.y})`,
        data: {
          currentPosition: currentPos,
          currentGrid: currentGrid ? {
            id: currentGrid.id,
            type: currentGrid.type,
            name: currentGrid.name,
            position: currentGrid.position
          } : null,
          nearbyGrids: nearbyGrids,
          totalGrids: allGrids.length
        }
      };
    }
  },
  {
    name: 'can_harvest',
    description: 'Check if the current farmland grid can be harvested',
    category: 'interaction',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      const store = useGameStore.getState();
      
      // Ensure we have the latest entity position from the game store
      const latestEntity = store.entities.get(entity.id);
      if (!latestEntity) {
        return {
          success: true,
          message: 'Entity not found',
          data: false
        };
      }
      
      // Update context entity with latest data
      syncContextEntity(context);
      
      // Use the latest position to find the grid
      const grid = store.getGridAt(latestEntity.position);

      // Return false if no grid found at current position
      if (!grid) {
        return {
          success: true,
          message: 'Not standing on any grid',
          data: false
        };
      }

      // Return false if not standing on farmland
      if (grid.type !== 'farmland') {
        return {
          success: true,
          message: 'Not standing on farmland',
          data: false
        };
      }

      // Check if farmland has crops ready for harvest
      // A farmland can be harvested if:
      // 1. It has the status 'ready' (meaning crops are fully grown)
      // 2. There's no active task blocking it
      const canHarvest = grid.state.status === 'ready' && !grid.taskState.isBlocked;

      return {
        success: true,
        message: canHarvest ? 'Farmland can be harvested' : 'Farmland cannot be harvested',
        data: canHarvest
      };
    }
  },
  {
    name: 'debug_farmland_states',
    description: 'Debug function to show all farmland states and active tasks',
    category: 'utility',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const store = useGameStore.getState();
      const taskManager = TaskManager.getInstance();
      
      // Get all farmland grids
      const farmlands = Array.from(store.grids.values()).filter(grid => grid.type === 'farmland');
      
      const farmlandInfo = farmlands.map(grid => ({
        id: grid.id,
        position: grid.position,
        state: grid.state,
        taskState: grid.taskState,
        progress: taskManager.getGridProgress(grid.id),
        remainingTime: taskManager.getRemainingTime(undefined, grid.id)
      }));
      
      console.log('Farmland Debug Info:', farmlandInfo);
      
      return {
        success: true,
        message: `Found ${farmlands.length} farmlands. Check console for details.`
      };
    }
  }
];

// System Functions
export const systemFunctions: BuiltInFunction[] = [
  {
    name: 'wait',
    description: 'Wait for a specified number of seconds',
    category: 'system',
    parameters: [
      {
        name: 'seconds',
        type: 'number',
        required: true,
        description: 'Number of seconds to wait'
      }
    ],
    execute: async (context: ExecutionContext, seconds: number): Promise<ExecutionResult> => {
      if (typeof seconds !== 'number' || seconds < 0) {
        return {
          success: false,
          message: 'Invalid wait time - must be a positive number'
        };
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: `Waited for ${seconds} seconds`,
            duration: seconds * 1000
          });
        }, seconds * 1000);
      });
    }
  },
  {
    name: 'sleep',
    description: 'Sleep for a specified number of milliseconds',
    category: 'system',
    parameters: [
      {
        name: 'milliseconds',
        type: 'number',
        required: true,
        description: 'Number of milliseconds to sleep'
      }
    ],
    execute: async (context: ExecutionContext, milliseconds: number): Promise<ExecutionResult> => {
      if (typeof milliseconds !== 'number' || milliseconds < 0) {
        return {
          success: false,
          message: 'Invalid sleep time - must be a positive number'
        };
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: `Slept for ${milliseconds} milliseconds`,
            duration: milliseconds
          });
        }, milliseconds);
      });
    }
  },
  {
    name: 'print',
    description: 'Print a message to the console',
    category: 'system',
    parameters: [
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'Message to print'
      }
    ],
    execute: async (context: ExecutionContext, message: string): Promise<ExecutionResult> => {
      console.log(`[${context.entity.name}]: ${message}`);
      return {
        success: true,
        message: `Printed: ${message}`,
        data: { message }
      };
    }
  }
];

// Array Functions
export const arrayFunctions: BuiltInFunction[] = [
  {
    name: 'append',
    description: 'Add an item to the end of a list',
    category: 'utility',
    parameters: [
      { name: 'list', type: 'any[]', required: true, description: 'The list to append to' },
      { name: 'item', type: 'any', required: true, description: 'The item to add' }
    ],
    execute: async (context: ExecutionContext, list: any[], item: any): Promise<ExecutionResult> => {
      if (!Array.isArray(list)) {
        return {
          success: false,
          message: 'append() requires a list as the first argument',
          data: {
            userFriendlyMessage: 'You need to pass a list to append()!',
            suggestion: 'Create a list like: my_list = [1, 2, 3], then append to it.',
            concept: 'arrays',
            severity: 'error' as const,
            explanation: 'Lists (arrays) store multiple values. You can add items with append() or access them by index.'
          }
        };
      }

      list.push(item);
      return {
        success: true,
        message: `Added ${item} to the list. List now has ${list.length} items.`,
        data: list
      };
    }
  },
  {
    name: 'pop',
    description: 'Remove and return the last item from a list',
    category: 'utility',
    parameters: [
      { name: 'list', type: 'any[]', required: true, description: 'The list to pop from' }
    ],
    execute: async (context: ExecutionContext, list: any[]): Promise<ExecutionResult> => {
      if (!Array.isArray(list)) {
        return {
          success: false,
          message: 'pop() requires a list as the argument',
          data: {
            userFriendlyMessage: 'pop() only works with lists!',
            suggestion: 'Make sure you\'re calling pop() on a list variable.',
            concept: 'arrays',
            severity: 'error' as const,
            explanation: 'pop() removes the last item from a list and returns it. The list becomes shorter!'
          }
        };
      }

      if (list.length === 0) {
        return {
          success: false,
          message: 'Cannot pop from an empty list',
          data: {
            userFriendlyMessage: 'The list is empty!',
            suggestion: 'Add some items to the list before trying to pop them.',
            concept: 'arrays',
            severity: 'warning' as const,
            explanation: 'You can\'t remove items from an empty list. Check the list length first!'
          }
        };
      }

      const item = list.pop();
      return {
        success: true,
        message: `Removed ${item} from the list. List now has ${list.length} items.`,
        data: item
      };
    }
  },
  {
    name: 'get',
    description: 'Get an item from a list by index (safe access)',
    category: 'utility',
    parameters: [
      { name: 'list', type: 'any[]', required: true, description: 'The list to get from' },
      { name: 'index', type: 'number', required: true, description: 'The index to get (0-based)' }
    ],
    execute: async (context: ExecutionContext, list: any[], index: number): Promise<ExecutionResult> => {
      if (!Array.isArray(list)) {
        return {
          success: false,
          message: 'get() requires a list as the first argument',
          data: {
            userFriendlyMessage: 'get() only works with lists!',
            suggestion: 'Make sure your first argument is a list variable.',
            concept: 'arrays',
            severity: 'error' as const,
            explanation: 'Lists store items at numbered positions (indices). Index 0 is the first item!'
          }
        };
      }

      if (typeof index !== 'number' || !Number.isInteger(index)) {
        return {
          success: false,
          message: 'get() requires an integer index',
          data: {
            userFriendlyMessage: 'Index must be a whole number!',
            suggestion: 'Use numbers like 0, 1, 2... for list indices.',
            concept: 'arrays',
            severity: 'error' as const,
            explanation: 'List indices are whole numbers starting from 0. Index 0 = first item, index 1 = second item.'
          }
        };
      }

      if (index < 0 || index >= list.length) {
        return {
          success: false,
          message: `Index ${index} is out of range (list has ${list.length} items)`,
          data: {
            userFriendlyMessage: 'That index doesn\'t exist in the list!',
            suggestion: `Use indices from 0 to ${list.length - 1}. Check list length with len().`,
            concept: 'arrays',
            severity: 'warning' as const,
            explanation: 'Lists have a specific number of items. You can only access valid indices!'
          }
        };
      }

      return {
        success: true,
        message: `Got ${list[index]} from index ${index}`,
        data: list[index]
      };
    }
  },
  {
    name: 'find',
    description: 'Find the index of an item in a list, or -1 if not found',
    category: 'utility',
    parameters: [
      { name: 'list', type: 'any[]', required: true, description: 'The list to search in' },
      { name: 'item', type: 'any', required: true, description: 'The item to find' }
    ],
    execute: async (context: ExecutionContext, list: any[], item: any): Promise<ExecutionResult> => {
      if (!Array.isArray(list)) {
        return {
          success: false,
          message: 'find() requires a list as the first argument',
          data: {
            userFriendlyMessage: 'find() only works with lists!',
            suggestion: 'Make sure your first argument is a list variable.',
            concept: 'arrays',
            severity: 'error' as const,
            explanation: 'find() searches through a list to locate a specific item and returns its position.'
          }
        };
      }

      const index = list.indexOf(item);
      return {
        success: true,
        message: index !== -1 ? `Found ${item} at index ${index}` : `${item} not found in list`,
        data: index
      };
    }
  },
  {
    name: 'slice',
    description: 'Get a portion of a list (start to end, not including end)',
    category: 'utility',
    parameters: [
      { name: 'list', type: 'any[]', required: true, description: 'The list to slice' },
      { name: 'start', type: 'number', required: false, description: 'Start index (default: 0)' },
      { name: 'end', type: 'number', required: false, description: 'End index (default: list length)' }
    ],
    execute: async (context: ExecutionContext, list: any[], start: number = 0, end?: number): Promise<ExecutionResult> => {
      if (!Array.isArray(list)) {
        return {
          success: false,
          message: 'slice() requires a list as the first argument',
          data: {
            userFriendlyMessage: 'slice() only works with lists!',
            suggestion: 'Make sure your first argument is a list variable.',
            concept: 'arrays',
            severity: 'error' as const,
            explanation: 'slice() creates a new list with a portion of the original. It doesn\'t modify the original list.'
          }
        };
      }

      const startIndex = start || 0;
      const endIndex = end !== undefined ? end : list.length;

      if (startIndex < 0 || startIndex > list.length || endIndex < startIndex || endIndex > list.length) {
        return {
          success: false,
          message: 'Invalid slice indices',
          data: {
            userFriendlyMessage: 'Those slice indices don\'t work!',
            suggestion: `Valid indices are 0 to ${list.length}. Start must be less than or equal to end.`,
            concept: 'arrays',
            severity: 'error' as const,
            explanation: 'Slice indices must be valid positions in the list. Start comes before end!'
          }
        };
      }

      const sliced = list.slice(startIndex, endIndex);
      return {
        success: true,
        message: `Sliced list from index ${startIndex} to ${endIndex - 1} (${sliced.length} items)`,
        data: sliced
      };
    }
  }
];

// Object/Dictionary Functions
export const objectFunctions: BuiltInFunction[] = [
  {
    name: 'get_property',
    description: 'Get a property from an object',
    category: 'utility',
    parameters: [
      { name: 'obj', type: 'object', required: true, description: 'The object to get from' },
      { name: 'property', type: 'string', required: true, description: 'The property name' }
    ],
    execute: async (context: ExecutionContext, obj: any, property: string): Promise<ExecutionResult> => {
      if (typeof obj !== 'object' || obj === null) {
        return {
          success: false,
          message: 'get_property() requires an object as the first argument',
          data: {
            userFriendlyMessage: 'get_property() only works with objects!',
            suggestion: 'Pass an object like: {"name": "Bob", "age": 25}',
            concept: 'objects',
            severity: 'error' as const,
            explanation: 'Objects store data in key-value pairs. You access values using their keys.'
          }
        };
      }

      if (!(property in obj)) {
        return {
          success: false,
          message: `Property '${property}' not found in object`,
          data: {
            userFriendlyMessage: 'That property doesn\'t exist!',
            suggestion: 'Check the object\'s properties with print() or use valid property names.',
            concept: 'objects',
            severity: 'warning' as const,
            explanation: 'Objects only have the properties you define. Make sure you spelled the property name correctly!'
          }
        };
      }

      return {
        success: true,
        message: `Got ${obj[property]} from property '${property}'`,
        data: obj[property]
      };
    }
  },
  {
    name: 'set_property',
    description: 'Set a property on an object',
    category: 'utility',
    parameters: [
      { name: 'obj', type: 'object', required: true, description: 'The object to modify' },
      { name: 'property', type: 'string', required: true, description: 'The property name' },
      { name: 'value', type: 'any', required: true, description: 'The value to set' }
    ],
    execute: async (context: ExecutionContext, obj: any, property: string, value: any): Promise<ExecutionResult> => {
      if (typeof obj !== 'object' || obj === null) {
        return {
          success: false,
          message: 'set_property() requires an object as the first argument',
          data: {
            userFriendlyMessage: 'set_property() only works with objects!',
            suggestion: 'Pass an object like: {"name": "Bob", "age": 25}',
            concept: 'objects',
            severity: 'error' as const,
            explanation: 'Objects store data that you can read and modify. You can add new properties or change existing ones.'
          }
        };
      }

      obj[property] = value;
      return {
        success: true,
        message: `Set property '${property}' to ${value}`,
        data: obj
      };
    }
  },
  {
    name: 'get_keys',
    description: 'Get all property names (keys) from an object',
    category: 'utility',
    parameters: [
      { name: 'obj', type: 'object', required: true, description: 'The object to get keys from' }
    ],
    execute: async (context: ExecutionContext, obj: any): Promise<ExecutionResult> => {
      if (typeof obj !== 'object' || obj === null) {
        return {
          success: false,
          message: 'get_keys() requires an object as the argument',
          data: {
            userFriendlyMessage: 'get_keys() only works with objects!',
            suggestion: 'Pass an object like: {"name": "Bob", "age": 25}',
            concept: 'objects',
            severity: 'error' as const,
            explanation: 'Objects have keys (property names) and values. Keys are like labels for the data stored in objects.'
          }
        };
      }

      const keys = Object.keys(obj);
      return {
        success: true,
        message: `Found ${keys.length} properties: ${keys.join(', ')}`,
        data: keys
      };
    }
  }
];

// Advanced Control Flow Functions
export const controlFlowFunctions: BuiltInFunction[] = [
  {
    name: 'break',
    description: 'Exit from the current loop immediately',
    category: 'system',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      return {
        success: true,
        message: 'Breaking out of loop',
        data: { controlFlow: 'break' }
      };
    }
  },
  {
    name: 'continue',
    description: 'Skip to the next iteration of the current loop',
    category: 'system',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      return {
        success: true,
        message: 'Continuing to next loop iteration',
        data: { controlFlow: 'continue' }
      };
    }
  }
];

// Utility Functions
export const utilityFunctions: BuiltInFunction[] = [
  {
    name: 'scanner',
    description: 'Scan a grid at specific coordinates to check its state',
    category: 'utility',
    parameters: [
      { name: 'x', type: 'number', required: true, description: 'X coordinate to scan' },
      { name: 'y', type: 'number', required: true, description: 'Y coordinate to scan' }
    ],
    execute: async (context: ExecutionContext, x: number, y: number): Promise<ExecutionResult> => {
      const store = useGameStore.getState();
      const grid = store.getGridAt({ x, y });
      
      if (!grid) {
        return {
          success: true,
          message: `No grid found at (${x}, ${y})`,
          data: { empty: true, position: { x, y } }
        };
      }
      
      // Get detailed grid status using GridSystem
      const gridStatus = gridSystem.getGridStatus(grid);
      
      return {
        success: true,
        message: `Scanned ${grid.name} at (${x}, ${y})`,
        data: {
          name: grid.name,
          type: grid.type,
          position: { x, y },
          status: gridStatus,
          functions: grid.functions.map(f => f.name)
        },
        energyCost: 2
      };
    }
  },
  {
    name: 'range',
    description: 'Generate a sequence of numbers (Python-like range function)',
    category: 'utility',
    parameters: [
      { name: 'start_or_stop', type: 'number', required: true, description: 'Start value (if two args) or stop value (if one arg)' },
      { name: 'stop', type: 'number', required: false, description: 'Stop value (exclusive)' },
      { name: 'step', type: 'number', required: false, description: 'Step size (default: 1)' }
    ],
    execute: async (context: ExecutionContext, ...args: number[]): Promise<ExecutionResult> => {
      let start: number, stop: number, step: number;
      
      if (args.length === 1) {
        // range(stop)
        start = 0;
        stop = args[0];
        step = 1;
      } else if (args.length === 2) {
        // range(start, stop)
        start = args[0];
        stop = args[1];
        step = 1;
      } else if (args.length === 3) {
        // range(start, stop, step)
        start = args[0];
        stop = args[1];
        step = args[2];
      } else {
        return {
          success: false,
          message: 'range() takes 1 to 3 arguments'
        };
      }
      
      if (step === 0) {
        return {
          success: false,
          message: 'range() step argument must not be zero'
        };
      }
      
      const result: number[] = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) {
          result.push(i);
        }
      } else {
        for (let i = start; i > stop; i += step) {
          result.push(i);
        }
      }
      
      return {
        success: true,
        message: `Generated range(${args.join(', ')}) with ${result.length} items`,
        data: result
      };
    }
  },
  {
    name: 'len',
    description: 'Get the length of a string, array, or other iterable',
    category: 'utility',
    parameters: [
      { name: 'iterable', type: 'any', required: true, description: 'The iterable to get length of' }
    ],
    execute: async (context: ExecutionContext, iterable: any): Promise<ExecutionResult> => {
      let length: number;
      
      if (typeof iterable === 'string') {
        length = iterable.length;
      } else if (Array.isArray(iterable)) {
        length = iterable.length;
      } else if (iterable != null && typeof iterable.length === 'number') {
        length = iterable.length;
      } else {
        return {
          success: false,
          message: `Object of type '${typeof iterable}' has no len()`
        };
      }
      
      return {
        success: true,
        message: `Length: ${length}`,
        data: length
      };
    }
  },
  {
    name: 'abs',
    description: 'Return the absolute value of a number',
    category: 'utility',
    parameters: [
      { name: 'number', type: 'number', required: true, description: 'The number to get absolute value of' }
    ],
    execute: async (context: ExecutionContext, number: number): Promise<ExecutionResult> => {
      if (typeof number !== 'number') {
        return {
          success: false,
          message: 'abs() requires a number argument'
        };
      }
      
      const result = Math.abs(number);
      
      return {
        success: true,
        message: `abs(${number}) = ${result}`,
        data: result
      };
    }
  },
  {
    name: 'min',
    description: 'Return the minimum value from arguments',
    category: 'utility',
    parameters: [
      { name: 'values', type: 'any', required: true, description: 'Values to compare (can be multiple arguments or an array)' }
    ],
    execute: async (context: ExecutionContext, ...args: any[]): Promise<ExecutionResult> => {
      let values: any[];
      
      if (args.length === 1 && Array.isArray(args[0])) {
        values = args[0];
      } else {
        values = args;
      }
      
      if (values.length === 0) {
        return {
          success: false,
          message: 'min() expected at least 1 argument, got 0'
        };
      }
      
      const result = Math.min(...values.map(v => Number(v)));
      
      if (isNaN(result)) {
        return {
          success: false,
          message: 'min() arguments must be numbers'
        };
      }
      
      return {
        success: true,
        message: `min(${values.join(', ')}) = ${result}`,
        data: result
      };
    }
  },
  {
    name: 'max',
    description: 'Return the maximum value from arguments',
    category: 'utility',
    parameters: [
      { name: 'values', type: 'any', required: true, description: 'Values to compare (can be multiple arguments or an array)' }
    ],
    execute: async (context: ExecutionContext, ...args: any[]): Promise<ExecutionResult> => {
      let values: any[];
      
      if (args.length === 1 && Array.isArray(args[0])) {
        values = args[0];
      } else {
        values = args;
      }
      
      if (values.length === 0) {
        return {
          success: false,
          message: 'max() expected at least 1 argument, got 0'
        };
      }
      
      const result = Math.max(...values.map(v => Number(v)));
      
      if (isNaN(result)) {
        return {
          success: false,
          message: 'max() arguments must be numbers'
        };
      }
      
      return {
        success: true,
        message: `max(${values.join(', ')}) = ${result}`,
        data: result
      };
    }
  },
  {
    name: 'sum',
    description: 'Return the sum of an iterable of numbers',
    category: 'utility',
    parameters: [
      { name: 'iterable', type: 'any', required: true, description: 'Iterable of numbers to sum' }
    ],
    execute: async (context: ExecutionContext, iterable: any[]): Promise<ExecutionResult> => {
      if (!Array.isArray(iterable)) {
        return {
          success: false,
          message: 'sum() requires an iterable argument'
        };
      }
      
      const numbers = iterable.map(v => Number(v));
      if (numbers.some(n => isNaN(n))) {
        return {
          success: false,
          message: 'sum() requires all elements to be numbers'
        };
      }
      
      const result = numbers.reduce((acc, num) => acc + num, 0);
      
      return {
        success: true,
        message: `sum([${iterable.join(', ')}]) = ${result}`,
        data: result
      };
    }
  }
];

// Registry for all built-in functions
export class BuiltInFunctionRegistry {
  private static functions: Map<string, BuiltInFunction> = new Map();
  private static categories: Map<string, BuiltInFunction[]> = new Map();

  static initialize() {
    console.log('Initializing BuiltInFunctionRegistry...');
    this.registerFunctions([
      ...movementFunctions,
      ...interactionFunctions,
      ...systemFunctions,
      ...utilityFunctions,
      ...arrayFunctions,
      ...objectFunctions,
      ...controlFlowFunctions
    ]);
    console.log(`Registered ${this.functions.size} built-in functions:`, Array.from(this.functions.keys()));
  }

  static registerFunctions(functions: BuiltInFunction[]) {
    functions.forEach(func => {
      this.functions.set(func.name, func);
      
      if (!this.categories.has(func.category)) {
        this.categories.set(func.category, []);
      }
      this.categories.get(func.category)!.push(func);
    });
  }

  static registerFunction(func: BuiltInFunction) {
    this.functions.set(func.name, func);
    
    if (!this.categories.has(func.category)) {
      this.categories.set(func.category, []);
    }
    this.categories.get(func.category)!.push(func);
  }

  static getFunction(name: string): BuiltInFunction | undefined {
    return this.functions.get(name);
  }

  static getAllFunctions(): BuiltInFunction[] {
    return Array.from(this.functions.values());
  }

  static getFunctionsByCategory(category: string): BuiltInFunction[] {
    return this.categories.get(category) || [];
  }

  static getFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  static createFunctionMap(): Map<string, Function> {
    console.log(`Creating function map from ${this.functions.size} registered functions`);
    const functionMap = new Map<string, Function>();
    
    this.functions.forEach((func, name) => {
      functionMap.set(name, func.execute);
    });

    console.log(`Created function map with ${functionMap.size} functions:`, Array.from(functionMap.keys()));
    return functionMap;
  }
}

// Initialize the built-in functions
BuiltInFunctionRegistry.initialize(); 