import { GridTypeDefinition, GridTile, GridFunction, Entity, ExecutionResult, FarmlandState, FoodState, SiloState } from '../../types/game';
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

  static getGridTypesByCategory(category: string): GridTypeDefinition[] {
    return Array.from(this.gridTypes.values()).filter(type => type.category === category);
  }
}

// Constants for farming
const PLANT_TYPES: Record<string, {
  name: string;
  displayName: string;
  growthTime: number;
  harvestAmount: number;
}> = {
  wheat: {
    name: 'wheat',
    displayName: 'Wheat',
    growthTime: 10, // 10 seconds to grow
    harvestAmount: 1
  }
};

// Initialize default grid types for farming
export function initializeDefaultGridTypes() {
  // Farmland (was Mining Terminal)
  GridTypeRegistry.registerGridType({
    type: 'farmland',
    name: 'Farmland Plot',
    description: 'A plot of land for growing crops. Requires energy to plant and harvest.',
    defaultProperties: {
      fertility: 1,
      plantType: null
    },
    defaultState: {
      isPlanted: false,
      isGrown: false,
      cropReady: false,
      plantType: null,
      cropAmount: 0,
      plantStartTime: 0
    },
    functions: [
      {
        name: 'plant',
        description: 'Plant crops on the farmland. Takes time to grow.',
        parameters: [
          {
            name: 'crop_type',
            type: 'string',
            required: false,
            default: 'wheat'
          }
        ]
      },
      {
        name: 'harvest',
        description: 'Harvest grown crops and add them to inventory.',
        parameters: []
      }
    ],
    spriteKey: 'farmland',
    energyRequired: 5
  });

  // Food (was Dynamo)
  GridTypeRegistry.registerGridType({
    type: 'food',
    name: 'Food Station',
    description: 'A food station that restores energy when eaten.',
    defaultProperties: {
      nutritionValue: 10,
      consumeTime: 3000
    },
    defaultState: {
      isEating: false,
      energyRestored: 0,
      eatStartTime: 0
    },
    functions: [
      {
        name: 'eat',
        description: 'Eat food to restore energy. Takes 3 seconds.',
        parameters: []
      }
    ],
    spriteKey: 'food',
    energyRequired: 0
  });

  // Silo (was Wallet)
  GridTypeRegistry.registerGridType({
    type: 'silo',
    name: 'Storage Silo',
    description: 'A storage silo for crops and other farm items.',
    defaultProperties: {
      capacity: 1000,
      storageType: 'crops'
    },
    defaultState: {
      storedItems: {},
      totalStored: 0
    },
    functions: [
      {
        name: 'store',
        description: 'Store crops from inventory to silo. Makes them available for upgrades.',
        parameters: [
          {
            name: 'item_type',
            type: 'string',
            required: true,
            default: 'wheat'
          },
          {
            name: 'amount',
            type: 'number',
            required: false,
            default: 1
          }
        ]
      }
    ],
    spriteKey: 'silo',
    energyRequired: 0
  });
}

export class GridSystem {
  private grids: Map<string, GridTile> = new Map();
  private taskManager: TaskManager;

  constructor() {
    this.taskManager = TaskManager.getInstance();
  }

  getGrid(gridId: string): GridTile | undefined {
    return this.grids.get(gridId);
  }

  getGrids(): GridTile[] {
    return Array.from(this.grids.values());
  }

  getGridsByType(type: string): GridTile[] {
    return Array.from(this.grids.values()).filter(grid => grid.type === type);
  }

  addGrid(grid: GridTile): void {
    this.grids.set(grid.id, grid);
  }

  removeGrid(gridId: string): void {
    this.grids.delete(gridId);
  }

