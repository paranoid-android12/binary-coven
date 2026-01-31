/**
 * Analytics Service - LocalStorage-First Pattern
 * 
 * All analytics data is stored locally first and synced to the database:
 * - Automatically every 5 minutes (background sync)
 * - When the user explicitly saves their progress via the Save button
 * 
 * Data Flow:
 * 1. Game events (quest complete, code run) → localStorage only
 * 2. Auto-save (every 5 min) OR Save button → Batch upsert to database
 * 3. Load button pressed → Fetch from database, hydrate localStorage
 */

import { LOCAL_STORAGE_KEYS } from '../utils/localStorageManager';

interface QuestProgressData {
  questId: string;
  questTitle: string;
  state: 'locked' | 'available' | 'active' | 'completed' | 'failed';
  currentPhaseIndex?: number;
  startedAt?: string;
  completedAt?: string;
  timeSpentSeconds?: number;
  attempts?: number;
  score?: number;
  phaseProgress?: any;
}

interface ObjectiveProgressData {
  questId: string;
  phaseId: string;
  objectiveIndex: number;
  objectiveDescription: string;
  completedAt?: string;
  attempts?: number;
  timeSpentSeconds?: number;
  hintsUsed?: number;
}

interface CodeExecutionData {
  questId?: string;
  phaseId?: string;
  codeWindowId: string;
  codeContent: string;
  executionResult: {
    success: boolean;
    errors?: any[];
    output?: string;
    executionTime?: number;
  };
  entityId?: string;
  executionDurationMs?: number;
  timestamp: string;
}

// Use centralized storage keys from localStorageManager
const STORAGE_KEYS = {
  QUEST_PROGRESS: LOCAL_STORAGE_KEYS.ANALYTICS_QUEST_PROGRESS,
  OBJECTIVE_PROGRESS: LOCAL_STORAGE_KEYS.ANALYTICS_OBJECTIVE_PROGRESS,
  CODE_EXECUTIONS: LOCAL_STORAGE_KEYS.ANALYTICS_CODE_EXECUTIONS,
  LAST_SYNC: LOCAL_STORAGE_KEYS.ANALYTICS_LAST_SYNC,
};

class AnalyticsService {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private readonly AUTO_SAVE_DELAY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CODE_EXECUTIONS = 500; // Limit stored code executions

  constructor() {
    // Start auto-save interval (backup)
    this.startAutoSave();
  }

  // =====================================================================
  // AUTO-SAVE
  // =====================================================================

