import { Entity, GridTile, ProgressInfo, TaskState } from '../../types/game';
import { useGameStore } from '../../stores/gameStore';

export class TaskManager {
  private static instance: TaskManager;
  private activeProgressTasks: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  // Start a progress task for an entity
  startEntityTask(
    entityId: string, 
    taskName: string, 
    duration: number, 
    description: string,
    onComplete?: () => void
  ): boolean {
    const store = useGameStore.getState();
    const entity = store.entities.get(entityId);
    
    if (!entity) return false;
    
    // Check if entity is already blocked
    if (entity.taskState.isBlocked) {
      return false;
    }

    // Set entity as blocked with progress
    const progress: ProgressInfo = {
      isActive: true,
      startTime: Date.now(),
      duration: duration * 1000, // Convert to milliseconds
      description,
      entityId
    };

    const taskState: TaskState = {
      isBlocked: true,
      currentTask: taskName,
      progress
    };

    store.updateEntity(entityId, { taskState });

    // Set up completion timer
    const timeoutId = setTimeout(() => {
      this.completeEntityTask(entityId);
      if (onComplete) onComplete();
      this.activeProgressTasks.delete(`entity_${entityId}`);
    }, duration * 1000);

    this.activeProgressTasks.set(`entity_${entityId}`, timeoutId);
    return true;
  }

  // Start a progress task for a grid
  startGridTask(
    gridId: string, 
    taskName: string, 
    duration: number, 
    description: string,
    entityId?: string,
    onComplete?: () => void
  ): boolean {
    const store = useGameStore.getState();
    const grid = store.grids.get(gridId);
    
    if (!grid) return false;
    
    // Check if grid is already blocked
    if (grid.taskState.isBlocked) {
      return false;
    }

    // Set grid as blocked with progress
    const progress: ProgressInfo = {
      isActive: true,
      startTime: Date.now(),
      duration: duration * 1000,
      description,
      entityId
    };

    const taskState: TaskState = {
      isBlocked: true,
      currentTask: taskName,
      progress
    };

    store.updateGrid(gridId, { taskState });

    // Set up completion timer
    const timeoutId = setTimeout(() => {
      console.log(`[TASK-DEBUG] Grid task completing for ${gridId} at ${new Date().toISOString()}`);
      
      // Execute completion callback FIRST (while task is still active)
      if (onComplete) {
        console.log(`[TASK-DEBUG] Executing completion callback for grid ${gridId}`);
        try {
          onComplete();
          console.log(`[TASK-DEBUG] Completion callback finished for grid ${gridId}`);
        } catch (error) {
          console.error(`[TASK-DEBUG] Completion callback error for grid ${gridId}:`, error);
        }
      }
      
      // Then clean up the task state
      console.log(`[TASK-DEBUG] Cleaning up task state for grid ${gridId}`);
      this.completeGridTask(gridId);
      this.activeProgressTasks.delete(`grid_${gridId}`);
      console.log(`[TASK-DEBUG] Task cleanup complete for grid ${gridId}`);
    }, duration * 1000);

    this.activeProgressTasks.set(`grid_${gridId}`, timeoutId);
    return true;
  }

  // Complete entity task
  completeEntityTask(entityId: string): void {
    const store = useGameStore.getState();
    const entity = store.entities.get(entityId);
    
    if (!entity) return;

    const taskState: TaskState = {
      isBlocked: false,
      currentTask: undefined,
      progress: undefined
    };

    store.updateEntity(entityId, { taskState });
  }

  // Complete grid task
  completeGridTask(gridId: string): void {
    const store = useGameStore.getState();
    const grid = store.grids.get(gridId);
    
    if (!grid) return;

    const taskState: TaskState = {
      isBlocked: false,
      currentTask: undefined,
      progress: undefined
    };

    store.updateGrid(gridId, { taskState });
  }

  // Check if entity can perform action
  canEntityAct(entityId: string): boolean {
    const store = useGameStore.getState();
    const entity = store.entities.get(entityId);
    return entity ? !entity.taskState.isBlocked : false;
  }

  // Check if grid can be used
  canGridAct(gridId: string): boolean {
    const store = useGameStore.getState();
    const grid = store.grids.get(gridId);
    return grid ? !grid.taskState.isBlocked : false;
  }

  // Get progress percentage for entity
  getEntityProgress(entityId: string): number {
    const store = useGameStore.getState();
    const entity = store.entities.get(entityId);
    
    if (!entity?.taskState.progress?.isActive) return 0;
    
    const { startTime, duration } = entity.taskState.progress;
    const elapsed = Date.now() - startTime;
    return Math.min(100, (elapsed / duration) * 100);
  }

  // Get progress percentage for grid
  getGridProgress(gridId: string): number {
    const store = useGameStore.getState();
    const grid = store.grids.get(gridId);
    
    if (!grid?.taskState.progress?.isActive) return 0;
    
    const { startTime, duration } = grid.taskState.progress;
    const elapsed = Date.now() - startTime;
    return Math.min(100, (elapsed / duration) * 100);
  }

  // Cancel all tasks (for reset)
  cancelAllTasks(): void {
    this.activeProgressTasks.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.activeProgressTasks.clear();
  }

  // Validate entity is on grid for grid functions
  validateEntityOnGrid(entity: Entity, grid: GridTile): boolean {
    return entity.position.x === grid.position.x && entity.position.y === grid.position.y;
  }

  // Get remaining time for task
  getRemainingTime(entityId?: string, gridId?: string): number {
    const store = useGameStore.getState();
    let progress: ProgressInfo | undefined;

    if (entityId) {
      const entity = store.entities.get(entityId);
      progress = entity?.taskState.progress;
    } else if (gridId) {
      const grid = store.grids.get(gridId);
      progress = grid?.taskState.progress;
    }

    if (!progress?.isActive) return 0;

    const elapsed = Date.now() - progress.startTime;
    const remaining = progress.duration - elapsed;
    return Math.max(0, remaining / 1000); // Return in seconds
  }
}

export default TaskManager; 