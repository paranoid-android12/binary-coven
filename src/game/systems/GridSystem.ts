import { GridTypeDefinition, GridTile, GridFunction, Entity, ExecutionResult, MiningTerminalState, DynamoState, WalletState } from '../../types/game';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '../../stores/gameStore';
import TaskManager from './TaskManager';

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
      energyRequired: definition.energyRequired,
      taskState: {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    };
  }

  private static getFunctionImplementation(gridType: string, functionName: string): GridFunction['execute'] {
    // Create a temporary GridSystem instance to access the new function implementations
    const gridSystem = new GridSystem();
    const functions = gridSystem.getFunctionsForGridType(gridType);
    
    const matchingFunction = functions.find(func => func.name === functionName);
    if (matchingFunction) {
      return matchingFunction.execute;
    }
    
    // Fallback for unknown functions
    return async () => ({
      success: false,
      message: `Function ${functionName} not implemented for ${gridType}`
    });
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
  private taskManager: TaskManager;

  constructor() {
    initializeDefaultGridTypes();
    this.taskManager = TaskManager.getInstance();
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

  // Mining Terminal Functions
  private createMiningTerminalFunctions(): GridFunction[] {
    return [
      {
        name: 'mine_initiate',
        description: 'Initiates the mining process (3s initiation + 10s mining)',
        parameters: [],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the mining terminal to initiate mining'
            };
          }

          // Check if entity can act
          if (!this.taskManager.canEntityAct(entity.id)) {
            return {
              success: false,
              message: 'Entity is currently busy with another task'
            };
          }

          // Check if grid can act
          if (!this.taskManager.canGridAct(grid.id)) {
            return {
              success: false,
              message: 'Mining terminal is currently busy'
            };
          }

          // Check energy requirement
          const energyCost = 10;
          if (entity.stats.energy < energyCost) {
            return {
              success: false,
              message: `Not enough energy. Required: ${energyCost}, Available: ${entity.stats.energy}`
            };
          }

          // Consume energy immediately
          const store = useGameStore.getState();
          store.updateEntity(entity.id, {
            stats: {
              ...entity.stats,
              energy: entity.stats.energy - energyCost
            }
          });

          // Set grid state to initiating
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              status: MiningTerminalState.INITIATING,
              bitcoinReady: false
            }
          });

          // Start entity task for 3 seconds (initiation)
          const initiationSuccess = this.taskManager.startEntityTask(
            entity.id,
            'mine_initiate',
            3,
            'Initiating mining process...',
            () => {
              // After initiation, start grid mining task
              store.updateGrid(grid.id, {
                state: {
                  ...grid.state,
                  status: MiningTerminalState.MINING
                }
              });

              // Start grid mining task for 10 seconds
              this.taskManager.startGridTask(
                grid.id,
                'mining',
                10,
                'Mining bitcoin...',
                entity.id,
                () => {
                  // Mining complete - bitcoin ready
                  store.updateGrid(grid.id, {
                    state: {
                      ...grid.state,
                      status: MiningTerminalState.READY,
                      bitcoinReady: true,
                      bitcoinAmount: (grid.state.bitcoinAmount || 0) + 1
                    }
                  });
                }
              );
            }
          );

          if (!initiationSuccess) {
            return {
              success: false,
              message: 'Failed to start mining initiation'
            };
          }

          return {
            success: true,
            message: 'Mining initiation started',
            duration: 3000,
            energyCost,
            blocksEntity: true
          };
        }
      },
      {
        name: 'collect',
        description: 'Collects ready bitcoins from the mining terminal',
        parameters: [],
        requiresEntityOnGrid: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the mining terminal to collect bitcoins'
            };
          }

          // Check if bitcoins are ready
          if (grid.state.status !== MiningTerminalState.READY || !grid.state.bitcoinReady) {
            return {
              success: false,
              message: 'No bitcoins ready for collection. Mining may still be in progress.'
            };
          }

          // Check energy requirement
          const energyCost = 5;
          if (entity.stats.energy < energyCost) {
            return {
              success: false,
              message: `Not enough energy. Required: ${energyCost}, Available: ${entity.stats.energy}`
            };
          }

          // Collect bitcoins
          const store = useGameStore.getState();
          const bitcoinAmount = grid.state.bitcoinAmount || 1;

          // Add to global resources
          store.updateGlobalResources({
            bitcoin: (store.globalResources.bitcoin || 0) + bitcoinAmount
          });

          // Consume energy
          store.updateEntity(entity.id, {
            stats: {
              ...entity.stats,
              energy: entity.stats.energy - energyCost
            }
          });

          // Reset grid state
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              status: MiningTerminalState.IDLE,
              bitcoinReady: false,
              bitcoinAmount: 0
            }
          });

          return {
            success: true,
            message: `Collected ${bitcoinAmount} bitcoin(s)`,
            energyCost
          };
        }
      }
    ];
  }

  // Dynamo Functions
  private createDynamoFunctions(): GridFunction[] {
    return [
      {
        name: 'crank',
        description: 'Cranks the dynamo to generate energy (10 seconds)',
        parameters: [],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the dynamo to crank it'
            };
          }

          // Check if entity can act
          if (!this.taskManager.canEntityAct(entity.id)) {
            return {
              success: false,
              message: 'Entity is currently busy with another task'
            };
          }

          // Check if grid can act
          if (!this.taskManager.canGridAct(grid.id)) {
            return {
              success: false,
              message: 'Dynamo is currently being used'
            };
          }

          // Check energy requirement
          const energyCost = 5;
          if (entity.stats.energy < energyCost) {
            return {
              success: false,
              message: `Not enough energy. Required: ${energyCost}, Available: ${entity.stats.energy}`
            };
          }

          // Consume energy immediately
          const store = useGameStore.getState();
          store.updateEntity(entity.id, {
            stats: {
              ...entity.stats,
              energy: entity.stats.energy - energyCost
            }
          });

          // Set grid state to cranking
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              status: DynamoState.CRANKING
            }
          });

          // Start entity task for 10 seconds
          const crankSuccess = this.taskManager.startEntityTask(
            entity.id,
            'crank',
            10,
            'Cranking dynamo for energy...',
            () => {
              // Restore entity to full energy
              const currentEntity = store.entities.get(entity.id);
              if (currentEntity) {
                store.updateEntity(entity.id, {
                  stats: {
                    ...currentEntity.stats,
                    energy: currentEntity.stats.maxEnergy
                  }
                });
              }

              // Reset grid state
              store.updateGrid(grid.id, {
                state: {
                  ...grid.state,
                  status: DynamoState.IDLE
                }
              });
            }
          );

          if (!crankSuccess) {
            return {
              success: false,
              message: 'Failed to start cranking'
            };
          }

          return {
            success: true,
            message: 'Started cranking dynamo',
            duration: 10000,
            energyCost,
            blocksEntity: true
          };
        }
      }
    ];
  }

  // Wallet Functions
  private createWalletFunctions(): GridFunction[] {
    return [
      {
        name: 'store',
        description: 'Stores bitcoins as spendable currency',
        parameters: [
          {
            name: 'amount',
            type: 'number',
            required: true,
            default: 1
          }
        ],
        requiresEntityOnGrid: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the wallet to store bitcoins'
            };
          }

          // Parse amount parameter
          const amount = params[0] || 1;
          if (typeof amount !== 'number' || amount <= 0) {
            return {
              success: false,
              message: 'Amount must be a positive number'
            };
          }

          // Check energy requirement
          const energyCost = 2;
          if (entity.stats.energy < energyCost) {
            return {
              success: false,
              message: `Not enough energy. Required: ${energyCost}, Available: ${entity.stats.energy}`
            };
          }

          // Check if enough bitcoins available
          const store = useGameStore.getState();
          const availableBitcoins = store.globalResources.bitcoin || 0;
          
          if (availableBitcoins < amount) {
            return {
              success: false,
              message: `Not enough bitcoins. Required: ${amount}, Available: ${availableBitcoins}`
            };
          }

          // Consume energy
          store.updateEntity(entity.id, {
            stats: {
              ...entity.stats,
              energy: entity.stats.energy - energyCost
            }
          });

          // Convert bitcoins to currency
          store.updateGlobalResources({
            bitcoin: availableBitcoins - amount,
            currency: (store.globalResources.currency || 0) + amount
          });

          // Update wallet state
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              storedAmount: (grid.state.storedAmount || 0) + amount,
              lastTransaction: {
                amount,
                timestamp: Date.now(),
                entityId: entity.id
              }
            }
          });

          return {
            success: true,
            message: `Stored ${amount} bitcoin(s) as currency`,
            energyCost
          };
        }
      }
    ];
  }

  // Get functions for a specific grid type
  getFunctionsForGridType(gridType: string): GridFunction[] {
    switch (gridType) {
      case 'mining_terminal':
        return this.createMiningTerminalFunctions();
      case 'dynamo':
        return this.createDynamoFunctions();
      case 'wallet':
        return this.createWalletFunctions();
      default:
        return [];
    }
  }

  // Initialize a grid with its functions and default state
  initializeGrid(gridType: string, gridId: string): Partial<GridTile> {
    const functions = this.getFunctionsForGridType(gridType);
    
    let defaultState: Record<string, any> = {};
    
    switch (gridType) {
      case 'mining_terminal':
        defaultState = {
          status: MiningTerminalState.IDLE,
          bitcoinReady: false,
          bitcoinAmount: 0
        };
        break;
      case 'dynamo':
        defaultState = {
          status: DynamoState.IDLE
        };
        break;
      case 'wallet':
        defaultState = {
          status: WalletState.IDLE,
          storedAmount: 0
        };
        break;
    }

    return {
      functions: functions,
      state: defaultState,
      taskState: {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      }
    };
  }

  // Get grid status for scanner function
  getGridStatus(grid: GridTile): any {
    switch (grid.type) {
      case 'mining_terminal':
        return {
          status: grid.state.status || MiningTerminalState.IDLE,
          bitcoinReady: grid.state.bitcoinReady || false,
          bitcoinAmount: grid.state.bitcoinAmount || 0,
          progress: grid.taskState.progress ? this.taskManager.getGridProgress(grid.id) : 0
        };
      case 'dynamo':
        return {
          status: grid.state.status || DynamoState.IDLE,
          progress: grid.taskState.progress ? this.taskManager.getGridProgress(grid.id) : 0
        };
      case 'wallet':
        return {
          status: grid.state.status || WalletState.IDLE,
          storedAmount: grid.state.storedAmount || 0,
          lastTransaction: grid.state.lastTransaction
        };
      default:
        return {
          status: 'unknown',
          type: grid.type
        };
    }
  }
}

export default GridSystem; 