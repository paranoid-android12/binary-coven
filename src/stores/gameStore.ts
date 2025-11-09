import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Entity, GridTile, CodeWindow, Position, ExecutionContext, TaskState, ProgressInfo, FarmlandState } from '../types/game';
import { Quest, QuestProgress, QuestState } from '../types/quest';
import { EventBus } from '../game/EventBus';
import QuestManager from '../game/systems/QuestManager';

// =====================================================================
// CENTRALIZED STATE INTERFACES
// =====================================================================

export interface GameState {
  isTutorialDone: boolean;
  gridSize: { width: number; height: number };
  grids: Map<string, GridTile>;
  entities: Map<string, Entity>;
  activeEntityId: string;
  codeWindows: Map<string, CodeWindow>; // Player's code windows
  mainWindowId: string; // Player's main window
  globalResources: {
    wheat: number;
    energy: number;
  };
  executionContext?: ExecutionContext;
  selectedCodeWindow?: string;
  isPaused: boolean;
  gameSpeed: number;

  // Drone system
  activeDroneId?: string; // Currently selected drone for programming
  droneExecutors: Map<string, any>; // CodeExecutor instances for each drone

  // Challenge Grid system
  challengeGridPositions: Set<string>; // Set of position strings "x,y" for challenge grids
  isChallengeMode: boolean; // Whether challenge mode is currently active

  // =====================================================================
  // QUEST SYSTEM
  // =====================================================================
  activeQuest: Quest | null; // Currently active quest
  questProgress: Map<string, QuestProgress>; // Progress for all quests
  availableQuests: Quest[]; // Quests available to start
  unlockedQuests: Set<string>; // Set of unlocked quest IDs

  // =====================================================================
  // CENTRALIZED TASK SYSTEM
  // =====================================================================
  activeTasks: Map<string, {
    id: string;
    type: 'entity' | 'grid';
    targetId: string;
    taskName: string;
    description: string;
    startTime: number;
    duration: number;
    onComplete?: () => void;
    entityId?: string;
  }>;

  // Global timer for task management
  taskTimer?: NodeJS.Timeout;
}

export interface GameStore extends GameState {
  // =====================================================================
  // GRID MANAGEMENT (SINGLE SOURCE OF TRUTH)
  // =====================================================================
  addGrid: (gridData: Omit<GridTile, 'id'> & { id?: string }) => string;
  removeGrid: (gridId: string) => void;
  updateGrid: (gridId: string, updates: Partial<GridTile>) => void;
  getGridAt: (position: Position) => GridTile | undefined;
  getGridsByType: (type: string) => GridTile[];
  
  // Challenge Grid management
  activateChallengeGrid: (position: Position) => void;
  deactivateChallengeGrid: (position: Position) => void;
  activateChallengeGrids: (positions: Position[]) => void;
  deactivateAllChallengeGrids: () => void;
  isChallengeGridAt: (position: Position) => boolean;
  isPlayerOnChallengeGrid: () => boolean;
  
  // =====================================================================
  // ENTITY MANAGEMENT
  // =====================================================================
  addEntity: (entityData: Omit<Entity, 'id'> & { id?: string }) => string;
  removeEntity: (entityId: string) => void;
  updateEntity: (entityId: string, updates: Partial<Entity>) => void;
  setActiveEntity: (entityId: string) => void;
  forceUnblockEntity: (entityId: string) => void;
  
  // =====================================================================
  // DRONE MANAGEMENT
  // =====================================================================
  setActiveDrone: (droneId?: string) => void;
  getDroneCodeWindows: (droneId: string) => Map<string, CodeWindow> | undefined;
  updateDroneCodeWindow: (droneId: string, windowId: string, updates: Partial<CodeWindow>) => void;
  addDroneCodeWindow: (droneId: string, codeWindow: Omit<CodeWindow, 'id'> & { id?: string }) => string;
  removeDroneCodeWindow: (droneId: string, windowId: string) => void;
  