  updateGrid(gridId: string, updates: Partial<GridTile>): void {
    const grid = this.grids.get(gridId);
    if (grid) {
      this.grids.set(gridId, { ...grid, ...updates });
    }
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

  // Farmland Functions
  private createFarmlandFunctions(): GridFunction[] {
    return [
      {
        name: 'plant',
        description: 'Plants crops on the farmland',
        parameters: [
          {
            name: 'crop_type',
            type: 'string',
            required: false,
            default: 'wheat'
          }
        ],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the farmland to plant crops'
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
              message: 'Farmland is currently busy'
            };
          }

          // Check if already planted
          if (grid.state.isPlanted) {
            return {
              success: false,
              message: 'Farmland already has crops planted'
            };
          }

          // Get crop type parameter
          const cropType = params[0] || 'wheat';
          
          // Only allow wheat for now
          if (cropType !== 'wheat') {
            return {
              success: false,
              message: 'Only wheat can be planted currently'
            };
          }

          const plantData = PLANT_TYPES[cropType as keyof typeof PLANT_TYPES];
          if (!plantData) {
            return {
              success: false,
              message: `Unknown crop type: ${cropType}`
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

          // Set grid state to planting
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              status: FarmlandState.PLANTING,
              isPlanted: false,
              plantType: cropType
            }
          });

          // Start entity task for 3 seconds (planting)
          const plantingSuccess = this.taskManager.startEntityTask(
            entity.id,
            'plant',
            3,
            `Planting ${plantData.displayName}...`,
            () => {
              // After planting, start crop growth
              store.updateGrid(grid.id, {
                state: {
                  ...grid.state,
                  status: FarmlandState.GROWING,
                  isPlanted: true
                }
              });

              // Start grid growing task
              this.taskManager.startGridTask(
                grid.id,
                'growing',
                plantData.growthTime,
                `${plantData.displayName} growing...`,
                entity.id,
                () => {
                  // Growth complete - crop ready
                  store.updateGrid(grid.id, {
                    state: {
                      ...grid.state,
                      status: FarmlandState.READY,
                      isGrown: true,
                      cropReady: true,
                      cropAmount: plantData.harvestAmount
                    }
                  });
                }
              );
            }
          );

          if (!plantingSuccess) {
            return {
              success: false,
              message: 'Failed to start planting'
            };
          }

          return {
            success: true,
            message: `Started planting ${plantData.displayName}`,
            duration: 3000,
            energyCost,
            blocksEntity: true
          };
        }
      },
      {
        name: 'harvest',
        description: 'Harvests ready crops from the farmland',
        parameters: [],
        requiresEntityOnGrid: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the farmland to harvest crops'
            };
          }

          // Check if crops are ready
          if (grid.state.status !== FarmlandState.READY || !grid.state.cropReady) {
            return {
              success: false,
              message: 'No crops ready for harvest. Growth may still be in progress.'
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

          // Harvest crops - add to entity inventory (not global resources)
          const store = useGameStore.getState();
          const cropAmount = grid.state.cropAmount || 1;
          const cropType = grid.state.plantType || 'wheat';

          // Add to entity's inventory
          const cropDisplayName = PLANT_TYPES[cropType as keyof typeof PLANT_TYPES]?.displayName || cropType;
          const success = store.addToInventory(entity.id, {
            id: cropType,
            name: cropDisplayName,
            type: 'crop',
            quantity: cropAmount,
            description: `Freshly harvested ${cropDisplayName}`
          });

          if (!success) {
            return {
              success: false,
              message: 'Inventory is full. Cannot harvest crops.'
            };
          }

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
              status: FarmlandState.IDLE,
              isPlanted: false,
              isGrown: false,
              cropReady: false,
              cropAmount: 0,
              plantType: null
            }
          });

          return {
            success: true,
            message: `Harvested ${cropAmount} ${PLANT_TYPES[cropType as keyof typeof PLANT_TYPES]?.displayName || cropType}(s) to inventory`,
            energyCost
          };
        }
      }
    ];
  }

  // Food Functions
  private createFoodFunctions(): GridFunction[] {
    return [
      {
        name: 'eat',
        description: 'Eat food to restore energy',
        parameters: [],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the food station to eat'
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
              message: 'Food station is currently being used'
            };
          }

          // Check energy requirement (small cost to eat)
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

          // Set grid state to eating
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              status: FoodState.EATING
            }
          });

          // Start entity task for 3 seconds
          const eatSuccess = this.taskManager.startEntityTask(
            entity.id,
            'eat',
            3,
            'Eating food to restore energy...',
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
                  status: FoodState.IDLE
                }
              });
            }
          );

          if (!eatSuccess) {
            return {
              success: false,
              message: 'Failed to start eating'
            };
          }

          return {
            success: true,
            message: 'Started eating food',
            duration: 3000,
            energyCost,
            blocksEntity: true
          };
        }
      }
    ];
  }

  // Silo Functions
  private createSiloFunctions(): GridFunction[] {
    return [
      {
        name: 'store',
        description: 'Stores crops from inventory to silo',
        parameters: [
          {
            name: 'item_type',
            type: 'string',
            required: true,
            default: 'wheat'
          },
          {
            name: 'amount',
            type: 'number',
            required: false,
            default: 1
          }
        ],
        requiresEntityOnGrid: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          // Validate entity is on grid
          if (!this.taskManager.validateEntityOnGrid(entity, grid)) {
            return {
              success: false,
              message: 'Entity must be standing on the silo to store items'
            };
          }

          // Parse parameters
          const itemType = params[0] || 'wheat';
          const amount = params[1] || 1;
          
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

          // Check if entity has the item in inventory
          const store = useGameStore.getState();
          const inventoryItem = store.getInventoryItem(entity.id, itemType);
          
          if (!inventoryItem || inventoryItem.quantity < amount) {
            return {
              success: false,
              message: `Not enough ${itemType}. Required: ${amount}, Available: ${inventoryItem?.quantity || 0}`
            };
          }

          // Remove from entity inventory
          const removeSuccess = store.removeFromInventory(entity.id, itemType, amount);
          if (!removeSuccess) {
            return {
              success: false,
              message: 'Failed to remove items from inventory'
            };
          }

          // Consume energy
          store.updateEntity(entity.id, {
            stats: {
              ...entity.stats,
              energy: entity.stats.energy - energyCost
            }
          });

          // Add to global resources (this makes it available for upgrades)
          store.addResource(itemType, amount);

          // Update silo state
          const currentStored = grid.state.storedItems?.[itemType] || 0;
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              storedItems: {
                ...grid.state.storedItems,
                [itemType]: currentStored + amount
              },
              totalStored: (grid.state.totalStored || 0) + amount,
              lastTransaction: {
                itemType,
                amount,
                timestamp: Date.now(),
                entityId: entity.id
              }
            }
          });

          return {
            success: true,
            message: `Stored ${amount} ${itemType}(s) in silo`,
            energyCost
          };
        }
      }
    ];
  }

  // Get functions for a specific grid type
  getFunctionsForGridType(gridType: string): GridFunction[] {
    switch (gridType) {
      case 'farmland':
        return this.createFarmlandFunctions();
      case 'food':
        return this.createFoodFunctions();
      case 'silo':
        return this.createSiloFunctions();
      default:
        return [];
    }
  }

  // Initialize a grid with its functions and default state
  initializeGrid(gridType: string, gridId: string): Partial<GridTile> {
    const functions = this.getFunctionsForGridType(gridType);
    
    let defaultState: Record<string, any> = {};
    
    switch (gridType) {
      case 'farmland':
        defaultState = {
          status: FarmlandState.IDLE,
          isPlanted: false,
          isGrown: false,
          cropReady: false,
          plantType: null,
          cropAmount: 0
        };
        break;
      case 'food':
        defaultState = {
          status: FoodState.IDLE
        };
        break;
      case 'silo':
        defaultState = {
          status: SiloState.IDLE,
          storedItems: {},
          totalStored: 0
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
      case 'farmland':
        return {
          status: grid.state.status || FarmlandState.IDLE,
          isPlanted: grid.state.isPlanted || false,
          isGrown: grid.state.isGrown || false,
          cropReady: grid.state.cropReady || false,
          plantType: grid.state.plantType || null,
          cropAmount: grid.state.cropAmount || 0,
          progress: grid.taskState.progress ? this.taskManager.getGridProgress(grid.id) : 0
        };
      case 'food':
        return {
          status: grid.state.status || FoodState.IDLE,
          progress: grid.taskState.progress ? this.taskManager.getGridProgress(grid.id) : 0
        };
      case 'silo':
        return {
          status: grid.state.status || SiloState.IDLE,
          storedItems: grid.state.storedItems || {},
          totalStored: grid.state.totalStored || 0,
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