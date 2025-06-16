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
        return {
          success: false,
          message: 'Cannot move up - out of bounds'
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
    description: 'Get the current inventory of the entity',
    category: 'utility',
    parameters: [],
    execute: async (context: ExecutionContext): Promise<ExecutionResult> => {
      const { entity } = context;
      return {
        success: true,
        message: `Inventory: ${entity.inventory.items.length}/${entity.inventory.capacity} items`,
        data: {
          items: entity.inventory.items,
          capacity: entity.inventory.capacity,
          usedSlots: entity.inventory.items.length
        }
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
      ...utilityFunctions
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