# Quest System Implementation Progress

**Labels**: `enhancement`, `quest-system`

## Overview
Replacing LessonManager with a comprehensive Quest system: JSON-driven quests, dialogue integration, multi-phase missions, and visual quest interface.

---

## ✅ Completed: Phases 1-3 (12/12 tasks)

### Phase 1: Core Infrastructure (6/6)
- [x] Delete old LessonManager system files (LessonManager.ts, LessonModal.tsx - 1558 lines removed)
- [x] Clean up Lesson-related types and imports (game.ts, gameStore.ts)
- [x] Create Quest types in `/src/types/quest.ts` (10 requirement types, DialogueEntry, QuestPhase, Quest)
- [x] Create QuestManager.ts (600+ lines: singleton, lifecycle, localStorage, EventBus)
- [x] Create QUEST_SCHEMA.md (500+ lines: documentation, examples, best practices)
- [x] Integrate QuestManager with gameStore (8 methods: loadQuests, startQuest, cancelQuest, getActiveQuest, etc.)

### Phase 2: Dialogue Integration (3/3)
- [x] Extract DialogueManager from GameInterface.tsx (~300 lines → standalone singleton)
- [x] Refactor GameInterface.tsx to use DialogueManager (removed embedded logic, callbacks)
- [x] Integrate QuestManager ↔ DialogueManager (pre/post dialogue triggers per phase)

### Phase 3: Quest Conversion & Testing (3/3)
- [x] Convert sample_dialogue.json → tutorial_basics.json (7 phases: wake up, move, terminal, code, execute)
- [x] Update requirement checking for quest objectives (auto-tracking via DialogueManager.isRequirementMet)
- [x] Test tutorial flow end-to-end (build passes ✓, no TypeScript errors)

**Impact**: 1600 lines removed, 1400 lines added (net -200 lines, cleaner architecture)

---

## 🔲 Remaining: Phases 4-6 (6 tasks, simplified)

### Phase 4: Quest UI/Modal (3 tasks)
- [ ] **Create QuestModal.tsx** with 3 tabs (Available/Active/Completed)
  - Quest list view: cards with title, description, difficulty, estimated time
  - Quest details panel: full description, phases, current progress
  - Progress tracking: phase indicator, objectives checklist, progress bar
  - Actions: Start Quest / Cancel Quest buttons
- [ ] **Add Quest button** to GameInterface.tsx (top menu or bottom-right)
- [ ] **Wire up state** to QuestManager/gameStore (listen to quest events)

### Phase 5: Simple Rewards & Auto-Start (2 tasks)
- [ ] **Implement "unlock_quest" reward** only (skip wheat/items for now)
  - Update QuestManager.grantRewards() to unlock subsequent quests
  - Add prerequisite checking (quest available if prereqs completed)
- [ ] **Auto-start tutorial** on first game load (tutorial_basics.json)
  - Check localStorage for "hasSeenTutorial" flag
  - Automatically call startQuest('tutorial_basics') if new player

### Phase 6: Additional Quest Content (1 task)
- [ ] **Create 2 more quest JSONs** to establish quest chain:
  - `farming_loops.json` (teaches for loops with movement)
  - `functions_intro.json` (teaches function creation)
  - Quest chain: tutorial_basics → farming_loops → functions_intro

---

## Current Status

**Build**: ✅ Compiles successfully (TypeScript, Next.js 15.3.1)
**Core Systems**: DialogueManager, QuestManager, EventBus integration functional
**Test Quest**: tutorial_basics.json (7 phases, teaches movement + coding)
**Architecture**: Clean separation (UI ↔ managers ↔ store ↔ JSON data)

**Key Files**:
- `/src/types/quest.ts` - Type definitions (Quest, QuestPhase, DialogueEntry, 10 requirement types)
- `/src/game/systems/QuestManager.ts` - Quest lifecycle, progress tracking, rewards
- `/src/game/systems/DialogueManager.ts` - Dialogue sequences, requirement checking
- `/public/quests/QUEST_SCHEMA.md` - Quest creation documentation
- `/public/quests/tutorial_basics.json` - Tutorial quest (7 phases)

---

## Deferred (Future Work)

- Challenge grid integration (future quest: disable manual movement, code-only navigation)
- Wheat/resource rewards (currently: only unlock_quest rewards)
- Complex reward types (items, cosmetics, experience)
- Multi-phase manual advancement (auto-advance works well for now)

---

## Testing

```javascript
// Browser console after game loads:
await useGameStore.getState().loadQuests(['quests/tutorial_basics.json']);
useGameStore.getState().startQuest('tutorial_basics');
// Quest dialogues should appear and progress through phases
```

---

## Next Steps

1. Create QuestModal.tsx UI component
2. Add Quest Log button to game interface
3. Implement unlock_quest reward type
4. Auto-start tutorial for new players
5. Create farming_loops.json and functions_intro.json
6. Test complete quest chain flow