  // =====================================================================
  // CENTRALIZED TASK MANAGEMENT
  // =====================================================================
  startTask: (params: {
    type: 'entity' | 'grid';
    targetId: string;
    taskName: string;
    duration: number;
    description: string;
    entityId?: string;
    onComplete?: () => void;
    initialProgress?: number; // For resuming tasks from saved progress (0-100)
  }) => boolean;
  completeTask: (taskId: string) => void;
  cancelTask: (taskId: string) => void;
  cancelAllTasks: () => void;
  getTaskProgress: (targetId: string) => number;
  canPerformAction: (entityId?: string, gridId?: string) => boolean;
  
  // =====================================================================
  // CODE WINDOW MANAGEMENT
  // =====================================================================
  addCodeWindow: (codeWindow: Omit<CodeWindow, 'id'> & { id?: string }) => string;
  removeCodeWindow: (windowId: string) => void;
  updateCodeWindow: (windowId: string, updates: Partial<CodeWindow>) => void;
  setMainWindow: (windowId: string) => void;
  setSelectedCodeWindow: (windowId: string) => void;
  
  // =====================================================================
  // EXECUTION MANAGEMENT
  // =====================================================================
  setExecutionContext: (context: ExecutionContext) => void;
  clearExecutionContext: () => void;
  setPaused: (paused: boolean) => void;
  setGameSpeed: (speed: number) => void;
  
  // =====================================================================
  // RESOURCE MANAGEMENT
  // =====================================================================
  updateResources: (resources: Partial<GameState['globalResources']>) => void;

  // =====================================================================
  // QUEST MANAGEMENT
  // =====================================================================
  loadQuests: (questFilePaths: string[]) => Promise<void>;
  startQuest: (questId: string) => boolean;
  cancelQuest: () => boolean;
  restartQuest: () => boolean;
  getActiveQuest: () => Quest | null;
  getAvailableQuests: () => Quest[];
  getCompletedQuests: () => Quest[];
  getQuestProgress: (questId: string) => QuestProgress | undefined;
  isQuestUnlocked: (questId: string) => boolean;
  isQuestStuck: () => { isStuck: boolean; reason?: string; timeStuck?: number };
  getCurrentPhaseTime: () => number;
  refreshQuestState: () => void;

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================
  reset: () => void;
  initializeTaskSystem: () => void;
  cleanupTaskSystem: () => void;
}

// =====================================================================
// INITIAL STATE FACTORY
// =====================================================================
const createInitialState = (): GameState => ({
  isTutorialDone: true,
  gridSize: { width: 52, height: 32 },
  grids: new Map(),
  entities: new Map(),
  activeEntityId: '',
  codeWindows: new Map(),
  mainWindowId: '',
  globalResources: {
    wheat: 0,
    energy: 100
  },
  executionContext: undefined,
  selectedCodeWindow: undefined,
  isPaused: false,
  gameSpeed: 1.0,
  activeTasks: new Map(),
  taskTimer: undefined,
  activeDroneId: undefined,
  droneExecutors: new Map(),
  challengeGridPositions: new Set(),
  isChallengeMode: false,

  // Quest system
  activeQuest: null,
  questProgress: new Map(),
  availableQuests: [],
  unlockedQuests: new Set()
});

