import { BuiltInFunction, ExecutionContext, ExecutionResult, Position } from '../../types/game';
import { useGameStore } from '../../stores/gameStore';
import GridSystem from './GridSystem';

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

      const store = useGameStore.getState();
      const success = store.moveEntity(entity.id, newPosition);

      if (success) {
        // Sync context entity with updated game store
        syncContextEntity(context);
        return {
          success: true,
          message: `Moved to (${newPosition.x}, ${newPosition.y})`,
          energyCost: 5,
          duration: 1000 / entity.stats.walkingSpeed
        };
      } else {
        return {
          success: false,
          message: 'Cannot move up - blocked or out of bounds'
        };
      }
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

      const store = useGameStore.getState();
      const success = store.moveEntity(entity.id, newPosition);

      if (success) {
        syncContextEntity(context);
        return {
          success: true,
          message: `Moved to (${newPosition.x}, ${newPosition.y})`,
          energyCost: 5,
          duration: 1000 / entity.stats.walkingSpeed
        };
      } else {
        return {
          success: false,
          message: 'Cannot move down - blocked or out of bounds'
        };
      }
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

      const store = useGameStore.getState();
      const success = store.moveEntity(entity.id, newPosition);

      if (success) {
        syncContextEntity(context);
        return {
          success: true,
          message: `Moved to (${newPosition.x}, ${newPosition.y})`,
          energyCost: 5,
          duration: 1000 / entity.stats.walkingSpeed
        };
      } else {
        return {
          success: false,
          message: 'Cannot move left - blocked or out of bounds'
        };
      }
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

      const store = useGameStore.getState();
      const success = store.moveEntity(entity.id, newPosition);

      if (success) {
        syncContextEntity(context);
        return {
          success: true,
          message: `Moved to (${newPosition.x}, ${newPosition.y})`,
          energyCost: 5,
          duration: 1000 / entity.stats.walkingSpeed
        };
      } else {
        return {
          success: false,
          message: 'Cannot move right - blocked or out of bounds'
        };
      }
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
      
      const store = useGameStore.getState();
      const success = store.moveEntity(entity.id, newPosition);

      if (success) {
        // Sync context entity with updated game store
        syncContextEntity(context);
        
        return {
          success: true,
          message: `Moved to (${newPosition.x}, ${newPosition.y})`,
          energyCost: distance * 5,
          duration: (distance * 1000) / entity.stats.walkingSpeed
        };
      } else {
        return {
          success: false,
          message: `Cannot move to (${newPosition.x}, ${newPosition.y}) - blocked or out of bounds`
        };
      }
    }
  }
];

// Interaction Functions
export const interactionFunctions: BuiltInFunction[] = [
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