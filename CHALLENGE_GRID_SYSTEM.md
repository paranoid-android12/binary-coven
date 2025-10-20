# Challenge Grid System Documentation

## Overview

The Challenge Grid system is a mission/quest mechanic that restricts manual movement in specific areas, forcing players to use code-based movement and actions. When a player enters a Challenge Grid:

1. **Manual movement is blocked** - Arrow keys (WASD) won't work
2. **Code-only movement** - Players must write code to move and interact
3. **No energy consumption** - Actions performed on Challenge Grids don't consume energy
4. **Visual indicators** - Clear UI feedback shows when Challenge Mode is active

## System Architecture

### 1. **Type Definitions** (`src/types/game.ts`)

```typescript
export interface GridTile {
  // ... other properties
  isChallengeGrid?: boolean; // Marks a grid as a Challenge Grid
}
```

### 2. **Game Store** (`src/stores/gameStore.ts`)

New state properties:
- `challengeGridPositions: Set<string>` - Tracks active Challenge Grid positions
- `isChallengeMode: boolean` - Global flag for Challenge Mode

New methods:
- `activateChallengeGrid(position)` - Activate a single Challenge Grid
- `deactivateChallengeGrid(position)` - Deactivate a single Challenge Grid
- `activateChallengeGrids(positions[])` - Activate multiple Challenge Grids
- `deactivateAllChallengeGrids()` - Clear all Challenge Grids
- `isChallengeGridAt(position)` - Check if a position is a Challenge Grid
- `isPlayerOnChallengeGrid()` - Check if player is on a Challenge Grid

### 3. **Movement System** (`src/game/scenes/ProgrammingGame.ts`)

The `update()` method now checks for Challenge Grids before processing arrow key input:

```typescript
// Check if player is on a Challenge Grid
const isOnChallengeGrid = gameState.isPlayerOnChallengeGrid();

if (isOnChallengeGrid) {
  // Block manual movement
  // Emit 'challenge-movement-blocked' event
  return; // Exit early
}
```

### 4. **Energy System** (`src/game/systems/CodeExecutor.ts`)

Energy consumption is skipped when on a Challenge Grid:

```typescript
const isOnChallengeGrid = store.isPlayerOnChallengeGrid();

if (result.success && result.energyCost > 0 && !isOnChallengeGrid) {
  // Consume energy normally
} else if (isOnChallengeGrid) {
  // Skip energy consumption
}
```

### 5. **UI Indicators** (`src/components/GameInterface.tsx`)

Two visual indicators:
1. **Persistent Challenge Mode Banner** - Shown at top center when on Challenge Grid
2. **Movement Blocked Message** - Brief notification when arrow keys are pressed

## Integration with Dialogue System

Challenge Grids can be activated/deactivated through the dialogue system by adding a `challengeGrids` property to dialogue entries:

```json
{
  "name": "NPC Name",
  "content": "Dialogue text...",
  "sprite": "npc-sprite.png",
  "challengeGrids": {
    "positions": [
      {"x": 10, "y": 8},
      {"x": 11, "y": 8},
      {"x": 12, "y": 8}
    ],
    "activate": true
  }
}
```

### Properties:

- `challengeGrids.positions` - Array of grid positions to activate/deactivate
- `challengeGrids.activate` - `true` to activate, `false` to deactivate

### Automatic Cleanup:

Challenge Grids are automatically deactivated when:
- Dialogue sequence completes
- Dialogue is manually closed
- New dialogue with `activate: false` is encountered

## Usage Example: challenge_field.json

The provided `challenge_field.json` demonstrates a complete quest using Challenge Grids:

1. **Setup Phase** - NPC introduces the challenge
2. **Activation** - Challenge Grids activated in a 5x5 area
3. **Player Task** - Must use code to plant crops in the field
4. **Completion** - Challenge Grids auto-deactivate when quest ends

### Key Features:

```json
{
  "challengeGrids": {
    "positions": [
      {"x": 10, "y": 8}, {"x": 11, "y": 8}, // Row 1
      {"x": 10, "y": 9}, {"x": 11, "y": 9}, // Row 2
      // ... more positions
    ],
    "activate": true
  },
  "requirement": {
    "type": "code_content",
    "content": "loop_or_grid_logic",
    "description": "Write code that plants across the whole field"
  }
}
```

