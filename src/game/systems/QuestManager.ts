import { EventBus } from '../EventBus';
import {
  Quest,
  QuestProgress,
  QuestState,
  QuestPhase,
  QuestPhaseProgress,
  QuestNotification,
  QuestReward
} from '../../types/quest';
import DialogueManager from './DialogueManager';
import { ObjectiveTracker } from './ObjectiveTracker';

/**
 * QuestManager - Singleton system for managing quests
 *
 * Responsibilities:
 * - Load quests from JSON files
 * - Track quest progress and state
 * - Handle quest lifecycle (start, progress, complete, fail, cancel)
 * - Check prerequisites and unlock quests
 * - Manage rewards
 * - Persist progress to localStorage
 * - Emit quest events for UI and game systems
 */
export class QuestManager {
  private static instance: QuestManager;

  // Quest data
  private quests: Map<string, Quest> = new Map();
  private questProgress: Map<string, QuestProgress> = new Map();
  private unlockedQuests: Set<string> = new Set();

  // Active quest tracking
  private activeQuestId?: string;
  private currentPhaseIndex: number = 0;

  // Objective tracker
  private objectiveTracker: ObjectiveTracker;

  // Storage key
  private readonly STORAGE_KEY = 'quest_progress';

  private constructor() {
    this.objectiveTracker = ObjectiveTracker.getInstance();
    this.loadProgressFromStorage();
    this.setupObjectiveTracking();
    console.log('[QuestManager] Initialized');
  }

  /**
   * Set up automatic objective tracking via EventBus
   */
  private setupObjectiveTracking(): void {
    // Listen to ALL relevant events and check objectives
    // ObjectiveTracker records events, we just need to validate on each action

    const checkObjectives = (eventName: string) => {
      console.log(`[QuestManager] ${eventName} - checking objectives`);
      this.checkCurrentPhaseObjectives();
    };

    // Dialogue events
    EventBus.on('dialogue-closed', () => checkObjectives('dialogue-closed'));

    // Action events
    EventBus.on('tutorial-play-clicked', () => checkObjectives('play-button'));
    EventBus.on('action-plant-clicked', () => checkObjectives('plant-button'));
    EventBus.on('action-harvest-clicked', () => checkObjectives('harvest-button'));
    EventBus.on('tutorial-code-changed', () => checkObjectives('code-changed'));
    EventBus.on('tutorial-terminal-opened', () => checkObjectives('terminal-opened'));
    EventBus.on('tutorial-movement', () => checkObjectives('movement'));

    console.log('[QuestManager] Objective tracking set up');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): QuestManager {
    if (!QuestManager.instance) {
      QuestManager.instance = new QuestManager();
    }
    return QuestManager.instance;
  }

  // =====================================================================
  // QUEST LOADING
  // =====================================================================

  /**
   * Load a quest from a JSON file
   */
  public async loadQuest(questFilePath: string): Promise<Quest | null> {
    try {
      console.log(`[QuestManager] Loading quest from: ${questFilePath}`);

      const response = await fetch(questFilePath);
      if (!response.ok) {
        throw new Error(`Failed to load quest: ${response.statusText}`);
      }

      const questData: Quest = await response.json();

      // Validate quest structure
      if (!questData.id || !questData.title || !questData.phases || questData.phases.length === 0) {
        throw new Error('Invalid quest structure: missing required fields');
      }

      // Store the quest
      this.quests.set(questData.id, questData);

      // Check if quest should be unlocked
      if (!questData.prerequisites || questData.prerequisites.length === 0) {
        this.unlockedQuests.add(questData.id);
      } else if (this.checkPrerequisites(questData.prerequisites)) {
        this.unlockedQuests.add(questData.id);
      }

      console.log(`[QuestManager] Loaded quest: ${questData.title} (${questData.id})`);
      EventBus.emit('quest-loaded', { questId: questData.id, quest: questData });

      return questData;
    } catch (error) {
      console.error(`[QuestManager] Error loading quest from ${questFilePath}:`, error);
      return null;
    }
  }

