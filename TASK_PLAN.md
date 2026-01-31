# Binary Coven - Quest Implementation Task Plan

## 📋 Project Overview

**Goal:** Create 24 new quest JSON files to complete the 6×5 curriculum (30 total quests)

**Timeline Estimate:** 3-5 days of focused development

**Files Location:** `public/quests/`

---

## 🎯 Task Breakdown by Topic

### Phase 1: Basic Commands & Sequences (1 quest)
**Estimated Time:** 30 minutes
**Priority:** ⭐⭐⭐ HIGH - Complete existing track

| Task ID | Quest | File | Est. Time | Status |
|---------|-------|------|-----------|--------|
| T1.1 | Sequence Challenge | `sequence_challenge.json` | 30 min | ⬜ TODO |

---

### Phase 2: Variables & Data Types (5 quests)
**Estimated Time:** 3-4 hours
**Priority:** ⭐⭐⭐ HIGH - Foundation for everything

| Task ID | Quest | File | Est. Time | Status |
|---------|-------|------|-----------|--------|
| T2.1 | The Memory Stone | `variables_intro.json` | 45 min | ⬜ TODO |
| T2.2 | Counting Crops | `number_variables.json` | 40 min | ⬜ TODO |
| T2.3 | Naming Things | `string_variables.json` | 40 min | ⬜ TODO |
| T2.4 | True or False | `boolean_variables.json` | 40 min | ⬜ TODO |
| T2.5 | Variables Challenge | `variables_challenge.json` | 45 min | ⬜ TODO |

---

### Phase 3: Conditionals (5 quests)
**Estimated Time:** 3-4 hours
**Priority:** ⭐⭐⭐ HIGH - Core programming logic

| Task ID | Quest | File | Est. Time | Status |
|---------|-------|------|-----------|--------|
| T3.1 | The Crossroads | `conditionals_intro.json` | 45 min | ⬜ TODO |
| T3.2 | Either Or | `if_else.json` | 40 min | ⬜ TODO |
| T3.3 | Multiple Paths | `elif_chains.json` | 40 min | ⬜ TODO |
| T3.4 | Complex Decisions | `complex_conditions.json` | 45 min | ⬜ TODO |
| T3.5 | Conditionals Challenge | `conditionals_challenge.json` | 45 min | ⬜ TODO |

---

### Phase 4: Loops (4 quests - 1 exists)
**Estimated Time:** 2.5-3 hours
**Priority:** ⭐⭐ MEDIUM - Builds on existing

| Task ID | Quest | File | Est. Time | Status |
|---------|-------|------|-----------|--------|
| T4.1 | The Field of Repetition | `farming_loops.json` | - | ✅ EXISTS |
| T4.2 | Loop the Farm | `loop_movement.json` | 40 min | ⬜ TODO |
| T4.3 | Mass Planting | `loop_actions.json` | 40 min | ⬜ TODO |
| T4.4 | While You Wait | `while_loops.json` | 45 min | ⬜ TODO |
| T4.5 | Loops Challenge | `loops_challenge.json` | 45 min | ⬜ TODO |

---

### Phase 5: Functions (4 quests - 1 exists)
**Estimated Time:** 2.5-3 hours
**Priority:** ⭐⭐ MEDIUM - Builds on existing

| Task ID | Quest | File | Est. Time | Status |
|---------|-------|------|-----------|--------|
| T5.1 | The Art of Functions | `functions_intro.json` | - | ✅ EXISTS |
| T5.2 | Helper Functions | `helper_functions.json` | 40 min | ⬜ TODO |
| T5.3 | Functions with Parameters | `function_parameters.json` | 45 min | ⬜ TODO |
| T5.4 | Return Values | `return_values.json` | 45 min | ⬜ TODO |
| T5.5 | Functions Challenge | `functions_challenge.json` | 45 min | ⬜ TODO |

---

### Phase 6: Lists/Arrays (5 quests)
**Estimated Time:** 3-4 hours
**Priority:** ⭐⭐ MEDIUM - Data structures

| Task ID | Quest | File | Est. Time | Status |
|---------|-------|------|-----------|--------|
| T6.1 | The Collection | `lists_intro.json` | 45 min | ⬜ TODO |
| T6.2 | Finding Items | `list_indexing.json` | 40 min | ⬜ TODO |
| T6.3 | Growing Lists | `list_modification.json` | 40 min | ⬜ TODO |
| T6.4 | Loop Through Lists | `list_iteration.json` | 45 min | ⬜ TODO |
| T6.5 | Lists Challenge | `lists_challenge.json` | 45 min | ⬜ TODO |

---

## 📅 Recommended Implementation Schedule

### Day 1: Foundation (6 quests)
- [ ] **Morning:** T1.1 (Sequence Challenge)
- [ ] **Afternoon:** T2.1, T2.2, T2.3 (Variables Part 1)
- [ ] **Evening:** T2.4, T2.5 (Variables Part 2)

### Day 2: Logic (5 quests)
- [ ] **Morning:** T3.1, T3.2 (Conditionals Basic)
- [ ] **Afternoon:** T3.3, T3.4 (Conditionals Advanced)
- [ ] **Evening:** T3.5 (Conditionals Challenge)

### Day 3: Repetition (4 quests)
- [ ] **Morning:** T4.2, T4.3 (Loops Movement)
- [ ] **Afternoon:** T4.4, T4.5 (Loops While + Challenge)

### Day 4: Abstraction (4 quests)
- [ ] **Morning:** T5.2, T5.3 (Functions Helpers)
- [ ] **Afternoon:** T5.4, T5.5 (Functions Return + Challenge)