// =====================================================================
// CENTRALIZED TASK SYSTEM LOGIC
// =====================================================================
const createTaskSystem = (set: any, get: any) => ({
  initializeTaskSystem: () => {
    const state = get();
    if (state.taskTimer) {
      clearInterval(state.taskTimer);
    }
    
    // Single centralized timer that checks all tasks
    const timer = setInterval(() => {
      const currentState = get();
      const now = Date.now();
      const tasksToComplete: string[] = [];
      
             // Check all active tasks for completion
       currentState.activeTasks.forEach((task: any, taskId: string) => {
         const elapsed = now - task.startTime;
         if (elapsed >= task.duration) {
           tasksToComplete.push(taskId);
         }
       });
      
      // Complete all ready tasks
      tasksToComplete.forEach(taskId => {
        currentState.completeTask(taskId);
      });
    }, 100); // Check every 100ms for smooth progress
    
    set({ taskTimer: timer });
  },
  
  cleanupTaskSystem: () => {
    const state = get();
    if (state.taskTimer) {
      clearInterval(state.taskTimer);
      set({ taskTimer: undefined });
    }
  },
  
  startTask: (params: {
    type: 'entity' | 'grid';
    targetId: string;
    taskName: string;
    duration: number;
    description: string;
    entityId?: string;
    onComplete?: () => void;
    initialProgress?: number; // For resuming tasks from saved progress (0-100)
  }) => {
    const state = get();
    
    // Check if target can perform action
    if (!state.canPerformAction(
      params.type === 'entity' ? params.targetId : params.entityId,
      params.type === 'grid' ? params.targetId : undefined
    )) {
      return false;
    }
    
    const taskId = uuidv4();
    const currentTime = Date.now();
    
    // If we have initial progress, adjust the start time to reflect that progress
    let adjustedStartTime = currentTime;
    if (params.initialProgress && params.initialProgress > 0) {
      const totalDurationMs = params.duration * 1000;
      const elapsedMs = (params.initialProgress / 100) * totalDurationMs;
      adjustedStartTime = currentTime - elapsedMs;
    }
    
    const task = {
      id: taskId,
      type: params.type,
      targetId: params.targetId,
      taskName: params.taskName,
      description: params.description,
      startTime: adjustedStartTime,
      duration: params.duration * 1000, // Convert to milliseconds
      onComplete: params.onComplete,
      entityId: params.entityId
    };
    
    // Create progress info
    const progress: ProgressInfo = {
      isActive: true,
      startTime: task.startTime,
      duration: task.duration,
      description: params.description,
      entityId: params.entityId
    };
    
    const taskState: TaskState = {
      isBlocked: true,
      currentTask: params.taskName,
      progress
    };
    
    set((state: GameState) => {
      // Add task to active tasks
      const newActiveTasks = new Map(state.activeTasks);
      newActiveTasks.set(taskId, task);
      
      // Update target with task state
      if (params.type === 'entity') {
        const entity = state.entities.get(params.targetId);
        if (entity) {
          const newEntities = new Map(state.entities);
          newEntities.set(params.targetId, { ...entity, taskState });
          return { activeTasks: newActiveTasks, entities: newEntities };
        }
      } else {
        const grid = state.grids.get(params.targetId);
        if (grid) {
          const newGrids = new Map(state.grids);
          newGrids.set(params.targetId, { ...grid, taskState });
          return { activeTasks: newActiveTasks, grids: newGrids };
        }
      }
      
      return { activeTasks: newActiveTasks };
    });
    
    console.log(`[TASK-SYSTEM] Started ${params.type} task: ${params.taskName} for ${params.targetId} (${params.duration}s)`);
    return true;
  },
  
  completeTask: (taskId: string) => {
    const state = get();
    const task = state.activeTasks.get(taskId);
    
    if (!task) return;
    
    console.log(`[TASK-SYSTEM] Completing task: ${task.taskName} for ${task.targetId}`);
    
    // Clear task state FIRST so that completion callbacks can start new tasks
    const clearedTaskState: TaskState = {
      isBlocked: false,
      currentTask: undefined,
      progress: undefined
    };
    
    set((state: GameState) => {
      // Remove from active tasks
      const newActiveTasks = new Map(state.activeTasks);
      newActiveTasks.delete(taskId);
      
      // Clear task state from target
      if (task.type === 'entity') {
        const entity = state.entities.get(task.targetId);
        if (entity) {
          const newEntities = new Map(state.entities);
          newEntities.set(task.targetId, { ...entity, taskState: clearedTaskState });
          return { activeTasks: newActiveTasks, entities: newEntities };
        }
      } else {
        const grid = state.grids.get(task.targetId);
        if (grid) {
          const newGrids = new Map(state.grids);
          newGrids.set(task.targetId, { ...grid, taskState: clearedTaskState });
          return { activeTasks: newActiveTasks, grids: newGrids };
        }
      }
      
      return { activeTasks: newActiveTasks };
    });
    
    // Execute completion callback AFTER clearing task state
    try {
      if (task.onComplete) {
        task.onComplete();
      }
    } catch (error) {
      console.error(`[TASK-SYSTEM] Error in completion callback for task ${taskId}:`, error);
    }
    
    console.log(`[TASK-SYSTEM] Task completed: ${task.taskName} for ${task.targetId}`);
  },
  
  cancelTask: (taskId: string) => {
    const state = get();
    const task = state.activeTasks.get(taskId);
    
    if (!task) return;
    
    console.log(`[TASK-SYSTEM] Cancelling task: ${task.taskName} for ${task.targetId}`);
    
    // Clear task state
    const clearedTaskState: TaskState = {
      isBlocked: false,
      currentTask: undefined,
      progress: undefined
    };
    
    set((state: GameState) => {
      // Remove from active tasks
      const newActiveTasks = new Map(state.activeTasks);
      newActiveTasks.delete(taskId);
      
      // Clear task state from target
      if (task.type === 'entity') {
        const entity = state.entities.get(task.targetId);
        if (entity) {
          const newEntities = new Map(state.entities);
          newEntities.set(task.targetId, { ...entity, taskState: clearedTaskState });
          return { activeTasks: newActiveTasks, entities: newEntities };
        }
      } else {
        const grid = state.grids.get(task.targetId);
        if (grid) {
          const newGrids = new Map(state.grids);
          newGrids.set(task.targetId, { ...grid, taskState: clearedTaskState });
          return { activeTasks: newActiveTasks, grids: newGrids };
        }
      }
      
      return { activeTasks: newActiveTasks };
    });
  },
  
  cancelAllTasks: () => {
    const state = get();
    console.log(`[TASK-SYSTEM] Cancelling all tasks (${state.activeTasks.size} active)`);
    
    // Get all task IDs to cancel
    const taskIds = Array.from(state.activeTasks.keys());
    
    // Cancel each task
    taskIds.forEach(taskId => {
      state.cancelTask(taskId);
    });
  },
  
  getTaskProgress: (targetId: string) => {
    const state = get();
    
    // Find active task for this target
    let activeTask = null;
    for (const task of state.activeTasks.values()) {
      if (task.targetId === targetId) {
        activeTask = task;
        break;
      }
    }
    
    if (!activeTask) return 0;
    
    const elapsed = Date.now() - activeTask.startTime;
    return Math.min(100, (elapsed / activeTask.duration) * 100);
  },
  
  canPerformAction: (entityId?: string, gridId?: string) => {
    const state = get();
    
    if (entityId) {
      const entity = state.entities.get(entityId);
      return entity ? !entity.taskState.isBlocked : false;
    }
    
    if (gridId) {
      const grid = state.grids.get(gridId);
      return grid ? !grid.taskState.isBlocked : false;
    }
    
    return false;
  }
});

