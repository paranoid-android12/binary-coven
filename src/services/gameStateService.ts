/**
 * Game State Service
 *
 * Handles saving and loading game state to/from Supabase.
 * Provides fallback to localStorage for offline scenarios.
 */

interface SaveGameStateResponse {
  success: boolean;
  message?: string;
  savedAt?: string;
  error?: string;
}

interface LoadGameStateResponse {
  success: boolean;
  saveExists: boolean;
  gameState?: any;
  lastSaved?: string;
  error?: string;
}

interface ResetGameStateResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class GameStateService {
  private static readonly RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // ms
  private static readonly LOCAL_STORAGE_KEY = 'binary-coven-save';
  private static readonly LOCAL_STORAGE_BACKUP_KEY = 'binary-coven-save-backup';

  /**
   * Save game state to Supabase
   * Falls back to localStorage if API call fails
   */
  static async saveGameState(
    gameState: any,
    saveName: string = 'autosave',
    showNotification?: (message: string, color: number) => void
  ): Promise<{ success: boolean; message: string; usedFallback: boolean }> {
    console.log('[GAME STATE SERVICE] Saving game state...', { saveName });

    // Always save to localStorage as backup
    this.saveToLocalStorage(gameState);

    // Try to save to Supabase
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch('/api/game/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameState,
            saveName,
          }),
        });

        const data: SaveGameStateResponse = await response.json();

        if (response.ok && data.success) {
          console.log('[GAME STATE SERVICE] Save successful (cloud)');
          if (showNotification) {
            showNotification('Game Saved (Cloud)', 0x16c60c);
          }
          return {
            success: true,
            message: 'Game saved to cloud',
            usedFallback: false,
          };
        } else {
          throw new Error(data.error || data.message || 'Save failed');
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`[GAME STATE SERVICE] Save attempt ${attempt} failed:`, error);

        if (attempt < this.RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }

    // All attempts failed, fallback to localStorage only
    console.warn('[GAME STATE SERVICE] Cloud save failed, using localStorage fallback');
    if (showNotification) {
      showNotification('Saved Locally (Offline)', 0xff6600);
    }

    return {
      success: true,
      message: 'Game saved locally (offline mode)',
      usedFallback: true,
    };
  }

  /**
   * Load game state from Supabase
   * Falls back to localStorage if API call fails
   */
  static async loadGameState(
    saveName: string = 'autosave',
    showNotification?: (message: string, color: number) => void
  ): Promise<{ success: boolean; gameState: any | null; usedFallback: boolean }> {
    console.log('[GAME STATE SERVICE] Loading game state...', { saveName });

    // Try to load from Supabase
    try {
      const response = await fetch(`/api/game/load?saveName=${encodeURIComponent(saveName)}`);
      const data: LoadGameStateResponse = await response.json();

      if (response.ok && data.success && data.saveExists && data.gameState) {
        console.log('[GAME STATE SERVICE] Load successful (cloud)');
        if (showNotification) {
          showNotification('Game Loaded (Cloud)', 0x16c60c);
        }
        return {
          success: true,
          gameState: data.gameState,
          usedFallback: false,
        };
      } else if (response.ok && data.success && !data.saveExists) {
        console.log('[GAME STATE SERVICE] No cloud save found, trying localStorage');
        // No save exists in cloud, try localStorage
        const localData = this.loadFromLocalStorage();
        if (localData) {
          if (showNotification) {
            showNotification('Loaded from Local Save', 0xff6600);
          }
          return {
            success: true,
            gameState: localData,
            usedFallback: true,
          };
        } else {
          if (showNotification) {
            showNotification('No Save Found', 0xff0000);
          }
          return {
            success: false,
            gameState: null,
            usedFallback: false,
          };
        }
      } else {
        throw new Error(data.error || 'Load failed');
      }
    } catch (error) {
      console.warn('[GAME STATE SERVICE] Cloud load failed, using localStorage fallback:', error);

      // Fallback to localStorage
      const localData = this.loadFromLocalStorage();
      if (localData) {
        if (showNotification) {
          showNotification('Loaded Locally (Offline)', 0xff6600);
        }
        return {
          success: true,
          gameState: localData,
          usedFallback: true,
        };
      } else {
        if (showNotification) {
          showNotification('Load Failed', 0xff0000);
        }
        return {
          success: false,
          gameState: null,
          usedFallback: true,
        };
      }
    }
  }

  /**
   * Reset game state (delete all progress)
   * Requires user confirmation
   */
  static async resetGameState(
    showNotification?: (message: string, color: number) => void
  ): Promise<{ success: boolean; message: string }> {
    console.log('[GAME STATE SERVICE] Resetting game state...');

    // Clear localStorage
    this.clearLocalStorage();

    // Try to reset on server
    try {
      const response = await fetch('/api/game/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ResetGameStateResponse = await response.json();

      if (response.ok && data.success) {
        console.log('[GAME STATE SERVICE] Reset successful');
        if (showNotification) {
          showNotification('Progress Reset', 0x16c60c);
        }
        return {
          success: true,
          message: 'All progress has been reset',
        };
      } else {
        throw new Error(data.error || data.message || 'Reset failed');
      }
    } catch (error) {
      console.warn('[GAME STATE SERVICE] Cloud reset failed:', error);
      if (showNotification) {
        showNotification('Reset Failed (Check Connection)', 0xff6600);
      }
      return {
        success: true, // Local storage was cleared
        message: 'Local progress cleared (cloud reset failed)',
      };
    }
  }

  /**
   * Check if there's a saved game available
   */
  static async hasSavedGame(saveName: string = 'autosave'): Promise<boolean> {
    try {
      const response = await fetch(`/api/game/load?saveName=${encodeURIComponent(saveName)}`);
      const data: LoadGameStateResponse = await response.json();
      return data.success && data.saveExists;
    } catch (error) {
      // Check localStorage fallback
      return this.hasLocalSave();
    }
  }

  /**
   * Check if there's a saved game in the database only (no localStorage fallback)
   * Use this for auto-load checks to ensure we only load from active database saves
   */
  static async hasDatabaseSave(saveName: string = 'autosave'): Promise<boolean> {
    try {
      const response = await fetch(`/api/game/load?saveName=${encodeURIComponent(saveName)}`);
      const data: LoadGameStateResponse = await response.json();
      return data.success && data.saveExists;
    } catch (error) {
      // No fallback - return false if database check fails
      console.log('[GAME STATE SERVICE] Database save check failed, no save found');
      return false;
    }
  }

  /**
   * Get last saved timestamp
   */
  static async getLastSavedTime(saveName: string = 'autosave'): Promise<Date | null> {
    try {
      const response = await fetch(`/api/game/load?saveName=${encodeURIComponent(saveName)}`);
      const data: LoadGameStateResponse = await response.json();
      if (data.success && data.lastSaved) {
        return new Date(data.lastSaved);
      }
    } catch (error) {
      // Try localStorage
      const localData = this.loadFromLocalStorage();
      if (localData && localData.timestamp) {
        return new Date(localData.timestamp);
      }
    }
    return null;
  }

  // ============================================
  // LOCAL STORAGE HELPERS
  // ============================================

  private static saveToLocalStorage(gameState: any): void {
    try {
      // Keep a backup of the previous save
      const currentSave = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (currentSave) {
        localStorage.setItem(this.LOCAL_STORAGE_BACKUP_KEY, currentSave);
      }

      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(gameState));
      console.log('[GAME STATE SERVICE] Saved to localStorage');
    } catch (error) {
      console.error('[GAME STATE SERVICE] Failed to save to localStorage:', error);
    }
  }

  private static loadFromLocalStorage(): any | null {
    try {
      const saveDataStr = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (saveDataStr) {
        return JSON.parse(saveDataStr);
      }
    } catch (error) {
      console.error('[GAME STATE SERVICE] Failed to load from localStorage:', error);

      // Try backup
      try {
        const backupStr = localStorage.getItem(this.LOCAL_STORAGE_BACKUP_KEY);
        if (backupStr) {
          console.log('[GAME STATE SERVICE] Loaded from backup');
          return JSON.parse(backupStr);
        }
      } catch (backupError) {
        console.error('[GAME STATE SERVICE] Backup also failed:', backupError);
      }
    }
    return null;
  }

  private static hasLocalSave(): boolean {
    return localStorage.getItem(this.LOCAL_STORAGE_KEY) !== null;
  }

  private static clearLocalStorage(): void {
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    localStorage.removeItem(this.LOCAL_STORAGE_BACKUP_KEY);
    console.log('[GAME STATE SERVICE] Cleared localStorage');
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
