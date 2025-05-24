import { GridTypeDefinition, GridTile, GridFunction, Entity, ExecutionResult } from '../../types/game';
import { v4 as uuidv4 } from 'uuid';

// Grid function implementations
class GridFunctions {
  // Bitcoin Mining Terminal Functions
  static async mine_initiate(entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> {
    // Check if entity is on the correct grid
    if (entity.position.x !== grid.position.x || entity.position.y !== grid.position.y) {
      return {
        success: false,
        message: "Must be standing on the mining terminal to initiate mining"
      };
    }

    // Check if terminal is already mining
    if (grid.state.isMining) {
      return {
        success: false,
        message: "Mining terminal is already in use"
      };
    }

    // Start mining process
    grid.state.isMining = true;
    grid.state.miningStartTime = Date.now();
    
    // Simulate 5-second mining process
    setTimeout(() => {
      grid.state.isMining = false;
      grid.state.bitcoinReady = true;
      grid.state.bitcoinAmount = (grid.state.bitcoinAmount || 0) + 1;
    }, 5000);

    return {
      success: true,
      message: "Mining initiated. Bitcoin will be ready in 5 seconds.",
      duration: 5000,
      energyCost: 10
    };
  }

  static async collect(entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> {
    if (entity.position.x !== grid.position.x || entity.position.y !== grid.position.y) {
      return {
        success: false,
        message: "Must be standing on the mining terminal to collect"
      };
    }

    if (!grid.state.bitcoinReady || !grid.state.bitcoinAmount) {
      return {
        success: false,
        message: "No bitcoins ready for collection"
      };
    }

    // Add bitcoin to entity's inventory
    const bitcoinAmount = grid.state.bitcoinAmount;
    
    // Reset terminal state
    grid.state.bitcoinReady = false;
    grid.state.bitcoinAmount = 0;

    return {
      success: true,
      message: `Collected ${bitcoinAmount} bitcoin(s)`,
      data: { bitcoinAmount },
      energyCost: 5
    };
  }

  // Dynamo Functions
  static async crank(entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> {
    if (entity.position.x !== grid.position.x || entity.position.y !== grid.position.y) {
      return {
        success: false,
        message: "Must be standing on the dynamo to crank it"
      };
    }

    if (grid.state.isCranking) {
      return {
        success: false,
        message: "Dynamo is already being cranked"
      };
    }

    // Start cranking process
    grid.state.isCranking = true;
    grid.state.crankStartTime = Date.now();

    // Simulate 10-second cranking process
    setTimeout(() => {
      grid.state.isCranking = false;
      grid.state.energyProduced = (grid.state.energyProduced || 0) + 10;
    }, 10000);

    return {
      success: true,
      message: "Cranking dynamo. 10 energy points will be generated in 10 seconds.",
      duration: 10000,
      energyCost: 5
    };
  }

  // Wallet Functions
  static async store(entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> {
    if (entity.position.x !== grid.position.x || entity.position.y !== grid.position.y) {
      return {
        success: false,
        message: "Must be standing on the wallet to store items"
      };
    }

    const [amount] = params;
    if (typeof amount !== 'number' || amount <= 0) {
      return {
        success: false,
        message: "Invalid amount specified"
      };
    }

    // Find bitcoins in entity's inventory
    const bitcoinItem = entity.inventory.items.find(item => item.type === 'bitcoin');
    if (!bitcoinItem || bitcoinItem.quantity < amount) {
      return {
        success: false,
        message: `Not enough bitcoins. Have ${bitcoinItem?.quantity || 0}, need ${amount}`
      };
    }

    // Store bitcoins in wallet
    grid.state.storedBitcoins = (grid.state.storedBitcoins || 0) + amount;
    
    // Remove bitcoins from entity inventory (this would be handled by the game store)
    
    return {
      success: true,
      message: `Stored ${amount} bitcoin(s) in wallet`,
      data: { storedAmount: amount },
      energyCost: 2
    };
  }
}

// Grid type definitions
export class GridTypeRegistry {
  private static gridTypes: Map<string, GridTypeDefinition> = new Map();

  static registerGridType(definition: GridTypeDefinition) {
    this.gridTypes.set(definition.type, definition);
  }

  static getGridType(type: string): GridTypeDefinition | undefined {
    return this.gridTypes.get(type);
  }

  static getAllGridTypes(): GridTypeDefinition[] {
    return Array.from(this.gridTypes.values());
  }

  static createGrid(type: string, position: { x: number, y: number }, name?: string): GridTile | null {
    const definition = this.getGridType(type);
    if (!definition) return null;

    const functions: GridFunction[] = definition.functions.map(funcDef => ({
      ...funcDef,
      execute: this.getFunctionImplementation(type, funcDef.name)
    }));

    return {
      id: uuidv4(),
      type: definition.type,
      position,
      name: name || definition.name,
      description: definition.description,
      functions,
      properties: { ...definition.defaultProperties },
      state: { ...definition.defaultState },
      isActive: true,
      energyRequired: definition.energyRequired
    };
  }

  private static getFunctionImplementation(gridType: string, functionName: string): GridFunction['execute'] {
    const key = `${gridType}_${functionName}`;
    
    switch (key) {
      case 'mining_terminal_mine_initiate':
        return GridFunctions.mine_initiate;
      case 'mining_terminal_collect':
        return GridFunctions.collect;
      case 'dynamo_crank':
        return GridFunctions.crank;
      case 'wallet_store':
        return GridFunctions.store;
      default:
        return async () => ({
          success: false,
          message: `Function ${functionName} not implemented for ${gridType}`
        });
    }
  }
}

// Initialize default grid types
export function initializeDefaultGridTypes() {
  // Bitcoin Mining Terminal
  GridTypeRegistry.registerGridType({
    type: 'mining_terminal',
    name: 'Bitcoin Mining Terminal',
    description: 'A terminal for mining bitcoins. Requires energy to operate.',
    defaultProperties: {
      miningPower: 1,
      energyConsumption: 10
    },
    defaultState: {
      isMining: false,
      bitcoinReady: false,
      bitcoinAmount: 0,
      miningStartTime: 0
    },
    functions: [
      {
        name: 'mine_initiate',
        description: 'Initiate mining sequence on the terminal. Takes 5 seconds to mine 1 bitcoin.',
        parameters: []
      },
      {
        name: 'collect',
        description: 'Collect mined bitcoins and add them to storage.',
        parameters: []
      }
    ],
    spriteKey: 'mining_terminal',
    energyRequired: 10
  });

  // Dynamo
  GridTypeRegistry.registerGridType({
    type: 'dynamo',
    name: 'Energy Dynamo',
    description: 'Manually operated dynamo that generates energy for the grid system.',
    defaultProperties: {
      energyOutput: 10,
      crankTime: 10000
    },
    defaultState: {
      isCranking: false,
      energyProduced: 0,
      crankStartTime: 0
    },
    functions: [
      {
        name: 'crank',
        description: 'Manually crank the dynamo. Takes 10 seconds to produce 10 energy points.',
        parameters: []
      }
    ],
    spriteKey: 'dynamo',
    energyRequired: 0
  });

  // Wallet
  GridTypeRegistry.registerGridType({
    type: 'wallet',
    name: 'Storage Wallet',
    description: 'A secure storage space for bitcoins and other valuable items.',
    defaultProperties: {
      capacity: 1000,
      securityLevel: 'high'
    },
    defaultState: {
      storedBitcoins: 0,
      storedItems: {}
    },
    functions: [
      {
        name: 'store',
        description: 'Store bitcoins in the wallet. Converts them to spendable currency.',
        parameters: [
          {
            name: 'amount',
            type: 'number',
            required: true,
            default: 1
          }
        ]
      }
    ],
    spriteKey: 'wallet',
    energyRequired: 0
  });
}

// Grid management system
export class GridSystem {
  private grids: Map<string, GridTile> = new Map();

  constructor() {
    initializeDefaultGridTypes();
  }

  addGrid(type: string, position: { x: number, y: number }, name?: string): string | null {
    const grid = GridTypeRegistry.createGrid(type, position, name);
    if (!grid) return null;

    this.grids.set(grid.id, grid);
    return grid.id;
  }

  removeGrid(gridId: string): boolean {
    return this.grids.delete(gridId);
  }

  getGrid(gridId: string): GridTile | undefined {
    return this.grids.get(gridId);
  }

  getGridAt(position: { x: number, y: number }): GridTile | undefined {
    return Array.from(this.grids.values()).find(
      grid => grid.position.x === position.x && grid.position.y === position.y
    );
  }

  getAllGrids(): GridTile[] {
    return Array.from(this.grids.values());
  }

  async executeGridFunction(gridId: string, functionName: string, entity: Entity, params: any[] = []): Promise<ExecutionResult> {
    const grid = this.getGrid(gridId);
    if (!grid) {
      return {
        success: false,
        message: 'Grid not found'
      };
    }

    const gridFunction = grid.functions.find(func => func.name === functionName);
    if (!gridFunction) {
      return {
        success: false,
        message: `Function '${functionName}' not available on this grid`
      };
    }

    // Check energy requirements
    if (grid.energyRequired && entity.stats.energy < grid.energyRequired) {
      return {
        success: false,
        message: `Not enough energy. Required: ${grid.energyRequired}, Available: ${entity.stats.energy}`
      };
    }

    return await gridFunction.execute(entity, params, grid);
  }

  getAvailableFunctions(gridId: string): string[] {
    const grid = this.getGrid(gridId);
    return grid ? grid.functions.map(func => func.name) : [];
  }
} 