## Creating New Challenge Grid Quests

### Step 1: Define Grid Area

Determine which grid positions should be Challenge Grids:

```javascript
// Example: 3x3 grid starting at (5, 5)
const positions = [];
for (let y = 5; y <= 7; y++) {
  for (let x = 5; x <= 7; x++) {
    positions.push({ x, y });
  }
}
```

### Step 2: Create Dialogue File

Create a JSON file in `/public/` directory:

```json
[
  {
    "name": "Quest Giver",
    "content": "Introduction dialogue...",
    "sprite": "npc-sprite.png"
  },
  {
    "name": "Quest Giver",
    "content": "Here's your challenge!",
    "sprite": "npc-sprite.png",
    "challengeGrids": {
      "positions": [
        {"x": 5, "y": 5},
        {"x": 6, "y": 5}
        // ... more positions
      ],
      "activate": true
    }
  }
]
```

### Step 3: Trigger Dialogue

From game code:

```typescript
EventBus.emit('start-dialogue', 'your_quest_file.json');
```

Or expose globally:

```typescript
window.startDialogue('your_quest_file.json');
```

## Event System

### Emitted Events:

- `challenge-grid-activated` - When Challenge Grid(s) are activated
  - Data: `{ position: { x, y } }`
- `challenge-grid-deactivated` - When Challenge Grid(s) are deactivated
  - Data: `{ position: { x, y } }`
- `challenge-mode-ended` - When all Challenge Grids are cleared
- `challenge-movement-blocked` - When player tries to move manually on Challenge Grid

### Listening to Events:

```typescript
EventBus.on('challenge-grid-activated', (data) => {
  console.log('Challenge Grid activated at:', data.position);
});
```

## Technical Details

### Position Storage

Challenge Grid positions are stored as strings in the format `"x,y"`:

```typescript
const posKey = `${position.x},${position.y}`;
challengeGridPositions.add(posKey);
```

### Performance Considerations

- Position checks use Set lookup: O(1) complexity
- Player position is checked every 100ms via interval
- Events are emitted for efficient UI updates

### State Persistence

Challenge Grid state is **not** automatically persisted. To save/load:

```typescript
// Save
const challengeData = {
  positions: Array.from(gameStore.challengeGridPositions),
  isActive: gameStore.isChallengeMode
};

// Load
const store = useGameStore.getState();
challengeData.positions.forEach(posKey => {
  const [x, y] = posKey.split(',').map(Number);
  store.activateChallengeGrid({ x, y });
});
```

## Best Practices

1. **Clear Communication** - Always explain to players why they can't move manually
2. **Visual Feedback** - The system provides automatic UI indicators
3. **Gradual Introduction** - Start with small Challenge Grid areas
4. **Energy-Free Practice** - Take advantage of no energy cost for player experimentation
5. **Cleanup** - Let dialogue system handle automatic deactivation

## Troubleshooting

### Player can still move manually
- Check: Is player actually on a Challenge Grid? Use console logs
- Verify: `isPlayerOnChallengeGrid()` returns true
- Ensure: Challenge Grid positions are correctly activated

### Energy still being consumed
- Check: `isPlayerOnChallengeGrid()` is being called in CodeExecutor
- Verify: Player's current position matches an active Challenge Grid

### Challenge Grids not activating
- Check: Dialogue JSON syntax is correct
- Verify: Grid positions are valid (within world bounds)
- Ensure: Dialogue system is properly loading the file

### Visual indicator not showing
- Check: React state is updating (use React DevTools)
- Verify: `isOnChallengeGrid` state in GameInterface
- Ensure: Update interval is running (100ms)

## Future Enhancements

Potential improvements:
- Visual overlay on Challenge Grid tiles
- Sound effects when entering/exiting Challenge Mode
- Particle effects or animations
- Challenge Grid-specific code restrictions
- Time-based challenges
- Multi-level Challenge Grid difficulty

## Console Commands

For debugging:

```javascript
// Activate Challenge Grid at position
useGameStore.getState().activateChallengeGrid({ x: 10, y: 10 });

// Check if position is Challenge Grid
useGameStore.getState().isChallengeGridAt({ x: 10, y: 10 });

// Clear all Challenge Grids
useGameStore.getState().deactivateAllChallengeGrids();

// Check Challenge Mode status
useGameStore.getState().isChallengeMode;
```