### Day 5: Collections (5 quests)
- [ ] **Morning:** T6.1, T6.2 (Lists Basics)
- [ ] **Afternoon:** T6.3, T6.4 (Lists Modification)
- [ ] **Evening:** T6.5 (Lists Challenge)

---

## 🔧 Technical Requirements per Quest

Each quest JSON must include:

```
1. id: Unique identifier (snake_case)
2. title: Display name
3. description: Quest description
4. difficulty: "beginner" | "intermediate" | "advanced"
5. category: Topic name
6. estimatedTime: Minutes to complete
7. concepts: Array of concepts taught
8. prerequisites: Array of required quest IDs
9. phases: Array of 3-5 phases with:
   - id, title, description
   - preDialogues: NPC dialogue array
   - objectives: Requirements to complete phase
   - postDialogues: Completion dialogue
   - autoAdvance: true/false
10. rewards: Array of rewards (unlock_quest, etc.)
```

### Objective Types to Use:
- `code_content` - Check for specific code text
- `play_button` - Click run button
- `movement` - Physical movement
- `movement_command` - Movement function in code
- `variable_value` - Check variable equals value
- `function_call` - Check function was called

---

## 📝 Quest Template

```json
{
  "id": "quest_id",
  "title": "Quest Title",
  "description": "Learn about [concept]",
  "difficulty": "beginner",
  "category": "Topic Name",
  "estimatedTime": 10,
  "concepts": ["concept1", "concept2"],
  "prerequisites": [],
  "phases": [
    {
      "id": "phase_1_intro",
      "title": "Introduction",
      "description": "Meet the NPC and learn the concept",
      "preDialogues": [
        {
          "name": "Maru",
          "content": "Hey Qubit! Today we're learning about [concept].",
          "sprite": "manu-speaking.png"
        },
        {
          "name": "Qubit",
          "content": "What's that?",
          "sprite": "qubit-speaking.png"
        },
        {
          "name": "Maru",
          "content": "[Explanation of concept]",
          "sprite": "manu-pleased.png"
        }
      ],
      "objectives": [],
      "postDialogues": [],
      "autoAdvance": true
    },
    {
      "id": "phase_2_learn",
      "title": "Learning the Syntax",
      "description": "Write your first [concept]",
      "preDialogues": [
        {
          "name": "Maru",
          "content": "Try typing: [code example]",
          "sprite": "manu-speaking.png"
        }
      ],
      "objectives": [
        {
          "type": "code_content",
          "content": "example_code",
          "description": "Type: example_code"
        }
      ],
      "postDialogues": [
        {
          "name": "Maru",
          "content": "Perfect! You've created your first [concept]!",
          "sprite": "manu-pleased.png"
        }
      ],
      "autoAdvance": true
    },
    {
      "id": "phase_3_practice",
      "title": "Practice",
      "description": "Use [concept] in a real scenario",
      "preDialogues": [
        {
          "name": "Maru",
          "content": "Now let's use this in farming!",
          "sprite": "manu-speaking.png"
        }
      ],
      "objectives": [
        {
          "type": "code_content",
          "content": "practical_code",
          "description": "Apply the concept"
        }
      ],
      "postDialogues": [
        {
          "name": "Maru",
          "content": "Excellent work! You've mastered [concept]!",
          "sprite": "manu-pleased.png"
        }
      ],
      "autoAdvance": true
    },
    {
      "id": "phase_4_execute",
      "title": "Execute",
      "description": "Run your code",
      "preDialogues": [
        {
          "name": "Maru",
          "content": "Click the play button to run your code!",
          "sprite": "manu-speaking.png"
        }
      ],
      "objectives": [
        {
          "type": "play_button",
          "description": "Click play to run"
        }
      ],
      "postDialogues": [
        {
          "name": "Maru",
          "content": "Amazing! You completed [quest name]!",
          "sprite": "manu-pleased.png"
        }
      ],
      "autoAdvance": true
    }
  ],
  "rewards": [
    {
      "type": "unlock_quest",
      "value": "next_quest_id",
      "description": "Unlock next quest"
    }
  ]
}
```

---

## ✅ Checklist

### Pre-Implementation
- [ ] Review existing quest files for style consistency
- [ ] Confirm NPC names (Maru, Qubit, Lain, Ada, etc.)
- [ ] Confirm sprite filenames
- [ ] Test quest loading in game

### During Implementation
- [ ] Follow JSON schema exactly
- [ ] Use consistent difficulty progression
- [ ] Include 3-5 phases per quest
- [ ] Add meaningful dialogues
- [ ] Test objectives work correctly

### Post-Implementation
- [ ] Validate all JSON files
- [ ] Test quest flow in game
- [ ] Verify rewards unlock correctly
- [ ] Check prerequisites chain
- [ ] Document any issues

---

## 📊 Progress Summary

| Phase | Topic | Quests | Complete | Remaining |
|-------|-------|--------|----------|-----------|
| 1 | Basic Commands | 5 | 4 | 1 |
| 2 | Variables | 5 | 0 | 5 |
| 3 | Conditionals | 5 | 0 | 5 |
| 4 | Loops | 5 | 1 | 4 |
| 5 | Functions | 5 | 1 | 4 |
| 6 | Lists | 5 | 0 | 5 |
| **TOTAL** | | **30** | **6** | **24** |

**Overall Progress:** 6/30 (20%)

---

## 🚀 Quick Start

To begin implementation:

1. Open the quest template above
2. Start with Task T1.1 (sequence_challenge.json)
3. Fill in the template with topic-specific content
4. Save to `public/quests/` folder
5. Test in game by loading the quest
6. Mark task as complete
7. Move to next task

**Let's build this curriculum!** 🎮
