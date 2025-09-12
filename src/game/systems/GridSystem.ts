import { GridTypeDefinition, GridTile, GridFunction, Entity, ExecutionResult, FarmlandState, FoodState, SiloState } from '../../types/game';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '../../stores/gameStore';

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

// Plant data for farming
const PLANT_DATA = {
  wheat: {
    displayName: 'Wheat',
    growthTime: 10, // seconds
    harvestAmount: 1,
    energyCost: 2
  }
};

// =====================================================================
// PURE GRID SYSTEM - NO INTERNAL STATE
// =====================================================================
export class GridSystem {
  // No more internal state - everything goes through GameStore
  constructor() {
    // Pure function provider - no state to initialize
  }

  // =====================================================================
  // GRID ACCESS METHODS (SINGLE SOURCE OF TRUTH)
  // =====================================================================
  getGrid(gridId: string): GridTile | undefined {
    const store = useGameStore.getState();
    return store.grids.get(gridId);
  }

  getGrids(): GridTile[] {
    const store = useGameStore.getState();
    return Array.from(store.grids.values());
  }

  getGridsByType(type: string): GridTile[] {
    const store = useGameStore.getState();
    return store.getGridsByType(type);
  }

  getGridAt(x: number, y: number): GridTile | undefined {
    const store = useGameStore.getState();
    return store.getGridAt({ x, y });
  }

