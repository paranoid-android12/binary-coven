# Quest JSON Schema Documentation

This document describes the JSON structure for creating quests in the Binary Coven game.

## Table of Contents

1. [Overview](#overview)
2. [Quest Structure](#quest-structure)
3. [Phase Structure](#phase-structure)
4. [Dialogue Entries](#dialogue-entries)
5. [Quest Requirements](#quest-requirements)
6. [Challenge Grids](#challenge-grids)
7. [Rewards](#rewards)
8. [Complete Example](#complete-example)
9. [Best Practices](#best-practices)

---

## Overview

Quests are defined as JSON files stored in the `/public/quests/` directory. Each quest file contains:

- **Metadata**: ID, title, description, difficulty
- **Phases**: Sequential segments of the quest with objectives
- **Dialogues**: NPC conversations that guide the player
- **Requirements**: Objectives that must be completed
- **Rewards**: Unlocks, items, or resources given upon completion

---

## Quest Structure

### Root Quest Object

```json
{
  "id": "unique_quest_id",
  "title": "Quest Title",
  "description": "Quest description shown in the quest log",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "category": "Tutorial",
  "estimatedTime": 10,
  "concepts": ["movement", "functions", "loops"],
  "prerequisites": ["previous_quest_id"],
  "icon": "quest_icon.png",
  "thumbnail": "quest_thumbnail.png",
  "phases": [ /* Phase objects */ ],
  "rewards": [ /* Reward objects */ ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier for the quest |
| `title` | string | ✅ | Display name of the quest |
| `description` | string | ✅ | Detailed quest description |
| `difficulty` | enum | ✅ | One of: `beginner`, `intermediate`, `advanced` |
| `category` | string | ❌ | Quest category (e.g., "Tutorial", "Farming") |
| `estimatedTime` | number | ❌ | Estimated completion time in minutes |
| `concepts` | string[] | ❌ | Programming concepts taught (see ProgrammingConcept enum) |
| `prerequisites` | string[] | ❌ | Quest IDs that must be completed first |
| `icon` | string | ❌ | Icon image file path |
| `thumbnail` | string | ❌ | Thumbnail image file path |
| `phases` | Phase[] | ✅ | Array of quest phases (minimum 1) |
| `rewards` | Reward[] | ❌ | Rewards given upon completion |

---

## Phase Structure

Quests are broken into **phases** that progress sequentially. Each phase can have:

- **Pre-dialogues**: Shown before objectives
- **Objectives**: Requirements to complete the phase
- **Post-dialogues**: Shown after objectives complete

```json
{
  "id": "phase_1",
  "title": "Phase Title",
  "description": "Phase description",
  "preDialogues": [ /* Dialogue objects */ ],
  "objectives": [ /* Requirement objects */ ],
  "postDialogues": [ /* Dialogue objects */ ],
  "challengeGrids": { /* Challenge grid config */ },
  "startingCode": "# Optional starting code\nprint('Hello')",
  "autoAdvance": true
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique phase identifier |
| `title` | string | ✅ | Display name of the phase |
| `description` | string | ❌ | Phase description |
| `preDialogues` | DialogueEntry[] | ❌ | Dialogues shown before objectives |
| `objectives` | Requirement[] | ❌ | Requirements to complete phase |
| `postDialogues` | DialogueEntry[] | ❌ | Dialogues shown after completion |
| `challengeGrids` | ChallengeGridConfig | ❌ | Challenge grid configuration |
| `startingCode` | string | ❌ | Code pre-loaded in the editor |
| `autoAdvance` | boolean | ❌ | Auto-advance to next phase (default: true) |

---

## Dialogue Entries

Dialogues are conversations between NPCs and the player.

```json
{
  "name": "Lain",
  "content": "Welcome to the tutorial! Let's learn how to move.",
  "sprite": "manu-smile.png",
  "camera": { "x": 10, "y": 5 },
  "mainImage": "tutorial_intro.png"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Speaker name |
| `content` | string | ✅ | Dialogue text |
| `sprite` | string | ✅ | Character portrait image |
| `camera` | {x, y} | ❌ | Camera position to move to |
| `mainImage` | string | ❌ | Main image to display |

---

## Quest Requirements

Requirements (objectives) define what the player must do to progress.

### Requirement Types

#### 1. Movement
Player must move in specific directions using arrow keys.

```json
{
  "type": "movement",
  "description": "Move around using arrow keys. Try all 4 directions!",
  "directions": ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
}
```

#### 2. Open Terminal
Player must open the programming terminal.

```json
{
  "type": "open_terminal",
  "description": "Click on the character to open the programming interface"
}
```

#### 3. Code Content
Code must contain specific text.

```json
{
  "type": "code_content",
  "description": "Write code that includes 'move_up()'",
  "content": "move_up()"
}
```

#### 4. Play Button
Player must click the play/execute button.

```json
{
  "type": "play_button",
  "description": "Click the Play button to execute your code"
}
```

#### 5. Movement Command
Code must use movement commands.

```json
{
  "type": "movement_command",
  "description": "Use movement commands in your code",
  "commands": ["move_up", "move_down", "move_left", "move_right"]
}
```

#### 6. Challenge Completion
Complete challenge grid objectives (e.g., plant all tiles).

```json
{
  "type": "challenge_completion",
  "description": "Plant wheat on all marked tiles",
  "challengePositions": [
    { "x": 10, "y": 5 },
    { "x": 11, "y": 5 }
  ]
}
```

#### 7. Interact NPC
Interact with a specific NPC.

```json
{
  "type": "interact_npc",
  "description": "Talk to Qubit",
  "npcId": "qubit"
}
```

#### 8. Harvest Crop
Harvest a specific number of crops.

```json
{
  "type": "harvest_crop",
  "description": "Harvest 10 wheat",
  "cropType": "wheat",
  "cropCount": 10
}
```

#### 9. Reach Position
Move to a specific position on the map.

```json
{
  "type": "reach_position",
  "description": "Move to the marked location",
  "position": { "x": 15, "y": 10 }
}
```

#### 10. Use Function
Use a specific programming function.

```json
{
  "type": "use_function",
  "description": "Use the plant() function",
  "functionName": "plant"
}
```

---

## Challenge Grids

Challenge grids restrict manual movement and require code-based solutions.

```json
{
  "challengeGrids": {
    "positions": [
      { "x": 10, "y": 5 },
      { "x": 11, "y": 5 },
      { "x": 12, "y": 5 },
      { "x": 13, "y": 5 }
    ],
    "activate": true
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `positions` | Position[] | ✅ | Grid positions to affect |
| `activate` | boolean | ✅ | `true` to activate, `false` to deactivate |

---

## Rewards

Rewards are granted when a quest is completed.

### Reward Types

#### 1. Unlock Quest
Unlock another quest.

```json
{
  "type": "unlock_quest",
  "value": "next_quest_id",
  "description": "Unlocked the next quest!"
}
```

#### 2. Item
Give an item to the player's inventory.

```json
{
  "type": "item",
  "value": "item_id",
  "description": "Received a special tool"
}
```

#### 3. Resource
Give resources (e.g., wheat, energy).

```json
{
  "type": "resource",
  "value": 100,
  "description": "Gained 100 energy"
}
```

#### 4. Function
Unlock a new programming function.

```json
{
  "type": "function",
  "value": "advanced_plant",
  "description": "Unlocked the advanced_plant() function"
}
```

#### 5. Cosmetic
Unlock a cosmetic item or skin.

```json
{
  "type": "cosmetic",
  "value": "cool_hat",
  "description": "Unlocked a cool hat"
}
```

---

## Complete Example

Here's a complete quest JSON file:

```json
{
  "id": "tutorial_basics",
  "title": "Programming Basics",
  "description": "Learn the fundamentals of programming through movement and interaction.",
  "difficulty": "beginner",
  "category": "Tutorial",
  "estimatedTime": 15,
  "concepts": ["movement", "functions"],
  "prerequisites": [],
  "icon": "tutorial_icon.png",
  "phases": [
    {
      "id": "phase_1_intro",
      "title": "Introduction",
      "description": "Meet the characters and learn about the world",
      "preDialogues": [
        {
          "name": "Lain",
          "content": "Welcome! I'll teach you the basics of programming.",
          "sprite": "lain-smile.png",
          "camera": { "x": 10, "y": 5 }
        },
        {
          "name": "Qubit",
          "content": "First, let's learn how to move!",
          "sprite": "qubit-happy.png"
        }
      ],
      "objectives": [
        {
          "type": "movement",
          "description": "Move around using arrow keys (all 4 directions)",
          "directions": ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
        }
      ],
      "postDialogues": [
        {
          "name": "Lain",
          "content": "Great job! You've mastered movement.",
          "sprite": "lain-happy.png"
        }
      ]
    },
    {
      "id": "phase_2_terminal",
      "title": "Programming Terminal",
      "description": "Learn to use the programming interface",
      "preDialogues": [
        {
          "name": "Qubit",
          "content": "Now let's open the programming terminal.",
          "sprite": "qubit-neutral.png"
        }
      ],
      "objectives": [
        {
          "type": "open_terminal",
          "description": "Click on Qubit to open the programming interface"
        }
      ]
    },
    {
      "id": "phase_3_coding",
      "title": "Writing Code",
      "description": "Write your first program",
      "preDialogues": [
        {
          "name": "Lain",
          "content": "Now write code to move up!",
          "sprite": "lain-neutral.png"
        }
      ],
      "startingCode": "# Write your code here\n",
      "objectives": [
        {
          "type": "code_content",
          "description": "Write code that includes 'move_up()'",
          "content": "move_up()"
        },
        {
          "type": "play_button",
          "description": "Click the Play button to execute"
        }
      ],
      "postDialogues": [
        {
          "name": "Qubit",
          "content": "Excellent! You've completed the tutorial!",
          "sprite": "qubit-happy.png"
        }
      ]
    }
  ],
  "rewards": [
    {
      "type": "unlock_quest",
      "value": "tutorial_advanced",
      "description": "Unlocked Advanced Tutorial"
    },
    {
      "type": "resource",
      "value": 50,
      "description": "Gained 50 energy"
    }
  ]
}
```

---

## Best Practices

### 1. Quest Design

- **Start Simple**: Begin with basic objectives and gradually increase complexity
- **Clear Descriptions**: Make objective descriptions clear and actionable
- **Logical Flow**: Ensure phases flow naturally from one to another
- **Test Thoroughly**: Test the entire quest flow before deploying

### 2. Dialogue

- **Keep it Brief**: Keep dialogue entries concise (1-3 sentences)
- **Show Personality**: Give each NPC a distinct voice
- **Guide the Player**: Use dialogue to hint at objectives
- **Celebrate Success**: Acknowledge player achievements in post-dialogues

### 3. Objectives

- **One Goal at a Time**: Don't overwhelm with too many simultaneous objectives
- **Progressive Difficulty**: Start easy and gradually increase challenge
- **Clear Win Conditions**: Make it obvious when an objective is complete
- **Provide Feedback**: Use the description field to guide players

### 4. Challenge Grids

- **Visual Clarity**: Ensure challenge grid positions are visually distinct
- **Test Coordinates**: Verify all grid positions are valid
- **Balanced Difficulty**: Make challenges achievable but not trivial
- **Clear Instructions**: Explain what needs to be done in the objective description

### 5. Rewards

- **Meaningful Rewards**: Give rewards that feel valuable
- **Progressive Unlocks**: Use quest chains to create a sense of progression
- **Multiple Reward Types**: Mix different reward types for variety
- **Celebrate Completion**: Show a notification when rewards are granted

### 6. File Organization

- Place quest files in `/public/quests/`
- Use descriptive filenames: `tutorial_basics.json`, `farming_advanced.json`
- Group related quests with prefixes: `tutorial_`, `farming_`, etc.
- Keep a quest registry or index for easy loading

### 7. Prerequisites

- **Logical Chains**: Ensure prerequisite quests actually prepare players
- **Avoid Circular Dependencies**: Don't create circular prerequisite chains
- **Test Unlocking**: Verify quests unlock correctly after prerequisites
- **Starter Quests**: Have at least one quest with no prerequisites

---

## Quest Lifecycle

1. **Load**: QuestManager loads the JSON file
2. **Check Prerequisites**: Determines if quest is unlocked
3. **Start**: Player starts the quest from the quest log
4. **Phase Progression**:
   - Show pre-dialogues
   - Track objective completion
   - Show post-dialogues
   - Advance to next phase
5. **Complete**: All phases complete, grant rewards
6. **Unlock**: Check and unlock dependent quests

---

## Programming Concepts Reference

Available values for the `concepts` array:

- `functions` - Function definition and calling
- `variables` - Variable declaration and usage
- `loops` - For/while loops
- `conditionals` - If/else statements
- `arrays` - Array/list operations
- `objects` - Object/dictionary manipulation
- `movement` - Character movement
- `interaction` - Grid/entity interaction
- `logic` - Boolean logic
- `debugging` - Debugging skills

---

## Troubleshooting

### Quest Won't Load
- Check JSON syntax (use a JSON validator)
- Verify all required fields are present
- Check file path is correct

### Quest Won't Unlock
- Verify prerequisites are correct quest IDs
- Ensure prerequisite quests are completed
- Check QuestManager logs for errors

### Objectives Not Completing
- Verify objective type matches the action
- Check that descriptions match the requirement
- Test objective conditions manually

### Challenge Grids Not Working
- Verify grid positions exist in the game world
- Check that `activate` is set correctly
- Ensure phase has `challengeGrids` configured

---

## Additional Resources

- **Game Type Definitions**: `/src/types/quest.ts`
- **QuestManager Source**: `/src/game/systems/QuestManager.ts`
- **Example Quests**: `/public/quests/tutorial_basics.json`
- **EventBus Events**: See QuestManager for available events

---

**Happy Quest Creating!** 🎮✨