  /**
   * Load multiple quests from a directory (convenience method)
   */
  public async loadQuests(questFilePaths: string[]): Promise<void> {
    console.log(`[QuestManager] Loading ${questFilePaths.length} quests...`);

    const loadPromises = questFilePaths.map(path => this.loadQuest(path));
    await Promise.all(loadPromises);

    console.log(`[QuestManager] Loaded ${this.quests.size} quests`);
  }

  // =====================================================================
  // QUEST STATE MANAGEMENT
  // =====================================================================

  /**
   * Start a quest
   */
  public startQuest(questId: string): boolean {
    console.log(`[QuestManager] ===== Starting Quest: ${questId} =====`);
    const quest = this.quests.get(questId);

    if (!quest) {
      console.warn(`[QuestManager] ✗ Quest not found: ${questId}`);
      return false;
    }

    // Check if quest is unlocked
    if (!this.unlockedQuests.has(questId)) {
      console.warn(`[QuestManager] ✗ Quest is locked: ${questId}`);
      return false;
    }

    // Check if another quest is active
    if (this.activeQuestId) {
      console.warn(`[QuestManager] ✗ Another quest is already active: ${this.activeQuestId}`);
      return false;
    }

    // Initialize progress if not exists
    if (!this.questProgress.has(questId)) {
      console.log(`[QuestManager] Creating new quest progress`);
      this.questProgress.set(questId, {
        questId,
        state: QuestState.ACTIVE,
        startedAt: Date.now(),
        currentPhaseIndex: 0,
        phaseProgress: new Map(),
        attempts: 1
      });
    } else {
      // Resume existing progress
      const progress = this.questProgress.get(questId)!;
      console.log(`[QuestManager] Resuming quest at phase ${progress.currentPhaseIndex}, attempt ${progress.attempts + 1}`);
      progress.state = QuestState.ACTIVE;
      progress.attempts += 1;
    }

    this.activeQuestId = questId;
    this.currentPhaseIndex = this.questProgress.get(questId)!.currentPhaseIndex;

    console.log(`[QuestManager] Set active quest to: ${questId}`);
    console.log(`[QuestManager] Current phase index: ${this.currentPhaseIndex}`);
    console.log(`[QuestManager] Total phases: ${quest.phases.length}`);

    this.saveProgressToStorage();

    console.log(`[QuestManager] ✓ Started quest: ${quest.title} (${questId})`);

    // Emit events
    EventBus.emit('quest-started', { questId, quest });
    this.emitNotification({
      type: 'quest_started',
      questId,
      questTitle: quest.title,
      message: `Started quest: ${quest.title}`,
      timestamp: Date.now()
    });

    // Start first phase
    this.startPhase(questId, this.currentPhaseIndex);

    return true;
  }

  /**
   * Cancel the active quest
   */
  public cancelQuest(): boolean {
    if (!this.activeQuestId) {
      console.warn('[QuestManager] No active quest to cancel');
      return false;
    }

    const questId = this.activeQuestId;
    const quest = this.quests.get(questId);
    const progress = this.questProgress.get(questId);

    if (progress) {
      progress.state = QuestState.AVAILABLE;
      // Reset progress (user requested cancellation resets progress)
      progress.currentPhaseIndex = 0;
      progress.phaseProgress.clear();
    }

    this.activeQuestId = undefined;
    this.currentPhaseIndex = 0;

    this.saveProgressToStorage();

    console.log(`[QuestManager] Cancelled quest: ${questId}`);
    EventBus.emit('quest-cancelled', { questId, quest });

    return true;
  }

  /**
   * Restart the active quest (reset to phase 0 and start fresh)
   */
  public restartQuest(): boolean {
    if (!this.activeQuestId) {
      console.warn('[QuestManager] No active quest to restart');
      return false;
    }

    const questId = this.activeQuestId;
    const quest = this.quests.get(questId);

    console.log(`[QuestManager] ===== Restarting Quest: ${questId} =====`);

    // Cancel the active quest first (this resets progress)
    this.cancelQuest();

    // Now start it again from the beginning
    const success = this.startQuest(questId);

    if (success) {
      console.log(`[QuestManager] ✓ Quest restarted: ${quest?.title} (${questId})`);
      this.emitNotification({
        type: 'quest_started',
        questId,
        questTitle: quest?.title || 'Unknown Quest',
        message: `Restarted quest: ${quest?.title}`,
        timestamp: Date.now()
      });
    }

    return success;
  }