  // =====================================================================
  // GRID FUNCTION EXECUTION (CENTRALIZED TASK MANAGEMENT)
  // =====================================================================
  async executeGridFunction(gridId: string, functionName: string, entity: Entity, params: any[] = []): Promise<ExecutionResult> {
    const store = useGameStore.getState();
    const grid = store.grids.get(gridId);
    
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

  // =====================================================================
  // FARMLAND FUNCTIONS (USING CENTRALIZED TASK SYSTEM)
  // =====================================================================
  private createFarmlandFunctions(): GridFunction[] {
    return [
      {
        name: 'plant',
        description: 'Plant seeds on this farmland',
        parameters: [
          {
            name: 'seedType',
            type: 'string',
            required: true
          }
        ],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        blocksGrid: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          const store = useGameStore.getState();
          const seedType = params[0];
          
          console.log(`[GRID-SYSTEM] Plant function called: ${seedType} on grid ${grid.id}`);
          
          // Validate farmland state
          if (grid.state.status !== FarmlandState.IDLE) {
            return {
              success: false,
              message: `Cannot plant on farmland in ${grid.state.status} state`
            };
          }
          
          // Validate seed type
          const plantData = PLANT_DATA[seedType as keyof typeof PLANT_DATA];
          if (!plantData) {
            return {
              success: false,
              message: `Unknown seed type: ${seedType}`
            };
          }
          
          // Check entity energy
          if (entity.stats.energy < plantData.energyCost) {
            return {
              success: false,
              message: `Not enough energy to plant. Required: ${plantData.energyCost}, Available: ${entity.stats.energy}`
            };
          }
          
          console.log(`[GRID-SYSTEM] Starting planting task for ${seedType}`);
          
          // Calculate planting duration with speed multiplier
          const basePlantingDuration = 3; // 3 seconds base planting time
          const speedMultiplier = entity.stats.plantingSpeedMultiplier || 1;
          const actualPlantingDuration = basePlantingDuration * speedMultiplier;
          
          console.log(`[GRID-SYSTEM] Planting duration: ${actualPlantingDuration}s (base: ${basePlantingDuration}s, multiplier: ${speedMultiplier})`);
          
          // Start planting task using centralized system
          const plantingSuccess = store.startTask({
            type: 'entity',
            targetId: entity.id,
            taskName: 'planting',
            duration: actualPlantingDuration,
            description: `Planting ${plantData.displayName}...`,
            onComplete: () => {
              console.log(`[GRID-SYSTEM] Planting completed for grid ${grid.id}`);
              
              // Get fresh references after task completion
              const freshStore = useGameStore.getState();
              const freshGrid = freshStore.grids.get(grid.id);
              const freshEntity = freshStore.entities.get(entity.id);
              
              if (!freshGrid || !freshEntity) {
                console.error(`[GRID-SYSTEM] Grid or entity not found after planting completion`);
                return;
              }
              
              // Update farmland to growing state
              freshStore.updateGrid(grid.id, {
                state: {
                  ...freshGrid.state,
                  status: FarmlandState.GROWING,
                  isPlanted: true,
                  plantType: seedType,
                  isGrown: false,
                  cropReady: false,
                  cropAmount: 0
                }
              });
              
              // Consume entity energy
              freshStore.updateEntity(entity.id, {
                stats: {
                  ...freshEntity.stats,
                  energy: freshEntity.stats.energy - plantData.energyCost
                }
              });
              
              console.log(`[GRID-SYSTEM] Starting growth task for ${seedType} (${plantData.growthTime}s)`);
              
              // Start growth task using centralized system
              const growthTaskSuccess = freshStore.startTask({
                type: 'grid',
                targetId: grid.id,
                taskName: 'growing',
                duration: plantData.growthTime,
                description: `${plantData.displayName} growing...`,
                entityId: entity.id,
                onComplete: () => {
                  console.log(`[GRID-SYSTEM] Growth completed for grid ${grid.id}`);
                  
                  // Get fresh reference for growth completion
                  const growthStore = useGameStore.getState();
                  const growthGrid = growthStore.grids.get(grid.id);
                  
                  if (!growthGrid) {
                    console.error(`[GRID-SYSTEM] Grid not found after growth completion: ${grid.id}`);
                    return;
                  }
                  
                  console.log(`[GRID-SYSTEM] Updating grid ${grid.id} to READY state`);
                  
                  // Update to ready state
                  growthStore.updateGrid(grid.id, {
                    state: {
                      ...growthGrid.state,
                      status: FarmlandState.READY,
                      isGrown: true,
                      cropReady: true,
                      cropAmount: plantData.harvestAmount
                    }
                  });
                  
                  console.log(`[GRID-SYSTEM] Grid ${grid.id} growth completed successfully`);
                }
              });
              
              if (!growthTaskSuccess) {
                console.error(`[GRID-SYSTEM] Failed to start growth task for grid ${grid.id}`);
              } else {
                console.log(`[GRID-SYSTEM] Growth task started successfully for grid ${grid.id}`);
              }
            }
          });
          
          if (!plantingSuccess) {
            return {
              success: false,
              message: 'Cannot start planting task - entity may be busy'
            };
          }
          
          return {
            success: true,
            message: `Started planting ${plantData.displayName}`
          };
        }
      },
      {
        name: 'harvest',
        description: 'Harvest crops from this farmland',
        parameters: [],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        blocksGrid: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          const store = useGameStore.getState();
          
          console.log(`[GRID-SYSTEM] Harvest function called on grid ${grid.id}`);
          
          // Validate farmland state
          if (grid.state.status !== FarmlandState.READY || !grid.state.cropReady) {
            return {
              success: false,
              message: 'No crops ready for harvest'
            };
          }
          
          const baseCropAmount = grid.state.cropAmount || 1;
          const cropType = grid.state.plantType;
          // Apply entity's harvest amount upgrade
          const entityHarvestBonus = entity.stats.harvestAmount || 1;
          const cropAmount = baseCropAmount * entityHarvestBonus;
          
          console.log(`[GRID-SYSTEM] Starting harvest task for ${cropAmount} ${cropType} (base: ${baseCropAmount}, entity bonus: ${entityHarvestBonus})`);
          
          // Start harvesting task
          const harvestSuccess = store.startTask({
            type: 'entity',
            targetId: entity.id,
            taskName: 'harvesting',
            duration: 2, // 2 seconds to harvest
            description: `Harvesting ${cropType}...`,
            onComplete: () => {
              console.log(`[GRID-SYSTEM] Harvesting completed for grid ${grid.id}`);
              
              // Get fresh references
              const freshStore = useGameStore.getState();
              const freshGrid = freshStore.grids.get(grid.id);
              
              if (!freshGrid) {
                console.error(`[GRID-SYSTEM] Grid not found after harvest completion`);
                return;
              }
              
              // Reset farmland to idle state
              freshStore.updateGrid(grid.id, {
                state: {
                  ...freshGrid.state,
                  status: FarmlandState.IDLE,
                  isPlanted: false,
                  isGrown: false,
                  cropReady: false,
                  plantType: null,
                  cropAmount: 0
                }
              });
              
              // Add resources to global store
              if (cropType === 'wheat') {
                const currentWheat = freshStore.globalResources.wheat;
                freshStore.updateResources({ wheat: currentWheat + cropAmount });
                console.log(`[GRID-SYSTEM] Added ${cropAmount} wheat to resources`);
              }
            }
          });
          
          if (!harvestSuccess) {
            return {
              success: false,
              message: 'Cannot start harvesting task - entity may be busy'
            };
          }
          
          return {
            success: true,
            message: `Started harvesting ${cropType}`
          };
        }
      }
    ];
  }

  // =====================================================================
  // FOOD FUNCTIONS
  // =====================================================================
  private createFoodFunctions(): GridFunction[] {
    return [
      {
        name: 'eat',
        description: 'Eat food to restore energy',
        parameters: [],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        execute: async (entity: Entity, params: any[], grid: GridTile): Promise<ExecutionResult> => {
          const store = useGameStore.getState();
          
          // Check if entity needs energy
          if (entity.stats.energy >= entity.stats.maxEnergy) {
            return {
              success: false,
              message: 'Energy is already full'
            };
          }
          
          // Check if we have wheat to consume
          if (store.globalResources.wheat < 1) {
            return {
              success: false,
              message: 'No wheat available to eat'
            };
          }
          
          console.log(`[GRID-SYSTEM] Starting eating task for entity ${entity.id}`);
          
          // Start eating task
          const eatSuccess = store.startTask({
            type: 'entity',
            targetId: entity.id,
            taskName: 'eating',
            duration: 2, // 2 seconds to eat
            description: 'Eating wheat...',
            onComplete: () => {
              console.log(`[GRID-SYSTEM] Eating completed for entity ${entity.id}`);
              
              // Get fresh references
              const freshStore = useGameStore.getState();
              const freshEntity = freshStore.entities.get(entity.id);
              
              if (!freshEntity) {
                console.error(`[GRID-SYSTEM] Entity not found after eating completion`);
                return;
              }
              
              // Restore energy
              const energyToRestore = Math.min(20, freshEntity.stats.maxEnergy - freshEntity.stats.energy);
              freshStore.updateEntity(entity.id, {
                stats: {
                  ...freshEntity.stats,
                  energy: freshEntity.stats.energy + energyToRestore
                }
              });
              
              // Consume wheat
              const currentWheat = freshStore.globalResources.wheat;
              freshStore.updateResources({ wheat: Math.max(0, currentWheat - 1) });
              
              console.log(`[GRID-SYSTEM] Restored ${energyToRestore} energy, consumed 1 wheat`);
            }
          });
          
          if (!eatSuccess) {
            return {
              success: false,
              message: 'Cannot start eating task - entity may be busy'
            };
          }
          
          return {
            success: true,
            message: 'Started eating wheat'
          };
        }
      }
    ];
  }

  // =====================================================================
  // SILO FUNCTIONS
  // =====================================================================
  private createSiloFunctions(): GridFunction[] {
    return [
      {
        name: 'store',
        description: 'Store items in the silo',
        parameters: [
          {
            name: 'itemType',
            type: 'string',
            required: true
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
          const itemType = params[0];
          const amount = params[1] || 1;
          
          const store = useGameStore.getState();
          
          // Check if we have the resource to store
          const currentAmount = store.globalResources[itemType as keyof typeof store.globalResources] || 0;
          if (currentAmount < amount) {
            return {
              success: false,
              message: `Not enough ${itemType} to store. Available: ${currentAmount}, Requested: ${amount}`
            };
          }
          
          // Update silo storage
          const newStoredItems = {
            ...grid.state.storedItems,
            [itemType]: (grid.state.storedItems[itemType] || 0) + amount
          };
          
          const newTotalStored = grid.state.totalStored + amount;
          
          store.updateGrid(grid.id, {
            state: {
              ...grid.state,
              storedItems: newStoredItems,
              totalStored: newTotalStored
            }
          });
          
          // Remove from global resources
          store.updateResources({
            [itemType]: currentAmount - amount
          } as any);
          
          return {
            success: true,
            message: `Stored ${amount} ${itemType} in silo`
          };
        }
      }
    ];
  }

  // =====================================================================
  // GRID TYPE FUNCTION MAPPING
  // =====================================================================
  public getFunctionsForGridType(gridType: string): GridFunction[] {
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

  // =====================================================================
  // GRID INITIALIZATION (PURE FUNCTION)
  // =====================================================================
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

  // =====================================================================
  // GRID STATUS FOR SCANNER (USING CENTRALIZED TASK PROGRESS)
  // =====================================================================
  getGridStatus(grid: GridTile): any {
    const store = useGameStore.getState();
    
    switch (grid.type) {
      case 'farmland':
        return {
          status: grid.state.status || FarmlandState.IDLE,
          isPlanted: grid.state.isPlanted || false,
          isGrown: grid.state.isGrown || false,
          cropReady: grid.state.cropReady || false,
          plantType: grid.state.plantType || null,
          cropAmount: grid.state.cropAmount || 0,
          progress: grid.taskState.progress ? store.getTaskProgress(grid.id) : 0
        };
      case 'food':
        return {
          status: grid.state.status || FoodState.IDLE,
          progress: grid.taskState.progress ? store.getTaskProgress(grid.id) : 0
        };
      case 'silo':
        return {
          status: grid.state.status || SiloState.IDLE,
          storedItems: grid.state.storedItems || {},
          totalStored: grid.state.totalStored || 0,
          progress: grid.taskState.progress ? store.getTaskProgress(grid.id) : 0
        };
      default:
        return {
          status: 'unknown',
          progress: 0
        };
    }
  }
}

// =====================================================================
// DEFAULT GRID TYPE REGISTRATION
// =====================================================================
export function initializeDefaultGridTypes() {
  // Register farmland grid type
  GridTypeRegistry.registerGridType({
    type: 'farmland',
    name: 'Farmland',
    description: 'A plot of land for growing crops',
    category: 'farming',
    defaultProperties: {
      fertility: 1.0,
      soilType: 'loam'
    },
    defaultState: {
      status: FarmlandState.IDLE,
      isPlanted: false,
      isGrown: false,
      cropReady: false,
      plantType: null,
      cropAmount: 0
    },
    functions: [
      {
        name: 'plant',
        description: 'Plant seeds on this farmland',
        parameters: [
          {
            name: 'seedType',
            type: 'string',
            required: true
          }
        ],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        blocksGrid: true
      },
      {
        name: 'harvest',
        description: 'Harvest crops from this farmland',
        parameters: [],
        requiresEntityOnGrid: true,
        blocksEntity: true,
        blocksGrid: true
      }
    ],
    spriteKey: 'farmland_idle'
  });

  // Register food station grid type
  GridTypeRegistry.registerGridType({
    type: 'food',
    name: 'Food Station',
    description: 'A station for eating and restoring energy',
    category: 'utility',
    defaultProperties: {
      capacity: 10
    },
    defaultState: {
      status: FoodState.IDLE
    },
    functions: [
      {
        name: 'eat',
        description: 'Eat food to restore energy',
        parameters: [],
        requiresEntityOnGrid: true,
        blocksEntity: true
      }
    ],
    spriteKey: 'food_station'
  });

  // Register silo grid type
  GridTypeRegistry.registerGridType({
    type: 'silo',
    name: 'Storage Silo',
    description: 'A large container for storing harvested crops',
    category: 'storage',
    defaultProperties: {
      capacity: 1000
    },
    defaultState: {
      status: SiloState.IDLE,
      storedItems: {},
      totalStored: 0
    },
    functions: [
      {
        name: 'store',
        description: 'Store items in the silo',
        parameters: [
          {
            name: 'itemType',
            type: 'string',
            required: true
          },
          {
            name: 'amount',
            type: 'number',
            required: false,
            default: 1
          }
        ],
        requiresEntityOnGrid: true
      }
    ],
    spriteKey: 'silo'
  });

  console.log('[GRID-SYSTEM] Default grid types registered');
}

// Export both named and default exports for compatibility
export default GridSystem;