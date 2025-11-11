import { QuestRequirement } from '../../types/quest';
import { EventBus } from '../EventBus';

/**
 * ObjectiveTracker - Event sourcing system for quest objectives
 *
 * This system records all user actions as immutable events and validates
 * quest objectives by querying the event log. This eliminates timing
 * dependencies and race conditions.
 *
 * Key principles:
 * - Events are append-only (immutable)
 * - Validation is done via pure functions (no side effects)
 * - State can be snapshot for consistent validation
 * - Clear lifecycle: start phase → record events → validate → clear on completion
 */

/**
 * Event recorded in the system
 */
interface ObjectiveEvent {
  type: string;
  data: any;
  timestamp: number;
}

/**
 * Snapshot of current objective state
 */
export interface ObjectiveStateSnapshot {
  events: ObjectiveEvent[];
  timestamp: number;
  phaseId?: string;
}

/**
 * ObjectiveTracker singleton class
 */
export class ObjectiveTracker {
  private static instance: ObjectiveTracker | null = null;

  // Event log (append-only)
  private eventLog: ObjectiveEvent[] = [];

  // Current phase context
  private currentPhaseId?: string;

  private constructor() {
    this.setupEventListeners();
    console.log('[ObjectiveTracker] Initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ObjectiveTracker {
    if (!ObjectiveTracker.instance) {
      ObjectiveTracker.instance = new ObjectiveTracker();
    }
    return ObjectiveTracker.instance;
  }

  /**
   * Set up event listeners to record all user actions
   */
  private setupEventListeners(): void {
    // Movement events
    EventBus.on('tutorial-movement', (data: { direction: string }) => {
      this.recordEvent('movement', { direction: data.direction });
    });

    // Terminal events
    EventBus.on('tutorial-terminal-opened', () => {
      this.recordEvent('terminal_opened', {});
    });

    // Code changes
    EventBus.on('tutorial-code-changed', (data: { content: string }) => {
      this.recordEvent('code_changed', { content: data.content });
    });

    // Play button
    EventBus.on('tutorial-play-clicked', () => {
      this.recordEvent('play_button', {});
    });

    // Plant button
    EventBus.on('action-plant-clicked', () => {
      this.recordEvent('action_plant', {});
    });

    // Harvest button
    EventBus.on('action-harvest-clicked', () => {
      this.recordEvent('action_harvest', {});
    });

    // Entity plant events (for drone/player planting via code)
    EventBus.on('entity-plant', (data: { entityId: string; entityType: string; cropType: string; position: any }) => {
      this.recordEvent('entity_plant', data);
    });

    // Entity harvest events (for drone/player harvesting via code)
    EventBus.on('entity-harvest', (data: { entityId: string; entityType: string; position: any }) => {
      this.recordEvent('entity_harvest', data);
    });

    console.log('[ObjectiveTracker] Event listeners set up');
  }

  /**
   * Record an event (immutable append)
   */
  private recordEvent(type: string, data: any): void {
    const event: ObjectiveEvent = {
      type,
      data,
      timestamp: Date.now()
    };

    this.eventLog.push(event);
    console.log(`[ObjectiveTracker] Recorded event: ${type}`, data);
  }

  /**
   * Start tracking a new phase
   */
  public startPhase(phaseId: string): void {
    console.log(`[ObjectiveTracker] Starting phase: ${phaseId}`);
    this.currentPhaseId = phaseId;
    this.eventLog = []; // Clear previous phase events
  }

  /**
   * Clear phase state (called when phase completes)
   */
  public clearPhase(): void {
    console.log(`[ObjectiveTracker] Clearing phase: ${this.currentPhaseId}`);
    this.currentPhaseId = undefined;
    this.eventLog = [];
  }

  /**
   * Get immutable snapshot of current state
   */
  public getSnapshot(): ObjectiveStateSnapshot {
    return {
      events: [...this.eventLog], // Create copy
      timestamp: Date.now(),
      phaseId: this.currentPhaseId
    };
  }

  /**
   * Validate an objective against current state
   * This is a pure function - no side effects
   */
  public validateObjective(objective: QuestRequirement, snapshot?: ObjectiveStateSnapshot): boolean {
    const state = snapshot || this.getSnapshot();

    console.log(`[ObjectiveTracker] Validating objective: ${objective.type}`);
    console.log(`[ObjectiveTracker] Event log size: ${state.events.length}`);

    switch (objective.type) {
      case 'movement':
        return this.validateMovement(objective, state);

      case 'open_terminal':
        return this.validateTerminalOpened(state);

      case 'code_content':
        return this.validateCodeContent(objective, state);

      case 'play_button':
        return this.validatePlayButton(state);

      case 'movement_command':
        return this.validateMovementCommand(objective, state);

      case 'action_plant':
        return this.validateActionPlant(state);

      case 'action_harvest':
        return this.validateActionHarvest(state);

      case 'challenge_completion':
        return this.validateChallengeCompletion(objective);

      case 'drone_farming':
        return this.validateDroneFarming(objective, state);

      default:
        console.warn(`[ObjectiveTracker] Unknown objective type: ${objective.type}`);
        return false;
    }
  }

  /**
   * Validation functions (pure - no side effects)
   */

  private validateMovement(objective: QuestRequirement, state: ObjectiveStateSnapshot): boolean {
    if (!objective.directions || objective.directions.length === 0) {
      return false;
    }

    const movementEvents = state.events.filter(e => e.type === 'movement');
    const recordedDirections = new Set(movementEvents.map(e => this.normalizeDirection(e.data.direction)));
    const requiredDirections = objective.directions.map(dir => this.normalizeDirection(dir));

    const allMet = requiredDirections.every(dir => recordedDirections.has(dir));

    console.log(`[ObjectiveTracker] Movement validation: required=${requiredDirections.join(',')}, recorded=${Array.from(recordedDirections).join(',')}, met=${allMet}`);

    return allMet;
  }

  private validateTerminalOpened(state: ObjectiveStateSnapshot): boolean {
    const hasEvent = state.events.some(e => e.type === 'terminal_opened');
    console.log(`[ObjectiveTracker] Terminal opened: ${hasEvent}`);
    return hasEvent;
  }

  private validateCodeContent(objective: QuestRequirement, state: ObjectiveStateSnapshot): boolean {
    if (!objective.content) {
      return false;
    }

    // Get most recent code change event
    const codeEvents = state.events.filter(e => e.type === 'code_changed');
    if (codeEvents.length === 0) {
      console.log(`[ObjectiveTracker] Code content: no code events`);
      return false;
    }

    const latestCode = codeEvents[codeEvents.length - 1].data.content;
    const hasContent = latestCode.trim().includes(objective.content.trim());

    console.log(`[ObjectiveTracker] Code content: required="${objective.content}", has=${hasContent}`);

    return hasContent;
  }

  private validatePlayButton(state: ObjectiveStateSnapshot): boolean {
    const hasEvent = state.events.some(e => e.type === 'play_button');
    console.log(`[ObjectiveTracker] Play button: ${hasEvent}`);
    return hasEvent;
  }

  private validateMovementCommand(objective: QuestRequirement, state: ObjectiveStateSnapshot): boolean {
    if (!objective.commands || objective.commands.length === 0) {
      return false;
    }

    // Get most recent code change event
    const codeEvents = state.events.filter(e => e.type === 'code_changed');
    if (codeEvents.length === 0) {
      return false;
    }

    const latestCode = codeEvents[codeEvents.length - 1].data.content;
    const hasCommand = objective.commands.some(cmd => latestCode.includes(cmd));

    console.log(`[ObjectiveTracker] Movement command: required=${objective.commands.join(',')}, has=${hasCommand}`);

    return hasCommand;
  }

  private validateActionPlant(state: ObjectiveStateSnapshot): boolean {
    const hasEvent = state.events.some(e => e.type === 'action_plant');
    console.log(`[ObjectiveTracker] Action plant: ${hasEvent}`);
    return hasEvent;
  }

  private validateActionHarvest(state: ObjectiveStateSnapshot): boolean {
    const hasEvent = state.events.some(e => e.type === 'action_harvest');
    console.log(`[ObjectiveTracker] Action harvest: ${hasEvent}`);
    return hasEvent;
  }

  private validateDroneFarming(objective: QuestRequirement, state: ObjectiveStateSnapshot): boolean {
    // Get the required drone ID from the objective
    const droneId = (objective as any).droneId;
    const plantCount = (objective as any).plantCount || 0;
    const harvestCount = (objective as any).harvestCount || 0;

    if (!droneId) {
      console.warn('[ObjectiveTracker] drone_farming objective requires droneId');
      return false;
    }

    // Count plant events by the specific drone
    const dronePlants = state.events.filter(e =>
      e.type === 'entity_plant' &&
      e.data.entityId === droneId
    ).length;

    // Count harvest events by the specific drone
    const droneHarvests = state.events.filter(e =>
      e.type === 'entity_harvest' &&
      e.data.entityId === droneId
    ).length;

    console.log(`[ObjectiveTracker] Drone farming (${droneId}): plants=${dronePlants}/${plantCount}, harvests=${droneHarvests}/${harvestCount}`);

    return dronePlants >= plantCount && droneHarvests >= harvestCount;
  }

  private validateChallengeCompletion(objective: QuestRequirement): boolean {
    // This validation requires checking actual game state, not events
    // Import gameStore dynamically to avoid circular dependencies
    const { useGameStore } = require('../../stores/gameStore');
    const store = useGameStore.getState();

    if (!objective.challengePositions) {
      return false;
    }

    const allComplete = objective.challengePositions.every(pos => {
      const grid = store.getGridAt(pos);
      if (!grid) return false;

      return grid.type === 'farmland' &&
             grid.state?.status === 'ready' &&
             grid.state?.isGrown === true &&
             grid.state?.plantType === 'wheat';
    });

    console.log(`[ObjectiveTracker] Challenge completion: ${allComplete}`);

    return allComplete;
  }

  /**
   * Normalize direction strings (same logic as DialogueManager)
   */
  private normalizeDirection(direction: string): string {
    const normalized = direction.toLowerCase().replace('arrow', '').trim();
    const directionMap: Record<string, string> = {
      'up': 'up',
      'down': 'down',
      'left': 'left',
      'right': 'right',
      'w': 'up',
      'a': 'left',
      's': 'down',
      'd': 'right'
    };

    return directionMap[normalized] || normalized;
  }

  /**
   * Get event log for debugging
   */
  public getEventLog(): ObjectiveEvent[] {
    return [...this.eventLog];
  }

  /**
   * Get current phase ID
   */
  public getCurrentPhaseId(): string | undefined {
    return this.currentPhaseId;
  }
}

export default ObjectiveTracker;
