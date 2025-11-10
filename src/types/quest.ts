import { Position, ProgrammingConcept } from './game';

// =====================================================================
// QUEST SYSTEM TYPES
// =====================================================================

/**
 * Quest difficulty levels
 */
export enum QuestDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

/**
 * Quest state tracking
 */
export enum QuestState {
  LOCKED = 'locked',        // Prerequisites not met
  AVAILABLE = 'available',  // Can be started
  ACTIVE = 'active',        // Currently in progress
  COMPLETED = 'completed',  // Finished successfully
  FAILED = 'failed'         // Failed (if applicable)
}

/**
 * Types of quest objectives/requirements
 */
export type RequirementType =
  | 'movement'              // Player must move in specific directions
  | 'open_terminal'         // Player must open the programming terminal
  | 'code_content'          // Code must contain specific content
  | 'play_button'           // Player must click the play button
  | 'movement_command'      // Code must use movement commands
  | 'challenge_completion'  // Complete challenge grid objectives
  | 'interact_npc'          // Interact with specific NPC
  | 'harvest_crop'          // Harvest specific number of crops
  | 'reach_position'        // Reach a specific position
  | 'use_function'          // Use a specific function
  | 'action_plant'          // Player must click the plant button
  | 'action_harvest';       // Player must click the harvest button

/**
 * Dialogue entry within a quest phase
 */
export interface DialogueEntry {
  name: string;              // Speaker name (e.g., "Lain", "Qubit")
  content: string;           // Dialogue text
  sprite: string;            // Character portrait (e.g., "manu-angry.png")
  camera?: {                 // Optional camera positioning
    x: number;
    y: number;
  };
  mainImage?: string;        // Optional main image to display
  challengeGrids?: {         // Optional challenge grid control
    positions: Array<{ x: number; y: number }>;
    activate: boolean;
  };
  objectives?: QuestRequirement[];  // Optional objectives (for standalone dialogues)
}

/**
 * Quest objective/requirement that must be met to progress
 */
export interface QuestRequirement {
  type: RequirementType;
  description: string;       // User-facing description of what to do

  // Type-specific parameters
  directions?: string[];              // For movement requirement
  content?: string;                   // For code_content requirement
  commands?: string[];                // For movement_command requirement
  challengePositions?: Position[];    // For challenge_completion requirement
  npcId?: string;                     // For interact_npc requirement
  cropType?: string;                  // For harvest_crop requirement
  cropCount?: number;                 // For harvest_crop requirement
  position?: Position;                // For reach_position requirement
  functionName?: string;              // For use_function requirement
}

/**
 * Challenge grid configuration for a quest phase
 */
export interface ChallengeGridConfig {
  positions: Position[];     // Grid positions to activate
  activate: boolean;         // Whether to activate or deactivate
}

/**
 * A single phase within a quest
 * Quests can have multiple phases that progress sequentially
 */
export interface QuestPhase {
  id: string;                         // Unique phase identifier
  title: string;                      // Phase title
  description?: string;               // Optional phase description

  // Dialogue sequences
  preDialogues?: DialogueEntry[];     // Dialogues before objectives
  postDialogues?: DialogueEntry[];    // Dialogues after objectives complete

  // Objectives to complete this phase
  objectives?: QuestRequirement[];    // Requirements to complete phase

  // Challenge grid configuration
  challengeGrids?: ChallengeGridConfig;

  // Optional starting code for this phase
  startingCode?: string;

  // Auto-advance to next phase when complete (default: true)
  autoAdvance?: boolean;
}

/**
 * Reward given upon quest completion
 */
export interface QuestReward {
  type: 'unlock_quest' | 'item' | 'resource' | 'function' | 'cosmetic';
  value: string | number;    // Quest ID, item ID, resource amount, etc.
  description: string;       // User-facing description
}

/**
 * Complete quest definition
 */
export interface Quest {
  id: string;                          // Unique quest identifier
  title: string;                       // Quest title
  description: string;                 // Quest description
  difficulty: QuestDifficulty;         // Difficulty level
  category?: string;                   // Optional category (e.g., "Tutorial", "Farming")

  // Quest phases (sequential progression)
  phases: QuestPhase[];

  // Quest metadata
  estimatedTime?: number;              // Estimated completion time (minutes)
  concepts?: ProgrammingConcept[];     // Programming concepts taught
  prerequisites?: string[];            // Required quest IDs to unlock

  // Rewards
  rewards?: QuestReward[];

  // Quest icon/image
  icon?: string;
  thumbnail?: string;
}

/**
 * Progress tracking for a single quest phase
 */
export interface QuestPhaseProgress {
  phaseId: string;
  startedAt: number;                   // Timestamp when phase started
  completedAt?: number;                // Timestamp when phase completed
  objectivesCompleted: Set<number>;    // Indices of completed objectives
  dialogueIndex: number;               // Current dialogue index
  hintsUsed: number;                   // Number of hints used
}

/**
 * Progress tracking for an entire quest
 */
export interface QuestProgress {
  questId: string;
  state: QuestState;
  startedAt?: number;                  // Timestamp when quest started
  completedAt?: number;                // Timestamp when quest completed
  currentPhaseIndex: number;           // Current phase index
  phaseProgress: Map<string, QuestPhaseProgress>; // Progress per phase
  attempts: number;                    // Number of attempts (for retryable quests)
  score?: number;                      // Optional score (0-100)
}

/**
 * Quest manager state
 */
export interface QuestManagerState {
  quests: Map<string, Quest>;          // All loaded quests
  questProgress: Map<string, QuestProgress>; // Progress for all quests
  activeQuestId?: string;              // Currently active quest
  unlockedQuests: Set<string>;         // Quest IDs that are unlocked
}

/**
 * Quest notification for UI
 */
export interface QuestNotification {
  type: 'quest_started' | 'quest_completed' | 'phase_completed' | 'objective_completed' | 'reward_earned';
  questId: string;
  questTitle: string;
  message: string;
  timestamp: number;
}
