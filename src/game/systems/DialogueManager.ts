import { EventBus } from '../EventBus';
import { DialogueEntry, QuestRequirement } from '../../types/quest';
import { ProgrammingGame } from '../scenes/ProgrammingGame';
import { useGameStore } from '../../stores/gameStore';

/**
 * DialogueManager
 *
 * Singleton system that manages dialogue sequences with tutorial requirements.
 * Integrates with QuestManager to display quest-related dialogues.
 *
 * Features:
 * - Load and display dialogue sequences from JSON files
 * - Track tutorial state (movement, terminal opened, code content, etc.)
 * - Check requirement completion and auto-advance dialogue
 * - Camera panning support for dialogue entries
 * - Challenge Grid activation/deactivation per dialogue
 * - EventBus integration for global dialogue control
 */

/**
 * Tutorial state tracking for dialogue requirements
 */
interface TutorialState {
  movementDirections: Set<string>;     // Tracks which arrow keys have been pressed
  terminalOpened: boolean;             // Has terminal been opened
  codeContent: string;                 // Current code in editor
  playButtonClicked: boolean;          // Has play button been clicked
  movementCommandDetected: boolean;    // Has any movement command been used in code
  hasAcknowledgedCurrentRequirement: boolean; // Has user seen and acknowledged current step
  plantButtonClicked: boolean;         // Has plant button been clicked
  harvestButtonClicked: boolean;       // Has harvest button been clicked
}

/**
 * Dialogue system state
 */
interface DialogueState {
  isActive: boolean;                   // Is dialogue currently active
  dialogues: DialogueEntry[];          // Current dialogue sequence
  currentIndex: number;                // Current dialogue index
  isLoading: boolean;                  // Is dialogue file loading
}

/**
 * DialogueManager singleton class
 */
export class DialogueManager {
  private static instance: DialogueManager | null = null;

  // State
  private dialogueState: DialogueState = {
    isActive: false,
    dialogues: [],
    currentIndex: 0,
    isLoading: false
  };

  private tutorialState: TutorialState = {
    movementDirections: new Set<string>(),
    terminalOpened: false,
    codeContent: '',
    playButtonClicked: false,
    movementCommandDetected: false,
    hasAcknowledgedCurrentRequirement: false,
    plantButtonClicked: false,
    harvestButtonClicked: false
  };

  // Callbacks for UI updates
  private onStateChangeCallback?: (state: DialogueState, tutorialState: TutorialState) => void;
  private phaserSceneRef?: ProgrammingGame;

  private constructor() {
    this.setupEventListeners();
  }

  /**
   * Get DialogueManager singleton instance
   */
  public static getInstance(): DialogueManager {
    if (!DialogueManager.instance) {
      DialogueManager.instance = new DialogueManager();
    }
    return DialogueManager.instance;
  }

  /**
   * Set up EventBus listeners for dialogue events
   */
  private setupEventListeners(): void {
    // Dialogue control
    EventBus.on('start-dialogue', (dialogueFile: string) => {
      this.startDialogue(dialogueFile);
    });

    // Tutorial tracking events
    EventBus.on('tutorial-movement', (data: { direction: string }) => {
      if (this.dialogueState.isActive) {
        const normalizedDirection = this.normalizeDirection(data.direction);
        this.tutorialState.movementDirections.add(normalizedDirection);
        console.log(`[DIALOGUE MANAGER] ✓ Movement tracked: ${normalizedDirection} (raw: ${data.direction})`);
        console.log(`[DIALOGUE MANAGER] Total movements recorded: ${this.tutorialState.movementDirections.size}`);
        console.log(`[DIALOGUE MANAGER] Movements: ${Array.from(this.tutorialState.movementDirections).join(', ')}`);
        this.notifyStateChange();
      } else {
        console.log(`[DIALOGUE MANAGER] Movement event ignored (dialogue not active): ${data.direction}`);
      }
    });

    EventBus.on('tutorial-terminal-opened', () => {
      if (this.dialogueState.isActive) {
        this.tutorialState.terminalOpened = true;
        console.log('[DIALOGUE MANAGER] ✓ Terminal opened (tracked)');
        this.notifyStateChange();
      } else {
        console.log('[DIALOGUE MANAGER] Terminal opened event ignored (dialogue not active)');
      }
    });

    EventBus.on('tutorial-code-changed', (data: { content: string }) => {
      if (this.dialogueState.isActive) {
        this.tutorialState.codeContent = data.content;
        console.log(`[DIALOGUE MANAGER] ✓ Code content updated: "${data.content}"`);
        this.notifyStateChange();
      } else {
        console.log('[DIALOGUE MANAGER] Code change event ignored (dialogue not active)');
      }
    });

    EventBus.on('tutorial-play-clicked', () => {
      if (this.dialogueState.isActive) {
        this.tutorialState.playButtonClicked = true;
        console.log('[DIALOGUE MANAGER] ✓ Play button clicked');
        this.notifyStateChange();
      }
    });

    EventBus.on('action-plant-clicked', () => {
      if (this.dialogueState.isActive) {
        this.tutorialState.plantButtonClicked = true;
        console.log('[DIALOGUE MANAGER] ✓ Plant button clicked');
        this.notifyStateChange();
      }
    });

    EventBus.on('action-harvest-clicked', () => {
      if (this.dialogueState.isActive) {
        this.tutorialState.harvestButtonClicked = true;
        console.log('[DIALOGUE MANAGER] ✓ Harvest button clicked');
        this.notifyStateChange();
      }
    });

    console.log('[DIALOGUE MANAGER] Event listeners set up');
  }