// =====================================================================
// MAIN STORE CREATION
// =====================================================================
export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    ...createInitialState(),
    ...createTaskSystem(set, get),
    
    // =====================================================================
    // GRID MANAGEMENT
    // =====================================================================
    addGrid: (gridData: Omit<GridTile, 'id'> & { id?: string }) => {
      const id = gridData.id || uuidv4();
      const { id: _, ...cleanGridData } = gridData;
      const grid: GridTile = { ...cleanGridData, id };
      
      set((state: GameState) => ({
        grids: new Map(state.grids).set(id, grid)
      }));
      
      console.log(`[STORE] Added grid: ${grid.name} (${grid.type}) at (${grid.position.x}, ${grid.position.y})`);
      return id;
    },

    removeGrid: (gridId: string) => {
      set((state: GameState) => {
        const newGrids = new Map(state.grids);
        const grid = newGrids.get(gridId);
        newGrids.delete(gridId);
        
        if (grid) {
          console.log(`[STORE] Removed grid: ${grid.name} (${grid.type})`);
          
          // Emit cleanup event for sprite management (Phaser best practice)
          EventBus.emit('grid-removed', gridId);
        }
        
        return { grids: newGrids };
      });
    },

    updateGrid: (gridId: string, updates: Partial<GridTile>) => {
      set((state: GameState) => {
        const grid = state.grids.get(gridId);
        if (!grid) {
          console.warn(`[STORE] updateGrid: Grid ${gridId} not found`);
          return state;
        }
        
        // Deep merge for nested objects
        const updatedGrid = {
          ...grid,
          ...updates,
          state: {
            ...grid.state,
            ...updates.state
          },
          taskState: {
            ...grid.taskState,
            ...updates.taskState
          }
        };
        
        const newGrids = new Map(state.grids);
        newGrids.set(gridId, updatedGrid);
        
        console.log(`[STORE] Updated grid ${gridId}:`, {
          type: updatedGrid.type,
          status: updatedGrid.state?.status,
          taskActive: updatedGrid.taskState?.progress?.isActive
        });
        
        return { grids: newGrids };
      });
    },

    getGridAt: (position: Position) => {
      const state = get();
      for (const grid of state.grids.values()) {
        if (grid.position.x === position.x && grid.position.y === position.y) {
          return grid;
        }
      }
      return undefined;
    },

    getGridsByType: (type: string) => {
      const state = get();
      return Array.from(state.grids.values()).filter(grid => grid.type === type);
    },

    // =====================================================================
    // CHALLENGE GRID MANAGEMENT
    // =====================================================================
    activateChallengeGrid: (position: Position) => {
      const posKey = `${position.x},${position.y}`;

      // Update the grid tile itself
      const grid = get().getGridAt(position);
      if (grid) {
        get().updateGrid(grid.id, { isChallengeGrid: true });
      }

      set((state: GameState) => {
        const newChallengeGrids = new Set(state.challengeGridPositions);
        newChallengeGrids.add(posKey);

        console.log(`[CHALLENGE] Activated challenge grid at (${position.x}, ${position.y})`);
        return {
          challengeGridPositions: newChallengeGrids,
          isChallengeMode: true
        };
      });

      // Emit event for visual updates
      EventBus.emit('challenge-grid-activated', { position });
    },

    deactivateChallengeGrid: (position: Position) => {
      const posKey = `${position.x},${position.y}`;

      // Update the grid tile itself
      const grid = get().getGridAt(position);
      if (grid) {
        get().updateGrid(grid.id, { isChallengeGrid: false });
      }

      set((state: GameState) => {
        const newChallengeGrids = new Set(state.challengeGridPositions);
        newChallengeGrids.delete(posKey);

        console.log(`[CHALLENGE] Deactivated challenge grid at (${position.x}, ${position.y})`);
        return {
          challengeGridPositions: newChallengeGrids,
          isChallengeMode: newChallengeGrids.size > 0
        };
      });

      // Emit event for visual updates
      EventBus.emit('challenge-grid-deactivated', { position });
    },

    activateChallengeGrids: (positions: Position[]) => {
      positions.forEach(position => {
        get().activateChallengeGrid(position);
      });
      console.log(`[CHALLENGE] Activated ${positions.length} challenge grids`);
    },

    deactivateAllChallengeGrids: () => {
      const state = get();
      const positions = Array.from(state.challengeGridPositions).map(posKey => {
        const [x, y] = posKey.split(',').map(Number);
        return { x, y };
      });
      
      positions.forEach(position => {
        state.deactivateChallengeGrid(position);
      });
      
      set({ 
        challengeGridPositions: new Set(),
        isChallengeMode: false
      });
      
      console.log('[CHALLENGE] Deactivated all challenge grids');
      EventBus.emit('challenge-mode-ended');
    },

    isChallengeGridAt: (position: Position) => {
      const state = get();
      const posKey = `${position.x},${position.y}`;
      return state.challengeGridPositions.has(posKey);
    },

    isPlayerOnChallengeGrid: () => {
      const state = get();
      const activeEntity = state.entities.get(state.activeEntityId);
      if (!activeEntity) return false;
      return state.isChallengeGridAt(activeEntity.position);
    },

    // =====================================================================
    // ENTITY MANAGEMENT
    // =====================================================================
    addEntity: (entityData: Omit<Entity, 'id'> & { id?: string }) => {
      const id = entityData.id || uuidv4();
      const { id: _, ...cleanEntityData } = entityData;
      const entity: Entity = { ...cleanEntityData, id };
      
      set((state: GameState) => ({
        entities: new Map(state.entities).set(id, entity)
      }));
      
      console.log(`[STORE] Added entity: ${entity.name} (${entity.type}) at (${entity.position.x}, ${entity.position.y})`);
      return id;
    },

    removeEntity: (entityId: string) => {
      set((state: GameState) => {
        const newEntities = new Map(state.entities);
        const entity = newEntities.get(entityId);
        newEntities.delete(entityId);
        
        if (entity) {
          console.log(`[STORE] Removed entity: ${entity.name} (${entity.type})`);
          
          // Emit cleanup event for sprite management (Phaser best practice)
          EventBus.emit('entity-removed', entityId);
        }
        
        return { 
          entities: newEntities,
          activeEntityId: state.activeEntityId === entityId ? '' : state.activeEntityId
        };
      });
    },

    updateEntity: (entityId: string, updates: Partial<Entity>) => {
      set((state: GameState) => {
        const entity = state.entities.get(entityId);
        if (!entity) {
          console.warn(`[STORE] updateEntity: Entity ${entityId} not found`);
          return state;
        }
        
        // Deep merge for nested objects
        const updatedEntity = {
          ...entity,
          ...updates,
          stats: {
            ...entity.stats,
            ...updates.stats
          },
          inventory: {
            ...entity.inventory,
            ...updates.inventory
          },
          taskState: {
            ...entity.taskState,
            ...updates.taskState
          }
        };
        
        const newEntities = new Map(state.entities);
        newEntities.set(entityId, updatedEntity);
        
        console.log(`[STORE] Updated entity ${entityId}:`, {
          name: updatedEntity.name,
          position: updatedEntity.position,
          taskActive: updatedEntity.taskState?.progress?.isActive
        });
        
        return { entities: newEntities };
      });
    },

    setActiveEntity: (entityId: string) => {
      set({ activeEntityId: entityId });
      console.log(`[STORE] Set active entity: ${entityId}`);
    },

    forceUnblockEntity: (entityId: string) => {
      const state = get();
      const entity = state.entities.get(entityId);
      
      if (!entity) return;
      
      // Cancel any active tasks for this entity
      const tasksToCancel: string[] = [];
      state.activeTasks.forEach((task, taskId) => {
        if (task.type === 'entity' && task.targetId === entityId) {
          tasksToCancel.push(taskId);
        }
      });
      
      tasksToCancel.forEach(taskId => {
        state.cancelTask(taskId);
      });
      
      console.log(`[STORE] Force unblocked entity: ${entityId}`);
    },

    // =====================================================================
    // CODE WINDOW MANAGEMENT
    // =====================================================================
    addCodeWindow: (codeWindow: Omit<CodeWindow, 'id'> & { id?: string }) => {
      const id = codeWindow.id || uuidv4();
      const { id: _, ...cleanWindowData } = codeWindow;
      const window: CodeWindow = { ...cleanWindowData, id };
      
      set((state: GameState) => ({
        codeWindows: new Map(state.codeWindows).set(id, window)
      }));
      
      console.log(`[STORE] Added code window: ${window.name}`);
      return id;
    },

    removeCodeWindow: (windowId: string) => {
      set((state: GameState) => {
        const newCodeWindows = new Map(state.codeWindows);
        const window = newCodeWindows.get(windowId);
        newCodeWindows.delete(windowId);
        
        if (window) {
          console.log(`[STORE] Removed code window: ${window.name}`);
        }
        
        return {
          codeWindows: newCodeWindows,
          mainWindowId: state.mainWindowId === windowId ? '' : state.mainWindowId,
          selectedCodeWindow: state.selectedCodeWindow === windowId ? undefined : state.selectedCodeWindow
        };
      });
    },

    updateCodeWindow: (windowId: string, updates: Partial<CodeWindow>) => {
      set((state: GameState) => {
        const window = state.codeWindows.get(windowId);
        if (!window) {
          console.warn(`[STORE] updateCodeWindow: Window ${windowId} not found`);
          return state;
        }
        
        const updatedWindow = { ...window, ...updates };
        const newCodeWindows = new Map(state.codeWindows);
        newCodeWindows.set(windowId, updatedWindow);
        
        console.log(`[STORE] Updated code window: ${updatedWindow.name}`);
        return { codeWindows: newCodeWindows };
      });
    },

    setMainWindow: (windowId: string) => {
      set({ mainWindowId: windowId });
      console.log(`[STORE] Set main window: ${windowId}`);
    },

    setSelectedCodeWindow: (windowId: string) => {
      set({ selectedCodeWindow: windowId });
    },

    // =====================================================================
    // EXECUTION MANAGEMENT
    // =====================================================================
    setExecutionContext: (context: ExecutionContext) => {
      set({ executionContext: context });
    },

    clearExecutionContext: () => {
      set({ executionContext: undefined });
    },

    setPaused: (paused: boolean) => {
      set({ isPaused: paused });
    },

    setGameSpeed: (speed: number) => {
      set({ gameSpeed: speed });
    },

    // =====================================================================
    // RESOURCE MANAGEMENT
    // =====================================================================
    updateResources: (resources: Partial<GameState['globalResources']>) => {
      set((state: GameState) => ({
        globalResources: { ...state.globalResources, ...resources }
      }));
    },

    // =====================================================================
    // DRONE MANAGEMENT
    // =====================================================================
    setActiveDrone: (droneId?: string) => {
      set({ activeDroneId: droneId });
      if (droneId) {
        console.log(`[STORE] Set active drone: ${droneId}`);
      } else {
        console.log('[STORE] Cleared active drone');
      }
    },

    getDroneCodeWindows: (droneId: string) => {
      const state = get();
      const drone = state.entities.get(droneId);
      return drone?.codeWindows;
    },

    updateDroneCodeWindow: (droneId: string, windowId: string, updates: Partial<CodeWindow>) => {
      const state = get();
      const drone = state.entities.get(droneId);
      
      if (!drone || !drone.codeWindows) {
        console.warn(`[STORE] updateDroneCodeWindow: Drone ${droneId} not found or has no code windows`);
        return;
      }

      const window = drone.codeWindows.get(windowId);
      if (!window) {
        console.warn(`[STORE] updateDroneCodeWindow: Window ${windowId} not found in drone ${droneId}`);
        return;
      }

      const updatedWindow = { ...window, ...updates };
      const newCodeWindows = new Map(drone.codeWindows);
      newCodeWindows.set(windowId, updatedWindow);

      state.updateEntity(droneId, { codeWindows: newCodeWindows });
      console.log(`[STORE] Updated drone code window: ${updatedWindow.name} for drone ${droneId}`);
    },

    addDroneCodeWindow: (droneId: string, codeWindow: Omit<CodeWindow, 'id'> & { id?: string }) => {
      const state = get();
      const drone = state.entities.get(droneId);
      
      if (!drone || !drone.codeWindows) {
        console.warn(`[STORE] addDroneCodeWindow: Drone ${droneId} not found or has no code windows`);
        return '';
      }

      const id = codeWindow.id || uuidv4();
      const { id: _, ...cleanWindowData } = codeWindow;
      const window: CodeWindow = { ...cleanWindowData, id };

      const newCodeWindows = new Map(drone.codeWindows);
      newCodeWindows.set(id, window);

      state.updateEntity(droneId, { codeWindows: newCodeWindows });
      console.log(`[STORE] Added drone code window: ${window.name} for drone ${droneId}`);
      return id;
    },

    removeDroneCodeWindow: (droneId: string, windowId: string) => {
      const state = get();
      const drone = state.entities.get(droneId);
      
      if (!drone || !drone.codeWindows) {
        console.warn(`[STORE] removeDroneCodeWindow: Drone ${droneId} not found or has no code windows`);
        return;
      }

      const window = drone.codeWindows.get(windowId);
      if (!window) {
        console.warn(`[STORE] removeDroneCodeWindow: Window ${windowId} not found in drone ${droneId}`);
        return;
      }

      if (window.isMain) {
        console.warn(`[STORE] Cannot remove main window for drone ${droneId}`);
        return;
      }

      const newCodeWindows = new Map(drone.codeWindows);
      newCodeWindows.delete(windowId);

      state.updateEntity(droneId, { codeWindows: newCodeWindows });
      console.log(`[STORE] Removed drone code window: ${window.name} from drone ${droneId}`);
    },

    // =====================================================================
    // QUEST MANAGEMENT
    // =====================================================================
    loadQuests: async (questFilePaths: string[]) => {
      const questManager = QuestManager.getInstance();
      await questManager.loadQuests(questFilePaths);

      // Update local state
      const availableQuests = questManager.getAvailableQuests();
      const unlockedQuestIds = questManager.getAllQuests()
        .filter(q => questManager.isQuestUnlocked(q.id))
        .map(q => q.id);

      set({
        availableQuests,
        unlockedQuests: new Set(unlockedQuestIds)
      });

      console.log('[STORE] Quests loaded and state updated');
    },

    startQuest: (questId: string) => {
      const questManager = QuestManager.getInstance();
      const success = questManager.startQuest(questId);

      if (success) {
        const quest = questManager.getQuest(questId);
        const progress = questManager.getQuestProgress(questId);

        set({
          activeQuest: quest || null,
          questProgress: new Map([...get().questProgress, [questId, progress!]])
        });

        console.log(`[STORE] Started quest: ${questId}`);
      }

      return success;
    },

    cancelQuest: () => {
      const questManager = QuestManager.getInstance();
      const success = questManager.cancelQuest();

      if (success) {
        set({ activeQuest: null });

        // Deactivate challenge grids
        get().deactivateAllChallengeGrids();

        console.log('[STORE] Quest cancelled');
      }

      return success;
    },

    restartQuest: () => {
      const questManager = QuestManager.getInstance();
      const success = questManager.restartQuest();

      if (success) {
        const activeQuest = questManager.getActiveQuest();
        const questId = activeQuest?.id;

        if (activeQuest && questId) {
          const progress = questManager.getQuestProgress(questId);

          set({
            activeQuest: activeQuest,
            questProgress: new Map([...get().questProgress, [questId, progress!]])
          });

          console.log('[STORE] Quest restarted');
        }
      }

      return success;
    },

    getActiveQuest: () => {
      return get().activeQuest;
    },

    getAvailableQuests: () => {
      const questManager = QuestManager.getInstance();
      return questManager.getAvailableQuests();
    },

    getCompletedQuests: () => {
      const questManager = QuestManager.getInstance();
      return questManager.getCompletedQuests();
    },

    getQuestProgress: (questId: string) => {
      const questManager = QuestManager.getInstance();
      return questManager.getQuestProgress(questId);
    },

    isQuestUnlocked: (questId: string) => {
      const questManager = QuestManager.getInstance();
      return questManager.isQuestUnlocked(questId);
    },

    isQuestStuck: () => {
      const questManager = QuestManager.getInstance();
      return questManager.isQuestStuck();
    },

    getCurrentPhaseTime: () => {
      const questManager = QuestManager.getInstance();
      return questManager.getCurrentPhaseTime();
    },

    refreshQuestState: () => {
      const questManager = QuestManager.getInstance();

      const availableQuests = questManager.getAvailableQuests();
      const activeQuest = questManager.getActiveQuest();
      const unlockedQuestIds = questManager.getAllQuests()
        .filter(q => questManager.isQuestUnlocked(q.id))
        .map(q => q.id);

      set({
        availableQuests,
        activeQuest: activeQuest || null,
        unlockedQuests: new Set(unlockedQuestIds)
      });

      console.log('[STORE] Quest state refreshed');
    },

    // =====================================================================
    // UTILITY METHODS
    // =====================================================================
    reset: () => {
      const state = get();
      state.cleanupTaskSystem();
      set(createInitialState());
      const newState = get();
      newState.initializeTaskSystem();
      console.log('[STORE] Game state reset');
    }
  }))
);

// =====================================================================
// STORE INITIALIZATION
// =====================================================================
// Initialize the task system when the store is created
const store = useGameStore.getState();
store.initializeTaskSystem();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useGameStore.getState();
    state.cleanupTaskSystem();
  });
} 