import { Entity, GridTile } from '../../types/game';
import { useGameStore } from '../../stores/gameStore';

// =====================================================================
// PURE TASK MANAGER - NO INTERNAL STATE
// =====================================================================
export class TaskManager {
  private static instance: TaskManager;

  static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  // =====================================================================
  // ENTITY TASK METHODS (DELEGATES TO GAMESTORE)
  // =====================================================================
  startEntityTask(
    entityId: string, 
    taskName: string, 
    duration: number, 
    description: string,
    onComplete?: () => void
  ): boolean {
    const store = useGameStore.getState();
    return store.startTask({
      type: 'entity',
      targetId: entityId,
      taskName,
      duration,
      description,
      onComplete
    });
  }

  // =====================================================================
  // GRID TASK METHODS (DELEGATES TO GAMESTORE)
  // =====================================================================
  startGridTask(
    gridId: string, 
    taskName: string, 
    duration: number, 
    description: string,
    entityId?: string,
    onComplete?: () => void
  ): boolean {
    const store = useGameStore.getState();
    return store.startTask({
      type: 'grid',
      targetId: gridId,
      taskName,
      duration,
      description,
      entityId,
      onComplete
    });
  }

  // =====================================================================
  // COMPLETION METHODS (DELEGATES TO GAMESTORE)
  // =====================================================================
  completeEntityTask(entityId: string): void {
    const store = useGameStore.getState();
    
    // Find and complete the entity's active task
    for (const [taskId, task] of store.activeTasks) {
      if (task.type === 'entity' && task.targetId === entityId) {
        store.completeTask(taskId);
        break;
      }
    }
  }

  completeGridTask(gridId: string): void {
    const store = useGameStore.getState();
    
    // Find and complete the grid's active task
    for (const [taskId, task] of store.activeTasks) {
      if (task.type === 'grid' && task.targetId === gridId) {
        store.completeTask(taskId);
        break;
      }
    }
  }

  // =====================================================================
  // STATUS CHECK METHODS (DELEGATES TO GAMESTORE)
  // =====================================================================
  canEntityAct(entityId: string): boolean {
    const store = useGameStore.getState();
    return store.canPerformAction(entityId);
  }

  canGridAct(gridId: string): boolean {
    const store = useGameStore.getState();
    return store.canPerformAction(undefined, gridId);
  }

  // =====================================================================
  // PROGRESS METHODS (DELEGATES TO GAMESTORE)
  // =====================================================================
  getEntityProgress(entityId: string): number {
    const store = useGameStore.getState();
    return store.getTaskProgress(entityId);
  }

  getGridProgress(gridId: string): number {
    const store = useGameStore.getState();
    return store.getTaskProgress(gridId);
  }

  // =====================================================================
  // CANCELLATION METHODS (DELEGATES TO GAMESTORE)
  // =====================================================================
  cancelAllTasks(): void {
    const store = useGameStore.getState();
    store.cancelAllTasks();
  }

  // =====================================================================
  // VALIDATION UTILITIES
  // =====================================================================
  validateEntityOnGrid(entity: Entity, grid: GridTile): boolean {
    return entity.position.x === grid.position.x && entity.position.y === grid.position.y;
  }

  // =====================================================================
  // TIME UTILITIES (DELEGATES TO GAMESTORE)
  // =====================================================================
  getRemainingTime(entityId?: string, gridId?: string): number {
    const store = useGameStore.getState();
    const targetId = entityId || gridId;
    
    if (!targetId) return 0;
    
    // Find active task for this target
    for (const task of store.activeTasks.values()) {
      if (task.targetId === targetId) {
        const elapsed = Date.now() - task.startTime;
        const remaining = task.duration - elapsed;
        return Math.max(0, remaining);
      }
    }
    
    return 0;
  }
}

export default TaskManager; 