  /**
   * Register a callback for state changes
   */
  public onStateChange(callback: (state: DialogueState, tutorialState: TutorialState) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Set reference to Phaser scene for camera control
   */
  public setPhaserScene(scene: ProgrammingGame): void {
    this.phaserSceneRef = scene;
  }

  /**
   * Notify UI of state changes
   */
  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      // Create new object references so React detects the change
      const dialogueStateCopy = { ...this.dialogueState };
      const tutorialStateCopy = {
        ...this.tutorialState,
        movementDirections: new Set(this.tutorialState.movementDirections)
      };

      this.onStateChangeCallback(dialogueStateCopy, tutorialStateCopy);
    }

    // Check if requirement is met and auto-advance
    // ONLY auto-advance if the user has already acknowledged the requirement
    // (meaning they've clicked through and seen what they need to do)
    if (this.dialogueState.isActive && this.tutorialState.hasAcknowledgedCurrentRequirement) {
      const currentDialogue = this.dialogueState.dialogues[this.dialogueState.currentIndex];
      if (currentDialogue?.objectives && this.isRequirementMet(currentDialogue.objectives[0])) {
        // Requirement met - auto-advance
        console.log('[DIALOGUE MANAGER] Requirement completed, auto-advancing');
        this.advanceDialogue();
      }
    }
  }

  /**
   * Get current dialogue state (for UI rendering)
   */
  public getState(): { dialogue: DialogueState; tutorial: TutorialState } {
    return {
      dialogue: this.dialogueState,
      tutorial: this.tutorialState
    };
  }

  /**
   * Check if current dialogue requirement is met
   */
  public isRequirementMet(requirement?: QuestRequirement): boolean {
    try {
      console.log('[DIALOGUE MANAGER] ===== Checking Requirement =====');

      if (!requirement) {
        console.log('[DIALOGUE MANAGER] No requirement specified, returning true');
        return true;
      }

      console.log(`[DIALOGUE MANAGER] Requirement type: ${requirement.type}`);

    switch (requirement.type) {
      case 'movement':
        // Check if all required directions have been moved
        if (requirement.directions) {
          const requiredDirections = requirement.directions.map(dir => this.normalizeDirection(dir));
          console.log(`[DIALOGUE MANAGER] Required directions: ${requiredDirections.join(', ')}`);
          console.log(`[DIALOGUE MANAGER] Current movements: ${Array.from(this.tutorialState.movementDirections).join(', ')}`);

          const allMet = requiredDirections.every(dir => this.tutorialState.movementDirections.has(dir));
          console.log(`[DIALOGUE MANAGER] All directions met: ${allMet}`);

          // Log which directions are missing
          if (!allMet) {
            const missing = requiredDirections.filter(dir => !this.tutorialState.movementDirections.has(dir));
            console.log(`[DIALOGUE MANAGER] Missing directions: ${missing.join(', ')}`);
          }

          return allMet;
        }
        console.log('[DIALOGUE MANAGER] No directions specified in requirement');
        return false;

      case 'open_terminal':
        console.log(`[DIALOGUE MANAGER] Terminal opened: ${this.tutorialState.terminalOpened}`);
        return this.tutorialState.terminalOpened;

      case 'code_content':
        // Check if the exact code content is present
        if (requirement.content) {
          const hasContent = this.tutorialState.codeContent.trim().includes(requirement.content.trim());
          console.log(`[DIALOGUE MANAGER] Required content: "${requirement.content}"`);
          console.log(`[DIALOGUE MANAGER] Current code content: "${this.tutorialState.codeContent}"`);
          console.log(`[DIALOGUE MANAGER] Content match: ${hasContent}`);
          return hasContent;
        }
        console.log('[DIALOGUE MANAGER] No content specified in requirement');
        return false;

      case 'play_button':
        console.log(`[DIALOGUE MANAGER] Play button clicked: ${this.tutorialState.playButtonClicked}`);
        return this.tutorialState.playButtonClicked;

      case 'movement_command':
        // Check if any of the movement commands are detected
        if (requirement.commands) {
          const hasCommand = requirement.commands.some(cmd =>
            this.tutorialState.codeContent.includes(cmd)
          );
          console.log(`[DIALOGUE MANAGER] Required commands: ${requirement.commands.join(', ')}`);
          console.log(`[DIALOGUE MANAGER] Current code: "${this.tutorialState.codeContent}"`);
          console.log(`[DIALOGUE MANAGER] Command match: ${hasCommand}`);
          return hasCommand;
        }
        console.log(`[DIALOGUE MANAGER] Movement command detected: ${this.tutorialState.movementCommandDetected}`);
        return this.tutorialState.movementCommandDetected;

      case 'challenge_completion':
        // Check if all Challenge Grid positions have fully-grown wheat
        if (requirement.challengePositions) {
          const store = useGameStore.getState();
          return requirement.challengePositions.every(pos => {
            const grid = store.getGridAt(pos);
            if (!grid) return false;
            // Check if it's farmland with fully grown wheat
            return grid.type === 'farmland' &&
                   grid.state?.status === 'ready' &&
                   grid.state?.isGrown === true &&
                   grid.state?.plantType === 'wheat';
          });
        }
        return false;

      case 'action_plant':
        console.log(`[DIALOGUE MANAGER] Plant button clicked: ${this.tutorialState.plantButtonClicked}`);
        return this.tutorialState.plantButtonClicked;

      case 'action_harvest':
        console.log(`[DIALOGUE MANAGER] Harvest button clicked: ${this.tutorialState.harvestButtonClicked}`);
        return this.tutorialState.harvestButtonClicked;

      default:
        console.log(`[DIALOGUE MANAGER] Unknown requirement type: ${requirement.type}, returning true`);
        return true;
    }
    } catch (error) {
      console.error('[DIALOGUE MANAGER] Error checking requirement:', error);
      console.error('[DIALOGUE MANAGER] Requirement:', requirement);
      return false;
    }
  }

  /**
   * Check if we should hide dialogue overlay (during tutorial requirements)
   */
  public shouldHideDialogue(): boolean {
    if (!this.dialogueState.isActive) return false;
    const currentDialogue = this.dialogueState.dialogues[this.dialogueState.currentIndex];
    // Only hide if there's a requirement, it's not met, AND user has acknowledged the instruction
    const hasRequirement = !!(currentDialogue?.objectives && currentDialogue.objectives.length > 0);
    return hasRequirement &&
           !this.isRequirementMet(currentDialogue.objectives![0]) &&
           this.tutorialState.hasAcknowledgedCurrentRequirement;
  }

  /**
   * Start a dialogue sequence from a JSON file
   */
  public async startDialogue(dialogueFile: string): Promise<void> {
    this.dialogueState.isLoading = true;
    this.notifyStateChange();

    try {
      const response = await fetch(`/${dialogueFile}`);
      if (!response.ok) {
        throw new Error(`Failed to load dialogue file: ${dialogueFile}`);
      }

      const dialogues: DialogueEntry[] = await response.json();

      this.dialogueState = {
        isActive: true,
        dialogues,
        currentIndex: 0,
        isLoading: false
      };

      // Reset tutorial state
      this.resetTutorialState();

      // Handle camera panning for first dialogue if specified
      if (dialogues[0]?.camera && this.phaserSceneRef) {
        console.log(`[DIALOGUE MANAGER] Panning camera to (${dialogues[0].camera.x}, ${dialogues[0].camera.y})`);
        this.phaserSceneRef.panCameraTo(dialogues[0].camera.x, dialogues[0].camera.y, 1000);
      }

      // Handle Challenge Grid activation for first dialogue if specified
      if (dialogues[0]?.challengeGrids) {
        const store = useGameStore.getState();
        const { positions, activate } = dialogues[0].challengeGrids;

        if (activate) {
          store.activateChallengeGrids(positions);
          console.log(`[DIALOGUE MANAGER] Activated ${positions.length} challenge grids`);
        } else {
          store.deactivateAllChallengeGrids();
          console.log('[DIALOGUE MANAGER] Deactivated all challenge grids');
        }
      }

      this.notifyStateChange();
      EventBus.emit('dialogue-opened');
      console.log(`[DIALOGUE MANAGER] Started dialogue: ${dialogueFile} with ${dialogues.length} entries`);
    } catch (error) {
      console.error('[DIALOGUE MANAGER] Failed to load dialogue:', error);
      this.dialogueState.isLoading = false;
      this.notifyStateChange();
    }
  }

  /**
   * Start a dialogue sequence directly from DialogueEntry array (for quests)
   */
  public startDialogueSequence(dialogues: DialogueEntry[]): void {
    console.log('[DIALOGUE MANAGER] ===== Starting Dialogue Sequence =====');
    console.log(`[DIALOGUE MANAGER] Number of dialogue entries: ${dialogues.length}`);

    this.dialogueState = {
      isActive: true,
      dialogues,
      currentIndex: 0,
      isLoading: false
    };

    // Reset tutorial state
    console.log('[DIALOGUE MANAGER] Resetting tutorial state');
    this.resetTutorialState();

    // Log details about each dialogue entry
    dialogues.forEach((dialogue, idx) => {
      if (dialogue.objectives) {
        console.log(`[DIALOGUE MANAGER] Dialogue ${idx} has ${dialogue.objectives.length} objectives attached`);
        dialogue.objectives.forEach((obj, i) => {
          console.log(`[DIALOGUE MANAGER]     Objective ${i}: ${obj.description} (type: ${obj.type})`);
        });
      }
    });

    // Handle camera panning for first dialogue if specified
    if (dialogues[0]?.camera && this.phaserSceneRef) {
      console.log(`[DIALOGUE MANAGER] Panning camera to (${dialogues[0].camera.x}, ${dialogues[0].camera.y})`);
      this.phaserSceneRef.panCameraTo(dialogues[0].camera.x, dialogues[0].camera.y, 1000);
    }

    // Handle Challenge Grid activation for first dialogue if specified
    if (dialogues[0]?.challengeGrids) {
      const store = useGameStore.getState();
      const { positions, activate } = dialogues[0].challengeGrids;

      if (activate) {
        store.activateChallengeGrids(positions);
        console.log(`[DIALOGUE MANAGER] Activated ${positions.length} challenge grids`);
      } else {
        store.deactivateAllChallengeGrids();
        console.log('[DIALOGUE MANAGER] Deactivated all challenge grids');
      }
    }

    this.notifyStateChange();
    EventBus.emit('dialogue-opened');
    console.log(`[DIALOGUE MANAGER] Started dialogue sequence with ${dialogues.length} entries`);
  }

  /**
   * Advance to the next dialogue entry
   */
  public advanceDialogue(): void {
    if (!this.dialogueState.isActive) return;

    // Check if current dialogue has a requirement that must be met
    const currentDialogue = this.dialogueState.dialogues[this.dialogueState.currentIndex];
    const hasRequirement = currentDialogue?.objectives && currentDialogue.objectives.length > 0;

    if (hasRequirement && !this.isRequirementMet(currentDialogue.objectives![0])) {
      console.log('[DIALOGUE MANAGER] Requirement not met, hiding dialogue for user to complete task');
      // Set acknowledgment flag so dialogue will hide and user can complete the task
      this.tutorialState.hasAcknowledgedCurrentRequirement = true;
      this.notifyStateChange();
      return; // Don't advance but let user complete the task
    }

    if (this.dialogueState.currentIndex >= this.dialogueState.dialogues.length - 1) {
      // End dialogue
      this.closeDialogue();
      return;
    }

    // Advance to next dialogue
    const nextIndex = this.dialogueState.currentIndex + 1;
    const nextDialogue = this.dialogueState.dialogues[nextIndex];

    // Handle camera panning if specified
    if (nextDialogue?.camera && this.phaserSceneRef) {
      console.log(`[DIALOGUE MANAGER] Panning camera to (${nextDialogue.camera.x}, ${nextDialogue.camera.y})`);
      this.phaserSceneRef.panCameraTo(nextDialogue.camera.x, nextDialogue.camera.y, 1000);
    }

    // Handle Challenge Grid activation/deactivation if specified
    if (nextDialogue?.challengeGrids) {
      const store = useGameStore.getState();
      const { positions, activate } = nextDialogue.challengeGrids;

      if (activate) {
        store.activateChallengeGrids(positions);
        console.log(`[DIALOGUE MANAGER] Activated ${positions.length} challenge grids`);
      } else {
        store.deactivateAllChallengeGrids();
        console.log('[DIALOGUE MANAGER] Deactivated all challenge grids');
      }
    }

    console.log(`[DIALOGUE MANAGER] Advanced to dialogue ${nextIndex + 1}/${this.dialogueState.dialogues.length}`);

    // Reset acknowledgment flag for the new dialogue
    this.tutorialState.hasAcknowledgedCurrentRequirement = false;

    this.dialogueState.currentIndex = nextIndex;
    this.notifyStateChange();
  }

  /**
   * Close the current dialogue sequence
   */
  public closeDialogue(): void {
    console.log('[DIALOGUE MANAGER] ===== Closing Dialogue =====');

    // Log current tutorial state before closing
    console.log('[DIALOGUE MANAGER] Tutorial state at close:');
    console.log(`[DIALOGUE MANAGER]   Movements: ${Array.from(this.tutorialState.movementDirections).join(', ')} (${this.tutorialState.movementDirections.size} total)`);
    console.log(`[DIALOGUE MANAGER]   Terminal opened: ${this.tutorialState.terminalOpened}`);
    console.log(`[DIALOGUE MANAGER]   Code content: "${this.tutorialState.codeContent}"`);
    console.log(`[DIALOGUE MANAGER]   Play button clicked: ${this.tutorialState.playButtonClicked}`);

    // Re-lock camera to qubit when dialogue ends
    if (this.phaserSceneRef && this.phaserSceneRef.lockCameraToQubit) {
      console.log('[DIALOGUE MANAGER] Re-locking camera to qubit');
      this.phaserSceneRef.lockCameraToQubit();
    }

    // Deactivate all Challenge Grids when dialogue ends
    const store = useGameStore.getState();
    if (store.challengeGridPositions.size > 0) {
      store.deactivateAllChallengeGrids();
      console.log('[DIALOGUE MANAGER] Deactivated all challenge grids at dialogue end');
    }

    // Reset states
    this.dialogueState = {
      isActive: false,
      dialogues: [],
      currentIndex: 0,
      isLoading: false
    };

    console.log('[DIALOGUE MANAGER] Dialogue state reset');

    // Reset tutorial state immediately - ObjectiveTracker now handles objective validation
    // No more need for setTimeout timing hacks!
    this.resetTutorialState();
    console.log('[DIALOGUE MANAGER] Tutorial state reset');

    this.notifyStateChange();
    console.log('[DIALOGUE MANAGER] Emitting dialogue-closed event');
    EventBus.emit('dialogue-closed');

    console.log('[DIALOGUE MANAGER] ===== Dialogue Closed =====');
  }

  /**
   * Reset tutorial state tracking
   */
  private resetTutorialState(): void {
    this.tutorialState = {
      movementDirections: new Set<string>(),
      terminalOpened: false,
      codeContent: '',
      playButtonClicked: false,
      movementCommandDetected: false,
      hasAcknowledgedCurrentRequirement: false,
      plantButtonClicked: false,
      harvestButtonClicked: false
    };
  }

  /**
   * Check if dialogue is currently active
   */
  public isActive(): boolean {
    return this.dialogueState.isActive;
  }

  /**
   * Get current dialogue entry
   */
  public getCurrentDialogue(): DialogueEntry | null {
    if (!this.dialogueState.isActive) return null;
    return this.dialogueState.dialogues[this.dialogueState.currentIndex] || null;
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    EventBus.removeListener('start-dialogue');
    EventBus.removeListener('tutorial-movement');
    EventBus.removeListener('tutorial-terminal-opened');
    EventBus.removeListener('tutorial-code-changed');
    EventBus.removeListener('tutorial-play-clicked');
    console.log('[DIALOGUE MANAGER] Destroyed');
  }

  /**
   * Normalize direction strings so gameplay inputs and quest data align
   */
  private normalizeDirection(direction: string): string {
    if (!direction) {
      return '';
    }

    const trimmed = direction.trim().toLowerCase();
    if (trimmed.startsWith('arrow')) {
      return trimmed.replace('arrow', '');
    }

    return trimmed;
  }
}

// Export singleton instance
export default DialogueManager.getInstance();
