/**
 * LocalStorage Manager
 *
 * Centralized utility for managing all localStorage state in the application.
 * Handles clearing, loading, and syncing state between localStorage and database.
 */

// All localStorage keys used in the application
export const LOCAL_STORAGE_KEYS = {
  // Game state (GameStateService)
  GAME_SAVE: 'binary-coven-save',
  GAME_SAVE_BACKUP: 'binary-coven-save-backup',

  // Tutorial state (GameInterface)
  HAS_SEEN_TUTORIAL: 'hasSeenTutorial',

  // Quest progress (QuestManager)
  QUEST_PROGRESS: 'quest_progress',
} as const;

/**
 * Clear all game-related localStorage data
 * Called on logout or when switching accounts
 */
export function clearAllGameState(): void {
  try {
    console.log('[LocalStorageManager] Clearing all game state from localStorage');

    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`[LocalStorageManager] Cleared: ${key}`);
      }
    });

    console.log('[LocalStorageManager] All game state cleared successfully');
  } catch (error) {
    console.error('[LocalStorageManager] Error clearing localStorage:', error);
  }
}

/**
 * Load game state from database and sync to localStorage
 * Called on successful login
 */
export async function loadAndSyncGameState(studentId: string): Promise<boolean> {
  try {
    console.log('[LocalStorageManager] Loading game state from database for student:', studentId);

    // Fetch game state from database
    const response = await fetch('/api/game/load?saveName=autosave');
    const data = await response.json();

    if (!response.ok || !data.success) {
      console.warn('[LocalStorageManager] Failed to load game state:', data.message);
      return false;
    }

    if (data.saveExists && data.gameState) {
      console.log('[LocalStorageManager] Game save found in database');

      // Sync game state to localStorage (GameStateService format)
      const gameStateWithTimestamp = {
        ...data.gameState,
        timestamp: data.lastSaved || new Date().toISOString()
      };

      localStorage.setItem(
        LOCAL_STORAGE_KEYS.GAME_SAVE,
        JSON.stringify(gameStateWithTimestamp)
      );
      console.log('[LocalStorageManager] Synced game state to localStorage');

      // Sync quest progress if it exists in game state
      // QuestManager expects a specific format with questProgress, unlockedQuests, etc.
      if (data.gameState.questProgress && typeof data.gameState.questProgress === 'object') {
        // If questProgress is already in the correct format (has questProgress array), use it
        // Otherwise, wrap it in the expected structure
        const questProgressData = data.gameState.questProgress.questProgress
          ? data.gameState.questProgress
          : {
              questProgress: [],
              unlockedQuests: [],
              activeQuestId: undefined,
              currentPhaseIndex: 0
            };

        localStorage.setItem(
          LOCAL_STORAGE_KEYS.QUEST_PROGRESS,
          JSON.stringify(questProgressData)
        );
        console.log('[LocalStorageManager] Synced quest progress to localStorage');
      } else {
        console.log('[LocalStorageManager] No quest progress in game state or invalid format');
      }

      // Note: hasSeenTutorial is NOT stored in DB, so we check if player has any progress
      // If they have completed quests or have entities, they've seen the tutorial
      const hasProgress = (
        data.gameState.questProgress &&
        Object.keys(data.gameState.questProgress).length > 0
      ) || (
        data.gameState.entities &&
        data.gameState.entities.length > 1 // More than just the default qubit
      );

      if (hasProgress) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.HAS_SEEN_TUTORIAL, 'true');
        console.log('[LocalStorageManager] Player has progress, marking tutorial as seen');
      } else {
        console.log('[LocalStorageManager] New player, tutorial will be shown');
      }

      console.log('[LocalStorageManager] Game state loaded and synced successfully');
      return true;
    } else {
      console.log('[LocalStorageManager] No existing save found - new player');

      // For new players, ensure tutorial flag is NOT set
      localStorage.removeItem(LOCAL_STORAGE_KEYS.HAS_SEEN_TUTORIAL);
      console.log('[LocalStorageManager] Cleared tutorial flag for new player');

      return true;
    }
  } catch (error) {
    console.error('[LocalStorageManager] Error loading game state:', error);
    return false;
  }
}

/**
 * Check if localStorage has any game state
 */
export function hasLocalGameState(): boolean {
  return Object.values(LOCAL_STORAGE_KEYS).some(key =>
    localStorage.getItem(key) !== null
  );
}

/**
 * Get a summary of current localStorage state (for debugging)
 */
export function getLocalStorageStateSummary(): Record<string, boolean> {
  const summary: Record<string, boolean> = {};

  Object.entries(LOCAL_STORAGE_KEYS).forEach(([name, key]) => {
    summary[name] = localStorage.getItem(key) !== null;
  });

  return summary;
}

/**
 * Log current localStorage state (for debugging)
 */
export function logLocalStorageState(): void {
  console.log('[LocalStorageManager] Current localStorage state:');
  const summary = getLocalStorageStateSummary();
  Object.entries(summary).forEach(([key, hasValue]) => {
    console.log(`  ${key}: ${hasValue ? '✓ Present' : '✗ Not set'}`);
  });
}

/**
 * Validate and repair localStorage data structure
 * Call this on app startup to ensure data integrity
 */
export function validateAndRepairLocalStorage(): void {
  try {
    console.log('[LocalStorageManager] Validating localStorage data...');

    // Validate quest progress structure
    const questProgressRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.QUEST_PROGRESS);
    if (questProgressRaw) {
      try {
        const questProgress = JSON.parse(questProgressRaw);

        // Check if it has the expected structure
        if (!questProgress || typeof questProgress !== 'object') {
          console.warn('[LocalStorageManager] Invalid quest progress structure, clearing...');
          localStorage.removeItem(LOCAL_STORAGE_KEYS.QUEST_PROGRESS);
        } else if (!Array.isArray(questProgress.questProgress)) {
          console.warn('[LocalStorageManager] Quest progress missing questProgress array, repairing...');
          const repairedData = {
            questProgress: [],
            unlockedQuests: Array.isArray(questProgress.unlockedQuests) ? questProgress.unlockedQuests : [],
            activeQuestId: questProgress.activeQuestId,
            currentPhaseIndex: questProgress.currentPhaseIndex || 0
          };
          localStorage.setItem(LOCAL_STORAGE_KEYS.QUEST_PROGRESS, JSON.stringify(repairedData));
          console.log('[LocalStorageManager] Quest progress repaired');
        }
      } catch (error) {
        console.error('[LocalStorageManager] Failed to parse quest progress, clearing:', error);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.QUEST_PROGRESS);
      }
    }

    // Validate game save structure
    const gameSaveRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.GAME_SAVE);
    if (gameSaveRaw) {
      try {
        const gameSave = JSON.parse(gameSaveRaw);
        if (!gameSave || typeof gameSave !== 'object') {
          console.warn('[LocalStorageManager] Invalid game save structure, clearing...');
          localStorage.removeItem(LOCAL_STORAGE_KEYS.GAME_SAVE);
        }
      } catch (error) {
        console.error('[LocalStorageManager] Failed to parse game save, clearing:', error);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.GAME_SAVE);
      }
    }

    console.log('[LocalStorageManager] Validation complete');
  } catch (error) {
    console.error('[LocalStorageManager] Error during validation:', error);
  }
}