  /**
   * Complete the active quest
   */
  public completeQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    const progress = this.questProgress.get(questId);

    if (!quest || !progress) {
      console.warn(`[QuestManager] Cannot complete quest: ${questId}`);
      return false;
    }

    progress.state = QuestState.COMPLETED;
    progress.completedAt = Date.now();

    // Grant rewards
    if (quest.rewards) {
      this.grantRewards(quest.rewards);
    }

    // Unlock dependent quests
    this.checkAndUnlockQuests();

    this.activeQuestId = undefined;
    this.currentPhaseIndex = 0;

    this.saveProgressToStorage();

    console.log(`[QuestManager] Completed quest: ${quest.title} (${questId})`);

    // Emit events
    EventBus.emit('quest-completed', { questId, quest, progress });
    this.emitNotification({
      type: 'quest_completed',
      questId,
      questTitle: quest.title,
      message: `Completed quest: ${quest.title}!`,
      timestamp: Date.now()
    });

    return true;
  }

  // =====================================================================
  // QUEST PHASE MANAGEMENT
  // =====================================================================

  /**
   * Start a specific phase of the active quest
   */
  private startPhase(questId: string, phaseIndex: number): boolean {
    console.log(`[QuestManager] ===== Starting Phase ${phaseIndex} for Quest ${questId} =====`);
    const quest = this.quests.get(questId);
    const progress = this.questProgress.get(questId);

    if (!quest || !progress || phaseIndex >= quest.phases.length) {
      console.warn(`[QuestManager] ✗ Cannot start phase ${phaseIndex} for quest ${questId}`);
      if (!quest) console.warn(`[QuestManager]   Reason: Quest not found`);
      if (!progress) console.warn(`[QuestManager]   Reason: Progress not found`);
      if (quest && phaseIndex >= quest.phases.length) {
        console.warn(`[QuestManager]   Reason: Phase index ${phaseIndex} >= total phases ${quest.phases.length}`);
      }
      return false;
    }

    const phase = quest.phases[phaseIndex];
    console.log(`[QuestManager] Phase: ${phase.title} (${phase.id})`);

    // Initialize phase progress if not exists
    if (!progress.phaseProgress.has(phase.id)) {
      console.log(`[QuestManager] Creating new phase progress`);
      progress.phaseProgress.set(phase.id, {
        phaseId: phase.id,
        startedAt: Date.now(),
        objectivesCompleted: new Set(),
        dialogueIndex: 0,
        hintsUsed: 0
      });
    } else {
      console.log(`[QuestManager] Resuming existing phase progress`);
    }

    const phaseProgress = progress.phaseProgress.get(phase.id)!;
    console.log(`[QuestManager] Phase has ${phase.objectives?.length || 0} objectives`);
    console.log(`[QuestManager] Phase has ${phase.preDialogues?.length || 0} pre-dialogues`);
    console.log(`[QuestManager] Phase has ${phase.postDialogues?.length || 0} post-dialogues`);
    console.log(`[QuestManager] Auto-advance enabled: ${phase.autoAdvance !== false}`);
    console.log(`[QuestManager] Objectives already completed: ${phaseProgress.objectivesCompleted.size}/${phase.objectives?.length || 0}`);

    // Start tracking objectives for this phase
    this.objectiveTracker.startPhase(phase.id);
    console.log(`[QuestManager] Started ObjectiveTracker for phase: ${phase.id}`);

    console.log(`[QuestManager] ✓ Started phase: ${phase.title} (${phase.id})`);
    EventBus.emit('quest-phase-started', { questId, phaseIndex, phase });

    // Construct complete dialogue sequence with objectives
    if (phase.preDialogues && phase.preDialogues.length > 0) {
      console.log(`[QuestManager] Starting ${phase.preDialogues.length} pre-dialogues for phase ${phaseIndex}`);

      // Create a copy of preDialogues to avoid modifying the original
      const dialogueSequence = [...phase.preDialogues];

      // If there are objectives, attach them to the last preDialogue entry
      if (phase.objectives && phase.objectives.length > 0) {
        const lastIndex = dialogueSequence.length - 1;
        dialogueSequence[lastIndex] = {
          ...dialogueSequence[lastIndex],
          objectives: phase.objectives
        };
        console.log(`[QuestManager] Attached ${phase.objectives.length} objectives to last dialogue (index ${lastIndex})`);
        phase.objectives.forEach((obj, i) => {
          console.log(`[QuestManager]   Objective ${i}: ${obj.description} (type: ${obj.type})`);
        });
      }

      DialogueManager.startDialogueSequence(dialogueSequence);
    } else if (phase.objectives && phase.objectives.length > 0) {
      // If there are objectives but no preDialogues, we need to track them differently
      console.log(`[QuestManager] Phase has objectives but no pre-dialogues`);
      // Objectives will be checked via checkCurrentPhaseObjectives when dialogue closes
    }

    // Activate challenge grids if specified
    if (phase.challengeGrids) {
      console.log(`[QuestManager] Activating challenge grids at positions: ${phase.challengeGrids.positions.join(', ')}`);
      EventBus.emit('quest-challenge-grids', {
        questId,
        phaseIndex,
        positions: phase.challengeGrids.positions,
        activate: phase.challengeGrids.activate
      });
    }

    console.log(`[QuestManager] ===== Phase ${phaseIndex} Started =====`);
    return true;
  }

  /**
   * Complete a phase and advance to the next one
   */
  public completePhase(questId: string, phaseIndex: number): boolean {
    try {
      console.log(`[QuestManager] ===== Completing Phase ${phaseIndex} for Quest ${questId} =====`);
      const quest = this.quests.get(questId);
      const progress = this.questProgress.get(questId);

      if (!quest || !progress || questId !== this.activeQuestId) {
        console.warn(`[QuestManager] ✗ Cannot complete phase ${phaseIndex} for quest ${questId}`);
        if (!quest) console.warn(`[QuestManager]   Reason: Quest not found`);
        if (!progress) console.warn(`[QuestManager]   Reason: Progress not found`);
        if (questId !== this.activeQuestId) {
          console.warn(`[QuestManager]   Reason: Quest ${questId} is not active (active: ${this.activeQuestId})`);
        }
        return false;
      }

      const phase = quest.phases[phaseIndex];
      const phaseProgress = progress.phaseProgress.get(phase.id);

      if (phaseProgress) {
        phaseProgress.completedAt = Date.now();
        const duration = (Date.now() - phaseProgress.startedAt) / 1000;
        console.log(`[QuestManager] Phase completed in ${duration.toFixed(1)}s`);
      }

      console.log(`[QuestManager] ✓ Completed phase: ${phase.title} (${phase.id})`);

      // Clear objective tracker for this phase
      this.objectiveTracker.clearPhase();
      console.log(`[QuestManager] Cleared ObjectiveTracker for phase: ${phase.id}`);

      EventBus.emit('quest-phase-completed', { questId, phaseIndex, phase });
      this.emitNotification({
        type: 'phase_completed',
        questId,
        questTitle: quest.title,
        message: `Completed: ${phase.title}`,
        timestamp: Date.now()
      });

      // Show post-dialogues if they exist
      if (phase.postDialogues && phase.postDialogues.length > 0) {
        console.log(`[QuestManager] Starting ${phase.postDialogues.length} post-dialogues for phase ${phaseIndex}`);
        DialogueManager.startDialogueSequence(phase.postDialogues);
      }

      // Check if this was the last phase
      if (phaseIndex >= quest.phases.length - 1) {
        console.log(`[QuestManager] This was the last phase (${phaseIndex + 1}/${quest.phases.length})`);
        console.log(`[QuestManager] Quest will be marked as complete!`);
        // Quest complete!
        this.completeQuest(questId);
        return true;
      }

      // Advance to next phase if auto-advance is enabled (default: true)
      if (phase.autoAdvance !== false) {
        console.log(`[QuestManager] Auto-advance enabled, moving to phase ${phaseIndex + 1}`);
        progress.currentPhaseIndex = phaseIndex + 1;
        this.currentPhaseIndex = progress.currentPhaseIndex;
        this.saveProgressToStorage();

        console.log(`[QuestManager] Current phase index updated: ${this.currentPhaseIndex}`);
        this.startPhase(questId, this.currentPhaseIndex);
      } else {
        console.log(`[QuestManager] Auto-advance disabled, waiting for manual advancement`);
      }

      console.log(`[QuestManager] ===== Phase ${phaseIndex} Completion Done =====`);
      return true;
    } catch (error) {
      console.error('[QuestManager] Error in completePhase:', error);
      return false;
    }
  }

  /**
   * Check if current phase objectives are complete
   */
  private checkCurrentPhaseObjectives(): void {
    try {
      console.log('[QuestManager] ===== Checking Current Phase Objectives =====');

      if (!this.activeQuestId) {
        console.log('[QuestManager] No active quest, skipping objective check');
        return;
      }

      console.log(`[QuestManager] Active quest: ${this.activeQuestId}`);
      const quest = this.quests.get(this.activeQuestId);
      const progress = this.questProgress.get(this.activeQuestId);

      if (!quest || !progress) {
        console.log(`[QuestManager] Quest or progress not found for ${this.activeQuestId}`);
        return;
      }

      console.log(`[QuestManager] Current phase index: ${this.currentPhaseIndex}`);
      const phase = quest.phases[this.currentPhaseIndex];

      if (!phase) {
        console.log(`[QuestManager] Phase ${this.currentPhaseIndex} not found`);
        return;
      }

      console.log(`[QuestManager] Phase: ${phase.title} (${phase.id})`);

      if (!phase.objectives || phase.objectives.length === 0) {
        console.log(`[QuestManager] No objectives in this phase`);

        // If autoAdvance is enabled (default: true) and there are no objectives,
        // automatically complete the phase since there's nothing to wait for
        if (phase.autoAdvance !== false) {
          console.log(`[QuestManager] Phase has no objectives and autoAdvance enabled - completing phase`);
          this.completePhase(this.activeQuestId, this.currentPhaseIndex);
        }
        return;
      }

      console.log(`[QuestManager] Phase has ${phase.objectives.length} objectives`);
      const phaseProgress = progress.phaseProgress.get(phase.id);

      if (!phaseProgress) {
        console.log(`[QuestManager] Phase progress not found for ${phase.id}`);
        return;
      }

      console.log(`[QuestManager] Objectives already completed: ${phaseProgress.objectivesCompleted.size}/${phase.objectives.length}`);

      // Get immutable snapshot of current state for validation
      const stateSnapshot = this.objectiveTracker.getSnapshot();
      console.log(`[QuestManager] State snapshot has ${stateSnapshot.events.length} events`);

      // Check each objective using ObjectiveTracker's validation
      for (let i = 0; i < phase.objectives.length; i++) {
        try {
          const objective = phase.objectives[i];
          console.log(`[QuestManager] Checking objective ${i}: "${objective.description}" (type: ${objective.type})`);

          if (phaseProgress.objectivesCompleted.has(i)) {
            console.log(`[QuestManager]   ✓ Already completed`);
            continue;
          }

          // Validate against immutable snapshot (no timing issues)
          const isMet = this.objectiveTracker.validateObjective(objective, stateSnapshot);
          console.log(`[QuestManager]   Requirement met: ${isMet}`);

          if (isMet) {
            console.log(`[QuestManager]   ✓ Auto-completing objective ${i}: ${objective.description}`);
            this.completeObjective(this.activeQuestId, this.currentPhaseIndex, i);
          } else {
            console.log(`[QuestManager]   ✗ Objective not yet met`);
          }
        } catch (objError) {
          console.error(`[QuestManager] Error checking objective ${i}:`, objError);
        }
      }

      console.log('[QuestManager] ===== Finished Checking Objectives =====');
    } catch (error) {
      console.error('[QuestManager] Error in checkCurrentPhaseObjectives:', error);
    }
  }

  /**
   * Mark an objective as completed within the current phase
   */
  public completeObjective(questId: string, phaseIndex: number, objectiveIndex: number): boolean {
    try {
      console.log(`[QuestManager] ===== Completing Objective ${objectiveIndex} for Phase ${phaseIndex} =====`);
      const progress = this.questProgress.get(questId);

      if (!progress || questId !== this.activeQuestId) {
        console.warn(`[QuestManager] ✗ Cannot complete objective for inactive quest: ${questId}`);
        if (!progress) console.warn(`[QuestManager]   Reason: Progress not found`);
        if (questId !== this.activeQuestId) {
          console.warn(`[QuestManager]   Reason: Quest not active (active: ${this.activeQuestId})`);
        }
        return false;
      }

      const quest = this.quests.get(questId);
      if (!quest || phaseIndex >= quest.phases.length) {
        console.warn(`[QuestManager] ✗ Invalid quest or phase index`);
        return false;
      }

      const phase = quest.phases[phaseIndex];
      const phaseProgress = progress.phaseProgress.get(phase.id);

      if (!phaseProgress) {
        console.warn(`[QuestManager] ✗ Phase progress not found: ${phase.id}`);
        return false;
      }

      if (!phase.objectives || objectiveIndex >= phase.objectives.length) {
        console.warn(`[QuestManager] ✗ Invalid objective index: ${objectiveIndex}`);
        return false;
      }

      const objective = phase.objectives[objectiveIndex];
      phaseProgress.objectivesCompleted.add(objectiveIndex);
      this.saveProgressToStorage();

      console.log(`[QuestManager] ✓ Completed objective ${objectiveIndex}: "${objective.description}"`);
      console.log(`[QuestManager] Objectives completed: ${phaseProgress.objectivesCompleted.size}/${phase.objectives.length}`);

      EventBus.emit('quest-objective-completed', { questId, phaseIndex, objectiveIndex });

      this.emitNotification({
        type: 'objective_completed',
        questId,
        questTitle: quest.title,
        message: `Objective complete: ${objective.description}`,
        timestamp: Date.now()
      });

      // Check if all objectives are complete
      if (phase.objectives && phaseProgress.objectivesCompleted.size >= phase.objectives.length) {
        console.log(`[QuestManager] All objectives complete! Completing phase...`);
        this.completePhase(questId, phaseIndex);
      } else {
        console.log(`[QuestManager] Objectives remaining: ${phase.objectives.length - phaseProgress.objectivesCompleted.size}`);
      }

      return true;
    } catch (error) {
      console.error('[QuestManager] Error in completeObjective:', error);
      return false;
    }
  }

  // =====================================================================
  // QUEST QUERIES
  // =====================================================================

  /**
   * Get a quest by ID
   */
  public getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  /**
   * Get all quests
   */
  public getAllQuests(): Quest[] {
    return Array.from(this.quests.values());
  }

  /**
   * Get available quests (unlocked but not completed)
   */
  public getAvailableQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(quest => {
      const progress = this.questProgress.get(quest.id);
      const isUnlocked = this.unlockedQuests.has(quest.id);
      const isNotCompleted = !progress || progress.state !== QuestState.COMPLETED;
      return isUnlocked && isNotCompleted;
    });
  }

  /**
   * Get completed quests
   */
  public getCompletedQuests(): Quest[] {
    return Array.from(this.quests.values()).filter(quest => {
      const progress = this.questProgress.get(quest.id);
      return progress && progress.state === QuestState.COMPLETED;
    });
  }

  /**
   * Get active quest
   */
  public getActiveQuest(): Quest | undefined {
    if (!this.activeQuestId) {
      return undefined;
    }
    return this.quests.get(this.activeQuestId);
  }

  /**
   * Get quest progress
   */
  public getQuestProgress(questId: string): QuestProgress | undefined {
    return this.questProgress.get(questId);
  }

  /**
   * Get current phase of active quest
   */
  public getCurrentPhase(): QuestPhase | undefined {
    if (!this.activeQuestId) {
      return undefined;
    }

    const quest = this.quests.get(this.activeQuestId);
    if (!quest) {
      return undefined;
    }

    return quest.phases[this.currentPhaseIndex];
  }

  /**
   * Check if a quest is unlocked
   */
  public isQuestUnlocked(questId: string): boolean {
    return this.unlockedQuests.has(questId);
  }

  /**
   * Check if a quest is completed
   */
  public isQuestCompleted(questId: string): boolean {
    const progress = this.questProgress.get(questId);
    return progress?.state === QuestState.COMPLETED;
  }

  // =====================================================================
  // PREREQUISITES & REWARDS
  // =====================================================================

  /**
   * Check if prerequisites are met
   */
  private checkPrerequisites(prerequisiteIds: string[]): boolean {
    return prerequisiteIds.every(prereqId => {
      const progress = this.questProgress.get(prereqId);
      return progress && progress.state === QuestState.COMPLETED;
    });
  }

  /**
   * Check and unlock quests based on completed prerequisites
   */
  private checkAndUnlockQuests(): void {
    this.quests.forEach((quest, questId) => {
      if (this.unlockedQuests.has(questId)) {
        return; // Already unlocked
      }

      if (quest.prerequisites && quest.prerequisites.length > 0) {
        if (this.checkPrerequisites(quest.prerequisites)) {
          this.unlockedQuests.add(questId);
          console.log(`[QuestManager] Unlocked quest: ${quest.title} (${questId})`);
          EventBus.emit('quest-unlocked', { questId, quest });
        }
      }
    });
  }

  /**
   * Grant rewards to player
   */
  private grantRewards(rewards: QuestReward[]): void {
    rewards.forEach(reward => {
      console.log(`[QuestManager] Granting reward: ${reward.type} - ${reward.description}`);

      EventBus.emit('quest-reward-granted', { reward });

      // Emit specific reward events based on type
      switch (reward.type) {
        case 'unlock_quest':
          const questId = reward.value as string;
          this.unlockedQuests.add(questId);
          this.checkAndUnlockQuests();
          break;

        case 'item':
          EventBus.emit('reward-item', { itemId: reward.value, description: reward.description });
          break;

        case 'resource':
          EventBus.emit('reward-resource', { amount: reward.value, description: reward.description });
          break;

        case 'function':
          EventBus.emit('reward-function', { functionName: reward.value, description: reward.description });
          break;

        case 'cosmetic':
          EventBus.emit('reward-cosmetic', { cosmeticId: reward.value, description: reward.description });
          break;
      }
    });
  }

  // =====================================================================
  // PERSISTENCE
  // =====================================================================

  /**
   * Save progress to localStorage
   */
  private saveProgressToStorage(): void {
    try {
      const progressData = {
        questProgress: Array.from(this.questProgress.entries()).map(([_questId, progress]) => ({
          ...progress,
          phaseProgress: Array.from(progress.phaseProgress.entries()).map(([_phaseId, phaseProgress]) => ({
            ...phaseProgress,
            objectivesCompleted: Array.from(phaseProgress.objectivesCompleted)
          }))
        })),
        unlockedQuests: Array.from(this.unlockedQuests),
        activeQuestId: this.activeQuestId,
        currentPhaseIndex: this.currentPhaseIndex
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progressData));
      console.log('[QuestManager] Progress saved to storage');
    } catch (error) {
      console.error('[QuestManager] Error saving progress:', error);
    }
  }

  /**
   * Load progress from localStorage
   */
  private loadProgressFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) {
        console.log('[QuestManager] No saved progress found');
        return;
      }

      const progressData = JSON.parse(storedData);

      // Restore quest progress
      this.questProgress = new Map(
        progressData.questProgress.map((progressItem: any) => [
          progressItem.questId,
          {
            ...progressItem,
            phaseProgress: new Map(
              progressItem.phaseProgress.map((phaseItem: any) => [
                phaseItem.phaseId,
                {
                  ...phaseItem,
                  objectivesCompleted: new Set(phaseItem.objectivesCompleted)
                }
              ])
            )
          }
        ])
      );

      // Restore unlocked quests
      this.unlockedQuests = new Set(progressData.unlockedQuests);

      // Restore active quest
      this.activeQuestId = progressData.activeQuestId;
      this.currentPhaseIndex = progressData.currentPhaseIndex || 0;

      console.log('[QuestManager] Progress loaded from storage');
    } catch (error) {
      console.error('[QuestManager] Error loading progress:', error);
    }
  }

  /**
   * Reset all quest progress
   */
  public resetProgress(questId?: string): void {
    if (questId) {
      // Reset specific quest
      this.questProgress.delete(questId);
      if (this.activeQuestId === questId) {
        this.activeQuestId = undefined;
        this.currentPhaseIndex = 0;
      }
      console.log(`[QuestManager] Reset progress for quest: ${questId}`);
    } else {
      // Reset all progress
      this.questProgress.clear();
      this.activeQuestId = undefined;
      this.currentPhaseIndex = 0;

      // Reset unlocked quests to only those without prerequisites
      const unlockedWithoutPrereqs = Array.from(this.quests.values())
        .filter(quest => !quest.prerequisites || quest.prerequisites.length === 0)
        .map(quest => quest.id);

      this.unlockedQuests = new Set(unlockedWithoutPrereqs);

      console.log('[QuestManager] Reset all quest progress');
    }

    this.saveProgressToStorage();
    EventBus.emit('quest-progress-reset', { questId });
  }

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================

  /**
   * Emit a quest notification
   */
  private emitNotification(notification: QuestNotification): void {
    EventBus.emit('quest-notification', notification);
  }

  /**
   * Get quest statistics
   */
  public getStatistics() {
    const totalQuests = this.quests.size;
    const completedQuests = this.getCompletedQuests().length;
    const availableQuests = this.getAvailableQuests().length;
    const lockedQuests = totalQuests - this.unlockedQuests.size;

    return {
      totalQuests,
      completedQuests,
      availableQuests,
      lockedQuests,
      completionPercentage: totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0
    };
  }

  /**
   * Check if the active quest appears to be stuck
   *
   * A quest is considered stuck if:
   * 1. It has been active for more than 10 minutes on the same phase
   * 2. No objectives have been completed recently
   * 3. The phase has objectives that are not yet complete
   */
  public isQuestStuck(): { isStuck: boolean; reason?: string; timeStuck?: number } {
    if (!this.activeQuestId) {
      return { isStuck: false };
    }

    const quest = this.quests.get(this.activeQuestId);
    const progress = this.questProgress.get(this.activeQuestId);

    if (!quest || !progress) {
      return { isStuck: false };
    }

    const currentPhase = quest.phases[this.currentPhaseIndex];
    if (!currentPhase) {
      return { isStuck: false };
    }

    const phaseProgress = progress.phaseProgress.get(currentPhase.id);
    if (!phaseProgress) {
      return { isStuck: false };
    }

    // Calculate how long the user has been on this phase
    const timeOnPhase = Date.now() - phaseProgress.startedAt;
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

    // Check if we've been on this phase for a long time
    if (timeOnPhase > STUCK_THRESHOLD_MS) {
      // Check if there are incomplete objectives
      if (currentPhase.objectives && currentPhase.objectives.length > 0) {
        const completedCount = phaseProgress.objectivesCompleted.size;
        const totalCount = currentPhase.objectives.length;

        if (completedCount < totalCount) {
          return {
            isStuck: true,
            reason: `You've been on "${currentPhase.title}" for ${Math.floor(timeOnPhase / 60000)} minutes with ${totalCount - completedCount} objective(s) remaining.`,
            timeStuck: timeOnPhase
          };
        }
      }
    }

    return { isStuck: false };
  }

  /**
   * Get the time spent on the current phase in milliseconds
   */
  public getCurrentPhaseTime(): number {
    if (!this.activeQuestId) {
      return 0;
    }

    const quest = this.quests.get(this.activeQuestId);
    const progress = this.questProgress.get(this.activeQuestId);

    if (!quest || !progress) {
      return 0;
    }

    const currentPhase = quest.phases[this.currentPhaseIndex];
    if (!currentPhase) {
      return 0;
    }

    const phaseProgress = progress.phaseProgress.get(currentPhase.id);
    if (!phaseProgress) {
      return 0;
    }

    return Date.now() - phaseProgress.startedAt;
  }
}

export default QuestManager;
