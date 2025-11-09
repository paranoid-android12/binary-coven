# Quest System - Complete Technical Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [State Management](#state-management)
4. [Quest Lifecycle](#quest-lifecycle)
5. [Objective/Requirement System](#objectiverequirement-system)
6. [Dialogue Integration](#dialogue-integration)
7. [Event System](#event-system)
8. [Data Persistence](#data-persistence)
9. [Creating & Extending Quests](#creating--extending-quests)
10. [Debugging Guide](#debugging-guide)

---

## Architecture Overview

The quest system in Binary Coven follows a **singleton pattern** with **event-driven architecture**. It's split into three main layers:

```
┌─────────────────────────────────────────────────────┐
│  UI Layer (React Components)                         │
│  QuestModal.tsx - Quest list/details UI              │
└──────────────┬──────────────────────────────────────┘
               │ (via GameStore)
┌──────────────▼──────────────────────────────────────┐
│  State Management Layer (Zustand)                    │
│  gameStore.ts - Central game state + quest methods   │
└──────────────┬──────────────────────────────────────┘
               │ (delegates to)
┌──────────────▼──────────────────────────────────────┐
│  Business Logic Layer (Singletons)                   │
│  QuestManager.ts - Quest lifecycle + progression     │
│  DialogueManager.ts - Dialogue/objective checking    │
│  EventBus - Event broadcasting                       │
└─────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. **QuestManager** (`src/game/systems/QuestManager.ts`)

The singleton responsible for all quest operations.

#### Key Responsibilities:
- **Loading Quests**: Fetch quest JSON files and validate structure
- **Lifecycle Management**: Start, progress, complete, and cancel quests
- **State Tracking**: Track active quest, phases, objectives, and progress
- **Prerequisites**: Check and unlock quests based on completed prerequisites
- **Rewards**: Grant rewards (resources, functions, quest unlocks)
- **Persistence**: Save/load progress to localStorage

#### Key Methods:
```typescript
// Quest Loading
loadQuest(questFilePath: string): Promise<Quest | null>
loadQuests(questFilePaths: string[]): Promise<void>

// Quest Lifecycle
startQuest(questId: string): boolean
cancelQuest(): boolean
completeQuest(questId: string): boolean

// Phase Management
completePhase(questId: string, phaseIndex: number): boolean
checkCurrentPhaseObjectives(): void

// Objective Tracking
completeObjective(questId: string, phaseIndex: number, objectiveIndex: number): boolean

// Queries
getActiveQuest(): Quest | undefined
getAvailableQuests(): Quest[]
getCompletedQuests(): Quest[]
getQuestProgress(questId: string): QuestProgress | undefined
isQuestUnlocked(questId: string): boolean

// State Management
saveProgressToStorage(): void
loadProgressFromStorage(): void
resetProgress(questId?: string): void
```

#### Internal State:
```typescript
private quests: Map<string, Quest>              // All loaded quests
private questProgress: Map<string, QuestProgress>  // Progress tracking
private unlockedQuests: Set<string>             // Unlocked quest IDs
private activeQuestId?: string                  // Currently active quest
private currentPhaseIndex: number               // Current phase index
```

---

### 2. **DialogueManager** (`src/game/systems/DialogueManager.ts`)

Singleton that manages dialogue sequences and tracks objectives.

#### Key Responsibilities:
- **Dialogue Playback**: Display dialogue sequences from quest phases
- **Requirement Checking**: Verify if objectives/requirements are met
- **Tutorial State**: Track player actions (movement, terminal usage, code input)
- **Auto-Advancement**: Automatically progress dialogue/quests when requirements are met

#### Key Methods:
```typescript
// Dialogue Control
startDialogueSequence(dialogues: DialogueEntry[]): void
nextDialogue(): void
closeDialogue(): void

// Requirement Checking
isRequirementMet(requirement: QuestRequirement): boolean
checkAllRequirements(requirements: QuestRequirement[]): boolean

// Event Listeners
onMovement(direction: string): void
onTerminalOpened(): void
onCodeChanged(code: string): void
onPlayButtonClicked(): void
```

#### Tutorial State Tracking:
```typescript
interface TutorialState {
  movementDirections: Set<string>     // Which arrow keys pressed
  terminalOpened: boolean             // Terminal usage
  codeContent: string                 // Current code in editor
  playButtonClicked: boolean          // Play button clicked
  movementCommandDetected: boolean    // Any movement commands in code
}
```

---

### 3. **Quest Types** (`src/types/quest.ts`)

TypeScript interfaces defining the quest system structure.

#### Main Interfaces:

```typescript
// Top-level quest definition
interface Quest {
  id: string                          // Unique identifier
  title: string                       // Quest title
  description: string                 // User-facing description
  difficulty: QuestDifficulty         // beginner|intermediate|advanced
  category?: string                   // e.g., "Tutorial", "Farming"
  phases: QuestPhase[]                // Sequential phases
  estimatedTime?: number              // Minutes to complete
  concepts?: ProgrammingConcept[]     // Concepts taught
  prerequisites?: string[]            // Required completed quest IDs
  rewards?: QuestReward[]             // Completion rewards
  icon?: string                       // Quest icon filename
  thumbnail?: string                  // Quest thumbnail
}

// Individual quest phase
interface QuestPhase {
  id: string                          // Unique phase ID
  title: string                       // Phase title
  description?: string                // Phase description
  preDialogues?: DialogueEntry[]      // Dialogues before objectives
  objectives?: QuestRequirement[]     // Requirements to complete phase
  postDialogues?: DialogueEntry[]     // Dialogues after completion
  challengeGrids?: ChallengeGridConfig // Challenge grid configuration
  startingCode?: string               // Optional starting code
  autoAdvance?: boolean               // Auto-advance to next phase (default: true)
}

// Objective that must be met
interface QuestRequirement {
  type: RequirementType               // Type of requirement
  description: string                 // User-facing description
  
  // Type-specific parameters
  directions?: string[]               // For movement requirement
  content?: string                    // For code_content requirement
  commands?: string[]                 // For movement_command requirement
  challengePositions?: Position[]     // For challenge_completion
  npcId?: string                      // For interact_npc
  cropType?: string                   // For harvest_crop
  cropCount?: number                  // Harvest count
  position?: Position                 // For reach_position
  functionName?: string               // For use_function
}

// Dialogue entries within phases
interface DialogueEntry {
  name: string                        // Speaker name (e.g., "Lain", "Qubit")
  content: string                     // Dialogue text
  sprite: string                      // Character portrait filename
  camera?: { x: number; y: number }   // Optional camera positioning
  mainImage?: string                  // Optional main image
  challengeGrids?: {                  // Optional challenge grid control
    positions: Position[]
    activate: boolean
  }
  objectives?: QuestRequirement[]     // Optional objectives
}

// Reward upon quest completion
interface QuestReward {
  type: 'unlock_quest' | 'item' | 'resource' | 'function' | 'cosmetic'
  value: string | number              // Reward value (ID, amount, etc.)
  description: string                 // User-facing description
}

// Progress tracking per quest
interface QuestProgress {
  questId: string
  state: QuestState                   // locked|available|active|completed|failed
  startedAt?: number                  // Timestamp when started
  completedAt?: number                // Timestamp when completed
  currentPhaseIndex: number           // Current phase (0-based)
  phaseProgress: Map<string, QuestPhaseProgress> // Per-phase progress
  attempts: number                    // Number of attempts
  score?: number                      // Optional score (0-100)
}

// Progress per phase
interface QuestPhaseProgress {
  phaseId: string
  startedAt: number
  completedAt?: number
  objectivesCompleted: Set<number>    // Indices of completed objectives
  dialogueIndex: number               // Current dialogue index
  hintsUsed: number                   // Number of hints used
}
```

#### Requirement Types:
```typescript
type RequirementType =
  | 'movement'              // Move in specific directions
  | 'open_terminal'         // Open programming terminal
  | 'code_content'          // Code must contain specific text
  | 'play_button'           // Click play button
  | 'movement_command'      // Use movement commands in code
  | 'challenge_completion'  // Complete challenge grid
  | 'interact_npc'          // Interact with specific NPC
  | 'harvest_crop'          // Harvest X crops
  | 'reach_position'        // Reach specific position
  | 'use_function'          // Use specific function
```

---

## State Management

### Zustand GameStore Integration

The quest system is integrated into the centralized Zustand store (`src/stores/gameStore.ts`).

#### Quest State in Store:
```typescript
interface GameState {
  activeQuest: Quest | null                        // Currently active quest
  questProgress: Map<string, QuestProgress>       // All quest progress
  availableQuests: Quest[]                        // Unlocked, non-completed quests
  unlockedQuests: Set<string>                     // Unlocked quest IDs
}

interface GameStore extends GameState {
  // Quest operations
  loadQuests(questFilePaths: string[]): Promise<void>
  startQuest(questId: string): boolean
  cancelQuest(): boolean
  getActiveQuest(): Quest | null
  getAvailableQuests(): Quest[]
  getCompletedQuests(): Quest[]
  getQuestProgress(questId: string): QuestProgress | undefined
  isQuestUnlocked(questId: string): boolean
  refreshQuestState(): void
}
```

#### State Flow:
1. **Component** calls store method (e.g., `gameStore.startQuest(questId)`)
2. **GameStore** delegates to `QuestManager.getInstance().startQuest(questId)`
3. **QuestManager** updates internal state and saves to localStorage
4. **QuestManager** emits events via EventBus
5. **QuestModal** listens to events and calls `gameStore.refreshQuestState()`
6. **Store** updates React state, triggering re-renders

---

## Quest Lifecycle

### State Flow Diagram

```
┌─────────────┐
│   LOCKED    │ Prerequisites not met
└──────┬──────┘
       │ (Prerequisites met)
┌──────▼──────────┐
│   AVAILABLE     │ Can be started
└──────┬──────────┘
       │ startQuest()
┌──────▼──────────┐
│     ACTIVE      │ In progress
└──────┬──────────┘
       │ completeQuest() or fail()
┌──────▼──────────────┐
│     COMPLETED       │ Quest done, rewards granted
│                    │ Dependent quests unlocked
└────────────────────┘
```

### Detailed Quest Progression Flow

#### 1. **Loading Phase**
```typescript
// In GameInterface or ProgrammingGame scene initialization
const questManager = QuestManager.getInstance();
await questManager.loadQuests([
  '/public/quests/tutorial_basics.json',
  '/public/quests/farming_loops.json'
]);

// Quest structure is validated:
// - Has id, title, phases
// - Each phase has id, title
// - Prerequisites are checked
// - Quests without prerequisites are automatically unlocked
```

#### 2. **Starting a Quest**
```typescript
// User clicks "Start Quest" in QuestModal
const success = gameStore.startQuest('tutorial_basics');

// QuestManager.startQuest() executes:
if (!this.unlockedQuests.has(questId)) return false; // Check unlocked
if (this.activeQuestId) return false;                // Only one active
if (!this.questProgress.has(questId)) {
  // First time: Create new progress
  this.questProgress.set(questId, {
    questId,
    state: QuestState.ACTIVE,
    startedAt: Date.now(),
    currentPhaseIndex: 0,
    phaseProgress: new Map(),
    attempts: 1
  });
} else {
  // Resume: Increment attempts
  progress.attempts += 1;
}

this.activeQuestId = questId;
this.saveProgressToStorage();

// Emit events
EventBus.emit('quest-started', { questId, quest });
EventBus.emit('quest-notification', { type: 'quest_started', ... });

// Start first phase
this.startPhase(questId, 0);
```

#### 3. **Phase Progression**
```typescript
// When startPhase() is called:
const phase = quest.phases[phaseIndex];

// Create phase progress if new
if (!progress.phaseProgress.has(phase.id)) {
  progress.phaseProgress.set(phase.id, {
    phaseId: phase.id,
    startedAt: Date.now(),
    objectivesCompleted: new Set(),
    dialogueIndex: 0,
    hintsUsed: 0
  });
}

// Start dialogue sequence
if (phase.preDialogues) {
  // Attach objectives to last dialogue
  const lastDialogue = dialogueSequence[dialogueSequence.length - 1];
  lastDialogue.objectives = phase.objectives;
  
  DialogueManager.startDialogueSequence(dialogueSequence);
}

// Activate challenge grids if any
if (phase.challengeGrids) {
  EventBus.emit('quest-challenge-grids', {
    positions: phase.challengeGrids.positions,
    activate: true
  });
}
```

#### 4. **Objective Tracking**
```typescript
// Objectives are checked in two ways:

// A) Via DialogueManager when dialogue closes
EventBus.on('dialogue-closed', () => {
  questManager.checkCurrentPhaseObjectives();
});

// B) Manually via completing specific objectives
questManager.completeObjective(questId, phaseIndex, objectiveIndex);

// checkCurrentPhaseObjectives() does:
for (let i = 0; i < phase.objectives.length; i++) {
  const objective = phase.objectives[i];
  
  // Skip if already completed
  if (phaseProgress.objectivesCompleted.has(i)) continue;
  
  // Check if requirement is met
  const isMet = DialogueManager.isRequirementMet(objective);
  
  if (isMet) {
    this.completeObjective(questId, phaseIndex, i);
  }
}

// When objective is completed:
phaseProgress.objectivesCompleted.add(objectiveIndex);
this.saveProgressToStorage();
EventBus.emit('quest-objective-completed', ...);

// If all objectives complete, complete the phase
if (phaseProgress.objectivesCompleted.size >= phase.objectives.length) {
  this.completePhase(questId, phaseIndex);
}
```

#### 5. **Phase Completion**
```typescript
// When completePhase() is called:
// 1. Mark phase as complete with timestamp
phaseProgress.completedAt = Date.now();

// 2. Show post-dialogues
if (phase.postDialogues?.length > 0) {
  DialogueManager.startDialogueSequence(phase.postDialogues);
}

// 3. Check if last phase
if (phaseIndex >= quest.phases.length - 1) {
  this.completeQuest(questId);
  return true;
}

// 4. If autoAdvance enabled, move to next phase
if (phase.autoAdvance !== false) {
  progress.currentPhaseIndex = phaseIndex + 1;
  this.startPhase(questId, progress.currentPhaseIndex);
}
```

#### 6. **Quest Completion**
```typescript
// When completeQuest() is called:
progress.state = QuestState.COMPLETED;
progress.completedAt = Date.now();

// Grant rewards
if (quest.rewards) {
  this.grantRewards(quest.rewards);
}

// Unlock dependent quests
this.checkAndUnlockQuests();

// Clear active quest
this.activeQuestId = undefined;

// Emit events
EventBus.emit('quest-completed', { questId, quest, progress });

// Grant specific rewards
rewards.forEach(reward => {
  switch (reward.type) {
    case 'unlock_quest':
      this.unlockedQuests.add(reward.value as string);
      this.checkAndUnlockQuests(); // Cascade unlock
      break;
    case 'resource':
      EventBus.emit('reward-resource', { amount: reward.value });
      break;
    case 'function':
      EventBus.emit('reward-function', { functionName: reward.value });
      break;
    // ... other reward types
  }
});
```

---

## Objective/Requirement System

### Requirement Type Implementation

Each `RequirementType` maps to specific checks in `DialogueManager.isRequirementMet()`:

#### **'movement'** - Multiple Direction Movement
```typescript
// Requirement in JSON
{
  "type": "movement",
  "directions": ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
  "description": "Walk in all four directions using arrow keys"
}

// Tracked in DialogueManager.tutorialState
movementDirections: Set<string>  // Collects all directions pressed

// Checked by:
isRequirementMet(requirement) {
  if (requirement.type === 'movement') {
    // All required directions must be in the set
    return requirement.directions!.every(dir => 
      this.tutorialState.movementDirections.has(dir)
    );
  }
}
```

#### **'open_terminal'** - Terminal Usage
```typescript
// Requirement in JSON
{
  "type": "open_terminal",
  "description": "Open the coding terminal"
}

// Tracked by:
EventBus.on('code-window-opened', () => {
  this.tutorialState.terminalOpened = true;
});

// Checked by:
if (requirement.type === 'open_terminal') {
  return this.tutorialState.terminalOpened;
}
```

#### **'code_content'** - Code Contains Text
```typescript
// Requirement in JSON
{
  "type": "code_content",
  "content": "plant(\"wheat\")",
  "description": "Type plant(\"wheat\") in the code editor"
}

// Tracked by:
EventBus.on('code-changed', (code: string) => {
  this.tutorialState.codeContent = code;
});

// Checked by:
if (requirement.type === 'code_content') {
  return this.tutorialState.codeContent.includes(requirement.content!);
}
```

#### **'play_button'** - Execution Clicked
```typescript
// Requirement in JSON
{
  "type": "play_button",
  "description": "Click the play button to execute code"
}

// Tracked by:
EventBus.on('play-button-clicked', () => {
  this.tutorialState.playButtonClicked = true;
});

// Checked by:
if (requirement.type === 'play_button') {
  return this.tutorialState.playButtonClicked;
}
```

#### **'movement_command'** - Movement Code Used
```typescript
// Requirement in JSON
{
  "type": "movement_command",
  "commands": ["move_left", "move_right", "move_up", "move_down"],
  "description": "Type any movement command in the code editor"
}

// Tracked by code parsing when play button clicked
// Checks if any command is in the code

// Checked by:
if (requirement.type === 'movement_command') {
  return requirement.commands!.some(cmd => 
    this.tutorialState.codeContent.includes(cmd)
  );
}
```

#### **Other Types** (Not Yet Implemented)
- `'challenge_completion'` - Complete challenge grid at positions
- `'interact_npc'` - Interact with NPC
- `'harvest_crop'` - Harvest X crops
- `'reach_position'` - Reach map position
- `'use_function'` - Use specific function

---

## Dialogue Integration

### How Dialogue and Quests Work Together

#### 1. **Dialogue Sequence Structure**
```typescript
// A quest phase has dialogue before and after objectives
interface QuestPhase {
  preDialogues?: DialogueEntry[]   // Show before objectives
  objectives?: QuestRequirement[]   // Player must complete these
  postDialogues?: DialogueEntry[]   // Show after objectives completed
}

interface DialogueEntry {
  name: string         // "Lain", "Qubit", etc.
  content: string      // Actual dialogue text
  sprite: string       // Character portrait image
  objectives?: QuestRequirement[]  // Optional objectives for this dialogue
}
```

#### 2. **Dialogue Flow in Quest**
```
Phase Starts
  ↓
Show Pre-Dialogues
  ├─ Display dialogue 1
  ├─ Display dialogue 2
  └─ Display dialogue N (with objectives attached)
  ↓
Player completes Objectives
  ├─ Movement tracking
  ├─ Code editing/execution
  └─ Other actions
  ↓
Dialogue Closes
  ├─ Check objectives via DialogueManager.isRequirementMet()
  ├─ Auto-complete objectives that are met
  └─ If all objectives complete → Show Post-Dialogues
  ↓
Post-Dialogues Complete
  ├─ Auto-advance enabled? → Start next phase
  └─ Auto-advance disabled? → Wait for manual command
```

#### 3. **Attaching Objectives to Dialogue**
```typescript
// In QuestManager.startPhase()
if (phase.preDialogues && phase.objectives?.length > 0) {
  // Make a copy
  const dialogueSequence = [...phase.preDialogues];
  
  // Attach objectives to LAST dialogue entry
  const lastIndex = dialogueSequence.length - 1;
  dialogueSequence[lastIndex] = {
    ...dialogueSequence[lastIndex],
    objectives: phase.objectives
  };
  
  // Start sequence
  DialogueManager.startDialogueSequence(dialogueSequence);
}
```

#### 4. **DialogueEntry Camera Controls**
```typescript
// Can position camera during dialogue
{
  "name": "Lain",
  "content": "Look at that!",
  "sprite": "manu-speaking.png",
  "camera": {
    "x": 100,
    "y": 200
  }
}
```

---

## Event System

### EventBus Communication

Events are emitted at key points in the quest lifecycle. Components listen and react.

#### Quest Events
```typescript
// Quest lifecycle
EventBus.emit('quest-started', { questId, quest })
EventBus.emit('quest-cancelled', { questId, quest })
EventBus.emit('quest-completed', { questId, quest, progress })
EventBus.emit('quest-unlocked', { questId, quest })

// Phase progression
EventBus.emit('quest-phase-started', { questId, phaseIndex, phase })
EventBus.emit('quest-phase-completed', { questId, phaseIndex, phase })

// Objective completion
EventBus.emit('quest-objective-completed', { questId, phaseIndex, objectiveIndex })

// Notifications
EventBus.emit('quest-notification', {
  type: 'quest_started' | 'quest_completed' | 'phase_completed' | 'objective_completed',
  questId,
  questTitle,
  message,
  timestamp
})

// Challenge grids
EventBus.emit('quest-challenge-grids', {
  questId,
  phaseIndex,
  positions: [{ x, y }, ...],
  activate: boolean
})

// Rewards
EventBus.emit('quest-reward-granted', { reward })
EventBus.emit('reward-resource', { amount, description })
EventBus.emit('reward-item', { itemId, description })
EventBus.emit('reward-function', { functionName, description })
EventBus.emit('reward-cosmetic', { cosmeticId, description })

// State
EventBus.emit('quest-progress-reset', { questId })
EventBus.emit('quest-loaded', { questId, quest })
```

#### Dialogue Events
```typescript
EventBus.emit('dialogue-closed', ())          // After dialogue sequence ends
EventBus.emit('dialogue-started', (dialogue))
EventBus.emit('dialogue-advanced', (currentIndex, totalCount))

// Tutorial tracking events (from game)
EventBus.emit('tutorial-movement', { direction: 'ArrowUp' })
EventBus.emit('code-window-opened', ())
EventBus.emit('code-changed', (code: string))
EventBus.emit('play-button-clicked', ())
```

#### Listener Example (QuestModal)
```typescript
// Set up listeners
useEffect(() => {
  const handleQuestEvent = () => {
    gameStore.refreshQuestState();
    setRefreshTrigger(prev => prev + 1);
  };

  EventBus.on('quest-started', handleQuestEvent);
  EventBus.on('quest-completed', handleQuestEvent);
  EventBus.on('quest-unlocked', handleQuestEvent);
  // ... more events

  return () => {
    EventBus.removeListener('quest-started');
    EventBus.removeListener('quest-completed');
    // ... cleanup
  };
}, []);
```

---

## Data Persistence

### localStorage System

#### Storage Key
```typescript
const STORAGE_KEY = 'quest_progress';
```

#### Stored Data Structure
```json
{
  "questProgress": [
    {
      "questId": "tutorial_basics",
      "state": "active",
      "startedAt": 1700000000000,
      "currentPhaseIndex": 2,
      "phaseProgress": [
        {
          "phaseId": "phase_1_wake_up",
          "startedAt": 1700000000000,
          "completedAt": 1700000010000,
          "objectivesCompleted": [0],
          "dialogueIndex": 0,
          "hintsUsed": 0
        }
      ],
      "attempts": 1
    }
  ],
  "unlockedQuests": ["tutorial_basics", "farming_loops"],
  "activeQuestId": "tutorial_basics",
  "currentPhaseIndex": 2
}
```

#### Persistence Operations

**Saving Progress:**
```typescript
// Called after every state change
private saveProgressToStorage(): void {
  const progressData = {
    questProgress: Array.from(this.questProgress.entries()).map(
      ([_, progress]) => ({
        ...progress,
        // Convert Map to Array for JSON
        phaseProgress: Array.from(progress.phaseProgress.entries()).map(
          ([_, phaseProgress]) => ({
            ...phaseProgress,
            // Convert Set to Array
            objectivesCompleted: Array.from(phaseProgress.objectivesCompleted)
          })
        )
      })
    ),
    unlockedQuests: Array.from(this.unlockedQuests),
    activeQuestId: this.activeQuestId,
    currentPhaseIndex: this.currentPhaseIndex
  };

  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progressData));
  console.log('[QuestManager] Progress saved to storage');
}
```

**Loading Progress:**
```typescript
// Called on QuestManager initialization
private loadProgressFromStorage(): void {
  const storedData = localStorage.getItem(this.STORAGE_KEY);
  if (!storedData) return;

  const progressData = JSON.parse(storedData);

  // Restore quest progress (Arrays → Maps, Arrays → Sets)
  this.questProgress = new Map(
    progressData.questProgress.map(progressItem => [
      progressItem.questId,
      {
        ...progressItem,
        phaseProgress: new Map(
          progressItem.phaseProgress.map(phaseItem => [
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

  this.unlockedQuests = new Set(progressData.unlockedQuests);
  this.activeQuestId = progressData.activeQuestId;
  this.currentPhaseIndex = progressData.currentPhaseIndex || 0;
}
```

#### Manual Reset
```typescript
public resetProgress(questId?: string): void {
  if (questId) {
    // Reset specific quest
    this.questProgress.delete(questId);
    if (this.activeQuestId === questId) {
      this.activeQuestId = undefined;
      this.currentPhaseIndex = 0;
    }
  } else {
    // Reset all progress
    this.questProgress.clear();
    this.activeQuestId = undefined;
    this.currentPhaseIndex = 0;

    // Reset unlocked quests to only those without prerequisites
    const unlockedWithoutPrereqs = Array.from(this.quests.values())
      .filter(quest => !quest.prerequisites?.length)
      .map(quest => quest.id);

    this.unlockedQuests = new Set(unlockedWithoutPrereqs);
  }

  this.saveProgressToStorage();
}
```

---

## Creating & Extending Quests

### 1. Creating a New Quest JSON File

Create a new file in `/public/quests/` following the structure:

```json
{
  "id": "farming_loops",
  "title": "The Field of Repetition",
  "description": "Learn to write loops to automate farming tasks",
  "difficulty": "intermediate",
  "category": "Programming",
  "estimatedTime": 15,
  "concepts": ["loops", "iteration", "functions"],
  "prerequisites": ["tutorial_basics"],
  "icon": "quest_loops.png",
  "phases": [
    {
      "id": "phase_1_intro",
      "title": "Introduction to Loops",
      "description": "Learn how loops can repeat actions",
      "preDialogues": [
        {
          "name": "Lain",
          "content": "Ready to level up? You can write loops to repeat actions multiple times!",
          "sprite": "manu-pleased.png"
        }
      ],
      "objectives": [
        {
          "type": "code_content",
          "content": "for",
          "description": "Type 'for' to start a loop"
        }
      ],
      "postDialogues": [
        {
          "name": "Qubit",
          "content": "Loops! That'll save me a lot of typing!",
          "sprite": "qubit-pleased.png"
        }
      ],
      "autoAdvance": true
    }
  ],
  "rewards": [
    {
      "type": "function",
      "value": "for_loop",
      "description": "Unlocked for loop function"
    },
    {
      "type": "resource",
      "value": 100,
      "description": "Gained 100 energy"
    }
  ]
}
```

### 2. Loading Quests in Game

In your game initialization (e.g., `GameInterface` or `ProgrammingGame` scene):

```typescript
// Load quests on game start
useEffect(() => {
  const loadGameQuests = async () => {
    const questManager = QuestManager.getInstance();
    
    const questFiles = [
      '/public/quests/tutorial_basics.json',
      '/public/quests/farming_loops.json',
      '/public/quests/challenge_quest.json'
    ];

    await questManager.loadQuests(questFiles);
    
    // Optionally start a quest automatically
    // questManager.startQuest('tutorial_basics');
  };

  loadGameQuests();
}, []);
```

### 3. Adding New Requirement Types

To add a new requirement type:

1. **Add to `src/types/quest.ts`:**
```typescript
type RequirementType = 
  | 'movement'
  | 'open_terminal'
  // ... existing types ...
  | 'my_new_requirement';  // Add here
```

2. **Implement checking in `DialogueManager.ts`:**
```typescript
isRequirementMet(requirement: QuestRequirement): boolean {
  // ... existing cases ...
  
  if (requirement.type === 'my_new_requirement') {
    // Your logic here
    return someCondition;
  }
}
```

3. **Set up tracking in DialogueManager:**
```typescript
private tutorialState: TutorialState = {
  // ... existing state ...
  myNewTrackingField: false  // Add state to track
};

// In setupEventListeners()
EventBus.on('my-event', (data) => {
  this.tutorialState.myNewTrackingField = true;
  this.notifyStateChange();
});
```

4. **Use in quest JSON:**
```json
{
  "type": "my_new_requirement",
  "description": "User-facing description",
  "customField": "custom value"
}
```

### 4. Adding Reward Types

To add new reward types:

1. **Update `src/types/quest.ts`:**
```typescript
interface QuestReward {
  type: 'unlock_quest' | 'item' | 'resource' | 'function' | 'cosmetic' | 'my_reward_type';
  value: string | number;
  description: string;
}
```

2. **Handle in `QuestManager.grantRewards()`:**
```typescript
private grantRewards(rewards: QuestReward[]): void {
  rewards.forEach(reward => {
    // ... existing cases ...
    
    case 'my_reward_type':
      EventBus.emit('reward-my-type', { 
        value: reward.value, 
        description: reward.description 
      });
      break;
  });
}
```

3. **Listen for reward in your systems:**
```typescript
EventBus.on('reward-my-type', (data) => {
  // Handle your custom reward
});
```

---

## Debugging Guide

### Key Logging Points

The quest system logs extensively to the console. Filter by these prefixes:

```
[QuestManager]      - Quest lifecycle events
[QuestManager] ✓    - Successful operations
[QuestManager] ✗    - Failed operations
[DIALOGUE MANAGER]  - Dialogue and requirement checks
[TASK-SYSTEM]       - Task system integration
```

### Common Issues & Solutions

#### Issue: Quest Won't Start
**Symptoms:** `completeObjective` returns false, quest doesn't progress

**Check:**
1. Is quest unlocked? `questManager.isQuestUnlocked(questId)`
2. Check console for errors in `startQuest()`
3. Are prerequisites completed? `questManager.getQuestProgress(prereqId)?.state === 'completed'`
4. Is another quest active? `questManager.getActiveQuest()`

**Debug:**
```typescript
// In browser console
const qm = QuestManager.getInstance();
console.log('Unlocked:', qm.getAllQuests().map(q => ({ id: q.id, unlocked: qm.isQuestUnlocked(q.id) })));
console.log('Active:', qm.getActiveQuest());
console.log('Progress:', qm.getQuestProgress('tutorial_basics'));
```

#### Issue: Objectives Not Completing
**Symptoms:** Player does action but objective doesn't mark complete

**Check:**
1. Is DialogueManager tracking the event? Search for `[DIALOGUE MANAGER] ✓ Movement tracked`
2. Is requirement type implemented in `isRequirementMet()`?
3. Is event being emitted? `EventBus.emit('tutorial-movement', ...)`
4. Is dialogue still active? `DialogueManager.isActive`

**Debug:**
```typescript
// Check tutorial state
const dm = DialogueManager.getInstance();
console.log('Dialogue active:', dm.isActive);
console.log('Tutorial state:', dm.getTutorialState());
console.log('Movements:', dm.getTutorialState().movementDirections);
```

#### Issue: Quest Progress Lost on Refresh
**Symptoms:** Reload page and quest is gone

**Check:**
1. Is localStorage being saved? Check browser DevTools → Application → Local Storage
2. Search for `[QuestManager] Progress saved to storage`
3. Is quest being loaded from storage? Look for `[QuestManager] Progress loaded from storage`
4. Check storage quota: `navigator.storage.estimate()`

**Debug:**
```typescript
// Check localStorage
console.log(JSON.parse(localStorage.getItem('quest_progress')));

// Force save
QuestManager.getInstance().saveProgressToStorage();

// Clear and reload
localStorage.removeItem('quest_progress');
window.location.reload();
```

#### Issue: Dialogue Not Showing
**Symptoms:** No dialogue appears on screen

**Check:**
1. Is DialogueManager initialized? `DialogueManager.getInstance()`
2. Are dialogues in the phase? `console.log(quest.phases[0].preDialogues)`
3. Is the quest really starting? Look for `[QuestManager] ✓ Started quest:`
4. Is the QuestModal listening to events? Check `QuestModal.tsx` useEffect

**Debug:**
```typescript
// In ProgrammingGame scene
const qm = QuestManager.getInstance();
qm.startQuest('tutorial_basics');
const quest = qm.getQuest('tutorial_basics');
console.log('Quest phases:', quest?.phases.length);
console.log('Phase 0 dialogues:', quest?.phases[0].preDialogues);
```

#### Issue: Auto-Advance Not Working
**Symptoms:** Phase completes but next phase doesn't start

**Check:**
1. Is `autoAdvance` set to true in phase config? (default is true)
2. Are ALL objectives actually complete? Check `phaseProgress.objectivesCompleted.size`
3. Is there a post-dialogue blocking? Wait for it to finish
4. Check console for `[QuestManager] Auto-advance enabled`

**Debug:**
```typescript
// Check current phase config
const qm = QuestManager.getInstance();
const quest = qm.getActiveQuest();
const progress = qm.getQuestProgress(quest!.id);
const phase = quest!.phases[progress!.currentPhaseIndex];
console.log('Phase:', phase.title);
console.log('AutoAdvance:', phase.autoAdvance);
console.log('Objectives completed:', progress!.phaseProgress.get(phase.id)?.objectivesCompleted);
```

### Useful Console Commands

```typescript
// Get all singleton instances
const qm = QuestManager.getInstance();
const dm = DialogueManager.getInstance();

// Check global state
const store = useGameStore.getState();
console.log('Active quest:', store.activeQuest);
console.log('Available quests:', store.getAvailableQuests());

// Manually complete a phase (dangerous!)
qm.completePhase(qm.getActiveQuest()!.id, qm.getQuestProgress(qm.getActiveQuest()!.id)!.currentPhaseIndex);

// Reset all progress
qm.resetProgress();

// Start a quest directly
qm.startQuest('tutorial_basics');

// Check localStorage
JSON.parse(localStorage.getItem('quest_progress'));
```

---

## Architecture Best Practices

### Do's ✓
- Use `QuestManager.getInstance()` to access the singleton
- Always check `isQuestUnlocked()` before `startQuest()`
- Listen to EventBus events instead of polling state
- Call `refreshQuestState()` after quest changes in components
- Validate quest JSON structure on load
- Use TypeScript types from `src/types/quest.ts`

### Don'ts ✗
- Don't modify quest state directly; use manager methods
- Don't create multiple QuestManager instances
- Don't forget to save progress after state changes
- Don't start multiple quests simultaneously
- Don't bypass prerequisite checking
- Don't emit events directly; let QuestManager handle it

---

## Quick Reference

### Essential Methods

```typescript
// Instance
const qm = QuestManager.getInstance();
const dm = DialogueManager.getInstance();

// Loading
await qm.loadQuests(['/public/quests/quest.json']);

// Lifecycle
qm.startQuest(questId)           // Start a quest
qm.cancelQuest()                 // Cancel active quest
qm.completeQuest(questId)        // Complete quest

// Progress
qm.getActiveQuest()              // Get currently active quest
qm.getQuestProgress(questId)     // Get full progress data
qm.getAvailableQuests()          // Get unlocked, non-completed quests
qm.getCompletedQuests()          // Get completed quests
qm.isQuestUnlocked(questId)      // Check if unlocked

// Debugging
qm.getStatistics()               // Get completion stats
qm.resetProgress(questId)        // Reset quest progress
```

---

## Summary

The quest system is built on three pillars:

1. **QuestManager** - Manages all quest state and lifecycle
2. **DialogueManager** - Handles dialogue display and requirement checking
3. **EventBus** - Connects all systems together via events

Quest progression follows a clear flow: Load → Start → Phase → Dialogue → Objectives → Complete → Rewards → Unlock. State is persisted via localStorage and managed through Zustand.

For developers extending the system, focus on:
- Adding new requirement types to `DialogueManager`
- Creating new quest JSON files
- Listening to EventBus events for custom behavior
- Using the TypeScript types for type safety

Happy questing! 🚀