  /**
   * Start auto-save interval (5 minutes)
   */
  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      console.log('[Analytics] Auto-save triggered...');
      const result = await this.syncToDatabase();
      console.log(`[Analytics] Auto-save: ${result.message}`);
    }, this.AUTO_SAVE_DELAY);
  }

  /**
   * Stop auto-save
   */
  stop(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // =====================================================================
  // LOCAL STORAGE METHODS
  // =====================================================================

  /**
   * Store quest progress locally
   */
  trackQuestStart(questId: string, questTitle: string): void {
    const progress = this.getLocalQuestProgress();
    
    // Only create new entry if quest not already tracked
    if (!progress[questId]) {
      progress[questId] = {
        questId,
        questTitle,
        state: 'active',
        startedAt: new Date().toISOString(),
        attempts: 1,
      };
    } else {
      // Update existing entry
      progress[questId].state = 'active';
      progress[questId].attempts = (progress[questId].attempts || 0) + 1;
    }
    
    this.saveLocalQuestProgress(progress);
    console.log(`[Analytics] Quest started (local): ${questId}`);
  }

  /**
   * Store quest completion locally
   * @param completedAt Optional timestamp for hydration from database (preserves original completion time)
   */
  trackQuestComplete(
    questId: string,
    questTitle: string,
    timeSpentSeconds: number,
    attempts: number,
    score?: number,
    completedAt?: string
  ): void {
    const progress = this.getLocalQuestProgress();
    
    progress[questId] = {
      ...progress[questId],
      questId,
      questTitle,
      state: 'completed',
      completedAt: completedAt || new Date().toISOString(),
      timeSpentSeconds,
      attempts,
      score,
    };
    
    this.saveLocalQuestProgress(progress);
    console.log(`[Analytics] Quest completed (local): ${questId}`);
  }

  /**
   * Update quest progress locally (for phase changes)
   * @param startedAt Optional timestamp for hydration from database (preserves original start time)
   */
  updateQuestProgress(
    questId: string,
    questTitle: string,
    state: 'locked' | 'available' | 'active' | 'completed' | 'failed',
    currentPhaseIndex?: number,
    phaseProgress?: any,
    startedAt?: string
  ): void {
    const progress = this.getLocalQuestProgress();
    
    progress[questId] = {
      ...progress[questId],
      questId,
      questTitle,
      state,
      currentPhaseIndex,
      phaseProgress,
      ...(startedAt && { startedAt }), // Only set if provided (for DB hydration)
    };
    
    this.saveLocalQuestProgress(progress);
  }

  /**
   * Track objective completion locally
   */
  trackObjectiveComplete(
    questId: string,
    phaseId: string,
    objectiveIndex: number,
    objectiveDescription: string,
    timeSpentSeconds: number,
    attempts: number = 1,
    hintsUsed: number = 0
  ): void {
    const objectives = this.getLocalObjectiveProgress();
    const key = `${questId}_${phaseId}_${objectiveIndex}`;
    
    objectives[key] = {
      questId,
      phaseId,
      objectiveIndex,
      objectiveDescription,
      completedAt: new Date().toISOString(),
      attempts,
      timeSpentSeconds,
      hintsUsed,
    };
    
    this.saveLocalObjectiveProgress(objectives);
  }

  /**
   * Track code execution locally
   */
  trackCodeExecution(
    codeWindowId: string,
    codeContent: string,
    executionResult: {
      success: boolean;
      errors?: any[];
      output?: string;
      executionTime?: number;
    },
    questId?: string,
    phaseId?: string,
    entityId?: string,
    executionDurationMs?: number
  ): void {
    const executions = this.getLocalCodeExecutions();
    
    executions.push({
      questId,
      phaseId,
      codeWindowId,
      codeContent,
      executionResult,
      entityId,
      executionDurationMs,
      timestamp: new Date().toISOString(),
    });
    
    // Trim to max size (keep most recent)
    if (executions.length > this.MAX_CODE_EXECUTIONS) {
      executions.splice(0, executions.length - this.MAX_CODE_EXECUTIONS);
    }
    
    this.saveLocalCodeExecutions(executions);
  }

  // =====================================================================
  // LOCAL STORAGE HELPERS
  // =====================================================================

  private getLocalQuestProgress(): Record<string, QuestProgressData> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.QUEST_PROGRESS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveLocalQuestProgress(progress: Record<string, QuestProgressData>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUEST_PROGRESS, JSON.stringify(progress));
    } catch (error) {
      console.warn('[Analytics] Failed to save quest progress:', error);
    }
  }

  private getLocalObjectiveProgress(): Record<string, ObjectiveProgressData> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OBJECTIVE_PROGRESS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveLocalObjectiveProgress(progress: Record<string, ObjectiveProgressData>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.OBJECTIVE_PROGRESS, JSON.stringify(progress));
    } catch (error) {
      console.warn('[Analytics] Failed to save objective progress:', error);
    }
  }

  private getLocalCodeExecutions(): CodeExecutionData[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CODE_EXECUTIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveLocalCodeExecutions(executions: CodeExecutionData[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CODE_EXECUTIONS, JSON.stringify(executions));
    } catch (error) {
      console.warn('[Analytics] Failed to save code executions:', error);
    }
  }

  // =====================================================================
  // DATABASE SYNC METHODS
  // =====================================================================

  /**
   * Push all local analytics data to the database
   * Called when user explicitly saves their progress
   */
  async syncToDatabase(): Promise<{ success: boolean; message: string }> {
    console.log('[Analytics] Starting database sync...');
    
    const results = {
      questProgress: { success: true, count: 0 },
      objectives: { success: true, count: 0 },
      codeExecutions: { success: true, count: 0 },
    };

    // Sync quest progress
    try {
      const questProgress = this.getLocalQuestProgress();
      const questEntries = Object.values(questProgress);
      
      for (const progress of questEntries) {
        const response = await fetch('/api/analytics/quest-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(progress),
          credentials: 'include',
        });
        
        if (response.ok) {
          results.questProgress.count++;
        } else {
          results.questProgress.success = false;
        }
      }
      console.log(`[Analytics] Synced ${results.questProgress.count} quest progress entries`);
    } catch (error) {
      console.error('[Analytics] Quest progress sync failed:', error);
      results.questProgress.success = false;
    }

    // Sync objective progress
    try {
      const objectives = this.getLocalObjectiveProgress();
      const objectiveEntries = Object.values(objectives);
      
      for (const objective of objectiveEntries) {
        const response = await fetch('/api/analytics/objective-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(objective),
          credentials: 'include',
        });
        
        if (response.ok) {
          results.objectives.count++;
        } else {
          results.objectives.success = false;
        }
      }
      console.log(`[Analytics] Synced ${results.objectives.count} objective entries`);
    } catch (error) {
      console.error('[Analytics] Objective sync failed:', error);
      results.objectives.success = false;
    }

    // Sync code executions (individual uploads)
    try {
      const executions = this.getLocalCodeExecutions();
      const lastSync = this.getLastSyncTime();
      
      // Only sync executions after last sync
      const newExecutions = executions.filter(e => 
        !lastSync || new Date(e.timestamp) > new Date(lastSync)
      );
      
      if (newExecutions.length > 0) {
        for (const execution of newExecutions) {
          const response = await fetch('/api/analytics/code-execution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(execution),
            credentials: 'include',
          });
          if (response.ok) {
            results.codeExecutions.count++;
          } else {
            results.codeExecutions.success = false;
          }
        }
        console.log(`[Analytics] Synced ${results.codeExecutions.count} code executions`);
      }
    } catch (error) {
      console.error('[Analytics] Code execution sync failed:', error);
      results.codeExecutions.success = false;
    }

    const allSuccess = results.questProgress.success && results.objectives.success && results.codeExecutions.success;
    const totalSynced = results.questProgress.count + results.objectives.count + results.codeExecutions.count;

    // Only update last sync time if entire sync was successful
    if (allSuccess) {
      this.setLastSyncTime();
    }

    return {
      success: allSuccess,
      message: allSuccess 
        ? `Synced ${totalSynced} analytics records to database`
        : `Partial sync: ${totalSynced} records synced with some errors`
    };
  }

  private getLastSyncTime(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    } catch {
      return null;
    }
  }

  private setLastSyncTime(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.warn('[Analytics] Failed to save last sync time:', error);
    }
  }

  /**
   * Clear all local analytics data
   */
  clearLocalData(): void {
    localStorage.removeItem(STORAGE_KEYS.QUEST_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.OBJECTIVE_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.CODE_EXECUTIONS);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    console.log('[Analytics] Local data cleared');
  }

  /**
   * Get summary of pending data to sync
   */
  getPendingSyncSummary(): { quests: number; objectives: number; codeExecutions: number } {
    const lastSync = this.getLastSyncTime();
    const executions = this.getLocalCodeExecutions();
    const newExecutions = executions.filter(e => 
      !lastSync || new Date(e.timestamp) > new Date(lastSync)
    );

    return {
      quests: Object.keys(this.getLocalQuestProgress()).length,
      objectives: Object.keys(this.getLocalObjectiveProgress()).length,
      codeExecutions: newExecutions.length,
    };
  }

  // =====================================================================
  // PUBLIC GETTERS (for UI components like StudentProgressModal)
  // =====================================================================

  /**
   * Get all quest progress from localStorage
   * Used by StudentProgressModal for real-time UI updates
   */
  getQuestProgressData(): QuestProgressData[] {
    const progress = this.getLocalQuestProgress();
    return Object.values(progress);
  }

  /**
   * Get objective progress from localStorage
   */
  getObjectiveProgressData(): ObjectiveProgressData[] {
    const objectives = this.getLocalObjectiveProgress();
    return Object.values(objectives);
  }

  /**
   * Get code execution history from localStorage
   */
  getCodeExecutionData(): CodeExecutionData[] {
    return this.getLocalCodeExecutions();
  }

  /**
   * Get progress summary from localStorage
   */
  getProgressSummary(): { 
    totalQuests: number; 
    completed: number; 
    inProgress: number;
    totalTimeSpentSeconds: number;
    totalAttempts: number;
  } {
    const progress = this.getLocalQuestProgress();
    const values = Object.values(progress);
    
    return {
      totalQuests: values.length,
      completed: values.filter(q => q.state === 'completed').length,
      inProgress: values.filter(q => q.state === 'active').length,
      totalTimeSpentSeconds: values.reduce((sum, q) => sum + (q.timeSpentSeconds || 0), 0),
      totalAttempts: values.reduce((sum, q) => sum + (q.attempts || 0), 0),
    };
  }
}

// Export a singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;
