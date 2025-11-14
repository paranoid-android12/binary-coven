/**
 * Local Storage Migration Utility
 *
 * This script helps existing players migrate their saved game data
 * from localStorage to the new Supabase cloud save system.
 *
 * Usage:
 * 1. Student logs in with their credentials
 * 2. System checks if they have localStorage data
 * 3. If found, offers to migrate it to cloud
 * 4. One-time migration per student
 */

interface LegacySaveData {
  grids?: any[];
  entities?: any[];
  globalResources?: any;
  codeWindows?: any[];
  questProgress?: any;
  [key: string]: any;
}

interface MigrationStatus {
  hasMigrated: boolean;
  timestamp?: string;
}

export class LocalStorageMigration {
  private static readonly LEGACY_SAVE_KEY = 'binary-coven-save';
  private static readonly MIGRATION_STATUS_KEY = 'migration-completed';
  private static readonly MIGRATION_OFFERED_KEY = 'migration-offered';

  /**
   * Check if there's legacy localStorage data to migrate
   */
  static hasLegacyData(): boolean {
    try {
      const legacyData = localStorage.getItem(this.LEGACY_SAVE_KEY);
      return legacyData !== null;
    } catch (error) {
      console.warn('Failed to check legacy data:', error);
      return false;
    }
  }

  /**
   * Check if migration has already been completed
   */
  static hasMigrated(): boolean {
    try {
      const status = localStorage.getItem(this.MIGRATION_STATUS_KEY);
      return status === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if migration has already been offered
   */
  static hasBeenOffered(): boolean {
    try {
      const offered = localStorage.getItem(this.MIGRATION_OFFERED_KEY);
      return offered === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark migration offer as shown
   */
  static markAsOffered(): void {
    try {
      localStorage.setItem(this.MIGRATION_OFFERED_KEY, 'true');
    } catch (error) {
      console.warn('Failed to mark migration as offered:', error);
    }
  }

  /**
   * Get legacy save data from localStorage
   */
  static getLegacyData(): LegacySaveData | null {
    try {
      const legacyDataStr = localStorage.getItem(this.LEGACY_SAVE_KEY);
      if (!legacyDataStr) {
        return null;
      }

      const legacyData = JSON.parse(legacyDataStr);
      return legacyData;
    } catch (error) {
      console.error('Failed to parse legacy data:', error);
      return null;
    }
  }

  /**
   * Migrate localStorage data to cloud via API
   */
  static async migrateToCloud(
    onProgress?: (message: string) => void,
    onComplete?: (success: boolean, message: string) => void
  ): Promise<{ success: boolean; message: string }> {
    try {
      onProgress?.('Checking for legacy save data...');

      // Check if migration already done
      if (this.hasMigrated()) {
        return {
          success: false,
          message: 'Migration already completed',
        };
      }

      // Get legacy data
      const legacyData = this.getLegacyData();
      if (!legacyData) {
        return {
          success: false,
          message: 'No legacy save data found',
        };
      }

      onProgress?.('Found legacy save data. Migrating to cloud...');

      // Convert legacy format to new format if needed
      const gameState = this.convertLegacyFormat(legacyData);

      // Save to cloud using the game save API
      const response = await fetch('/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          gameState,
          saveName: 'autosave',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onProgress?.('Migration successful!');

        // Mark migration as completed
        this.markMigrationComplete();

        // Keep local copy as backup (don't delete)
        onProgress?.('Keeping local backup for safety');

        onComplete?.(true, 'Your save data has been successfully migrated to the cloud!');

        return {
          success: true,
          message: 'Migration completed successfully',
        };
      } else {
        throw new Error(data.message || 'Failed to save migrated data');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      onComplete?.(
        false,
        `Migration failed: ${errorMessage}. Your local data is safe and unchanged.`
      );

      return {
        success: false,
        message: `Migration failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Convert legacy save format to new format if needed
   */
  private static convertLegacyFormat(legacyData: LegacySaveData): any {
    // If the legacy data already has the correct structure, use it as-is
    if (
      legacyData.grids &&
      legacyData.entities &&
      legacyData.globalResources &&
      legacyData.codeWindows
    ) {
      return {
        version: legacyData.version || '1.0',
        timestamp: legacyData.timestamp || Date.now(),
        gridSize: legacyData.gridSize || 20,
        grids: legacyData.grids || [],
        entities: legacyData.entities || [],
        activeEntityId: legacyData.activeEntityId || null,
        globalResources: legacyData.globalResources || { wheat: 0, energy: 100 },
        codeWindows: legacyData.codeWindows || [],
        mainWindowId: legacyData.mainWindowId || null,
        questProgress: legacyData.questProgress || {},
      };
    }

    // Otherwise, wrap it in the expected structure
    return {
      version: '1.0',
      timestamp: Date.now(),
      gridSize: 20,
      grids: [],
      entities: [],
      activeEntityId: null,
      globalResources: { wheat: 0, energy: 100 },
      codeWindows: [],
      mainWindowId: null,
      questProgress: {},
      ...legacyData,
    };
  }

  /**
   * Mark migration as completed
   */
  private static markMigrationComplete(): void {
    try {
      const status: MigrationStatus = {
        hasMigrated: true,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(this.MIGRATION_STATUS_KEY, 'true');
      console.log('Migration marked as complete:', status);
    } catch (error) {
      console.warn('Failed to mark migration complete:', error);
    }
  }

  /**
   * Manually mark migration as skipped (user declined)
   */
  static skipMigration(): void {
    try {
      localStorage.setItem(this.MIGRATION_STATUS_KEY, 'true');
      localStorage.setItem(this.MIGRATION_OFFERED_KEY, 'true');
      console.log('Migration skipped by user');
    } catch (error) {
      console.warn('Failed to mark migration as skipped:', error);
    }
  }

  /**
   * Reset migration status (for testing)
   */
  static resetMigrationStatus(): void {
    try {
      localStorage.removeItem(this.MIGRATION_STATUS_KEY);
      localStorage.removeItem(this.MIGRATION_OFFERED_KEY);
      console.log('Migration status reset');
    } catch (error) {
      console.warn('Failed to reset migration status:', error);
    }
  }

  /**
   * Get migration info for display
   */
  static getMigrationInfo(): {
    hasLegacyData: boolean;
    hasMigrated: boolean;
    hasBeenOffered: boolean;
    shouldOfferMigration: boolean;
  } {
    const hasLegacyData = this.hasLegacyData();
    const hasMigrated = this.hasMigrated();
    const hasBeenOffered = this.hasBeenOffered();

    return {
      hasLegacyData,
      hasMigrated,
      hasBeenOffered,
      shouldOfferMigration: hasLegacyData && !hasMigrated && !hasBeenOffered,
    };
  }
}

export default LocalStorageMigration;
