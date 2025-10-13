# NPC System Documentation

## Overview

The NPC (Non-Player Character) system provides a clean, reusable way to add stationary interactive characters to your game. NPCs can trigger dialogue, display hover animations, and serve as points of interest in your game world.

## Features

- **Stationary Characters**: NPCs are placed at specific grid coordinates and don't move
- **Idle Animations**: NPCs display simple idle/standing animations
- **Click Interaction**: NPCs respond to player clicks and can trigger dialogue
- **Hover Animation**: Optional visual feedback with a 3x3 grid corner animation
- **Easy Configuration**: Simple API for creating and managing NPCs
- **Reusable System**: The hover animation system can be used for any grid position

## Quick Start

### Creating an NPC

```typescript
// Get the scene reference (in your scene's create method)
const scene = this; // ProgrammingGame scene

// Create an NPC
scene.createNPC({
  id: 'npc_manu',
  name: 'Manu',
  position: { x: 5, y: 5 }, // Grid coordinates
  spriteKey: 'manu_idle',
  dialogueFile: 'sample_dialogue.json',
  scale: 1.5,
  showHoverAnimation: true
});
```

### NPC Configuration Options

```typescript
interface NPCConfig {
  id: string;                      // Unique identifier for the NPC
  name: string;                    // Display name
  position: Position;              // Grid coordinates { x, y }
  spriteKey: string;               // Base sprite key (e.g., 'manu_idle')
  dialogueFile?: string;           // Optional dialogue JSON file
  scale?: number;                  // Optional scale factor (default: 1.5)
  showHoverAnimation?: boolean;    // Show hover effect (default: true)
}
```

## Architecture

### NPCManager

The `NPCManager` class handles all NPC-related operations:

**Key Methods:**
- `createNPC(config)` - Create a new NPC
- `removeNPC(npcId)` - Remove an NPC
- `getNPC(npcId)` - Get NPC by ID
- `getAllNPCs()` - Get all NPCs
- `getNPCAtPosition(position)` - Get NPC at specific coordinates

**Example Usage:**
```typescript
const npcManager = scene.getNPCManager();

// Create NPC
const npc = npcManager.createNPC({
  id: 'merchant',
  name: 'Merchant',
  position: { x: 10, y: 10 },
  spriteKey: 'merchant_idle'
});

// Remove NPC later
npcManager.removeNPC('merchant');
```

### GridHoverAnimation

The `GridHoverAnimation` class provides reusable hover effects for any grid position.

**Features:**
- 3x3 grid corner animation (48x48 pixels)
- Two-frame pulsing animation
- Configurable colors and speed
- Can be used independently of NPCs

**Standalone Usage:**
```typescript
import { GridHoverAnimation } from './game/systems/GridHoverAnimation';

const hoverAnim = new GridHoverAnimation(scene, {
  position: { x: 15, y: 15 },
  gridSize: 128,
  scale: 1.5,
  tintColor: 0xffffff,
  animationSpeed: 1000
});

hoverAnim.start();

// Later...
hoverAnim.stop();
hoverAnim.destroy();
```

## Adding NPC Sprites

### 1. Prepare Your Sprites

Place NPC sprite images in `/public/assets/`:
- Use PNG format for transparency
- Recommended size: 32x32 pixels or larger
- Name format: `npc_name.png` or `npc_name-state.png`

Example:
```
/public/assets/
  - manu.png
  - manu-speaking.png
  - manu-pleased.png
  - merchant-idle.png
  - guard-idle.png
```

### 2. Load Sprites in Preloader

Edit `/src/game/scenes/Preloader.ts`:

```typescript
preload() {
  // ... existing code ...
  
  this.load.setPath('/assets');
  
  // Load your NPC sprites
  this.load.image('merchant_idle', 'merchant-idle.png');
  this.load.image('guard_idle', 'guard-idle.png');
}
```

### 3. Create Animations (Optional)

For simple idle animations:

```typescript
create() {
  // ... existing code ...
  
  this.anims.create({
    key: 'merchant_idle_idle',
    frames: [{ key: 'merchant_idle', frame: 0 }],
    frameRate: 1,
    repeat: -1
  });
}
```

### 4. Use in Your Scene

```typescript
this.createNPC({
  id: 'merchant',
  name: 'Merchant',
  position: { x: 20, y: 15 },
  spriteKey: 'merchant_idle',
  dialogueFile: 'merchant_dialogue.json'
});
```

## Dialogue Integration

NPCs automatically integrate with the existing dialogue system.

### Creating Dialogue Files

Place dialogue JSON files in `/public/`:

```json
[
  {
    "name": "Manu",
    "content": "Welcome to the farm! Need any help?",
    "sprite": "manu-speaking.png"
  },
  {
    "name": "Manu",
    "content": "I can teach you about farming and programming!",
    "sprite": "manu-pleased.png"
  }
]
```

### Triggering Dialogue

When a player clicks an NPC with a `dialogueFile` configured, the dialogue system automatically loads and displays the conversation.

## Hover Animation Customization

### Default Appearance

The hover animation creates 4 corner brackets that pulse in and out:
- **Frame 0**: Small L-shaped brackets at corners
- **Frame 1**: Slightly larger L-shaped brackets
- Animation cycles between frames with yoyo effect

### Customizing Colors

```typescript
scene.createNPC({
  // ... other config ...
  showHoverAnimation: true
  // Note: Color customization can be done by modifying GridHoverAnimation
});
```

### Using Hover Animation for Other Grids

```typescript
// Highlight a special farmland plot
const specialPlotAnimation = new GridHoverAnimation(scene, {
  position: { x: 25, y: 20 },
  gridSize: 128,
  tintColor: 0x00ff00, // Green for special plot
  animationSpeed: 800
});
specialPlotAnimation.start();
```

## Advanced Usage

### Programmatic NPC Management

```typescript
// Get NPC manager
const npcManager = scene.getNPCManager();

// Create multiple NPCs
const npcData = [
  { id: 'guard1', name: 'Guard', position: { x: 5, y: 10 } },
  { id: 'guard2', name: 'Guard', position: { x: 30, y: 10 } },
];

npcData.forEach(data => {
  npcManager.createNPC({
    ...data,
    spriteKey: 'guard_idle',
    dialogueFile: 'guard_dialogue.json'
  });
});

// Find NPCs
const npcAtPosition = npcManager.getNPCAtPosition({ x: 5, y: 10 });
console.log(npcAtPosition?.name); // "Guard"

// Remove all guards
['guard1', 'guard2'].forEach(id => npcManager.removeNPC(id));
```

### Listening to NPC Events

```typescript
import { EventBus } from './game/EventBus';

// Listen for NPC clicks
EventBus.on('npc-clicked', (npc) => {
  console.log(`Player clicked on ${npc.name}`);
  
  // Custom behavior beyond dialogue
  if (npc.id === 'merchant') {
    // Open shop UI
  }
});
```

### Dynamic NPC Creation

```typescript
// Create NPC based on game state
function spawnQuestGiver(questId: string, position: Position) {
  scene.createNPC({
    id: `quest_${questId}`,
    name: 'Quest Giver',
    position: position,
    spriteKey: 'quest_giver_idle',
    dialogueFile: `quest_${questId}.json`,
    showHoverAnimation: true
  });
}

// Later, when quest is complete
scene.removeNPC(`quest_${questId}`);
```

## Best Practices

### 1. Unique IDs
Always use unique IDs for NPCs to avoid conflicts:
```typescript
const npcId = `npc_${Date.now()}`; // For dynamic NPCs
const npcId = 'npc_merchant_tavern'; // For permanent NPCs
```

### 2. Cleanup
Remove NPCs when they're no longer needed:
```typescript
// When changing scenes or areas
scene.getNPCManager().destroy();
```

### 3. Sprite Loading
Load all NPC sprites in the Preloader scene for best performance:
```typescript
// Don't load sprites dynamically during gameplay
// Always preload in Preloader.ts
```

### 4. Grid Positions
Ensure NPCs are placed on valid grid coordinates:
```typescript
const gridSize = { width: 52, height: 32 };
if (x >= 0 && x < gridSize.width && y >= 0 && y < gridSize.height) {
  scene.createNPC({ /* ... */ position: { x, y } });
}
```

### 5. Performance
Use hover animations sparingly for important NPCs only:
```typescript
// Important NPCs
showHoverAnimation: true

// Background/ambient NPCs
showHoverAnimation: false
```

## Troubleshooting

### NPC Not Appearing
1. Check if sprite is loaded: `scene.textures.exists('sprite_key')`
2. Verify grid position is within bounds
3. Check console for error messages
4. Ensure NPC depth is high enough to be visible

### Hover Animation Not Showing
1. Verify `showHoverAnimation: true` in config
2. Check if GridHoverAnimation is properly initialized
3. Ensure animation depth (2000) isn't obscured by other elements

### Dialogue Not Triggering
1. Verify dialogue file exists in `/public/`
2. Check `dialogueFile` path in NPC config
3. Ensure dialogue system is properly initialized
4. Check browser console for loading errors

### Sprite Size Issues
```typescript
// Adjust scale to match your grid size
scale: 1.5  // Default, matches Qubit size
scale: 1.0  // Smaller, fits exactly in one grid cell
scale: 2.0  // Larger, more prominent
```

## Example: Complete NPC Setup

```typescript
// 1. Add sprite to /public/assets/shopkeeper.png

// 2. In Preloader.ts
preload() {
  this.load.setPath('/assets');
  this.load.image('shopkeeper_idle', 'shopkeeper.png');
}

create() {
  this.anims.create({
    key: 'shopkeeper_idle_idle',
    frames: [{ key: 'shopkeeper_idle', frame: 0 }],
    frameRate: 1,
    repeat: -1
  });
}

// 3. Create dialogue file /public/shopkeeper_dialogue.json
[
  {
    "name": "Shopkeeper",
    "content": "Welcome to my shop! What can I get you?",
    "sprite": "shopkeeper.png"
  }
]

// 4. In ProgrammingGame.ts
create() {
  // ... other setup ...
  
  this.createNPC({
    id: 'shopkeeper',
    name: 'Shopkeeper',
    position: { x: 15, y: 15 },
    spriteKey: 'shopkeeper_idle',
    dialogueFile: 'shopkeeper_dialogue.json',
    scale: 1.5,
    showHoverAnimation: true
  });
}
```

## API Reference

### NPCConfig Interface
```typescript
interface NPCConfig {
  id: string;
  name: string;
  position: Position;
  spriteKey: string;
  dialogueFile?: string;
  scale?: number;
  showHoverAnimation?: boolean;
}
```

### NPCManager Methods
- `createNPC(config: NPCConfig): NPC`
- `removeNPC(npcId: string): void`
- `getNPC(npcId: string): NPC | undefined`
- `getAllNPCs(): NPC[]`
- `getNPCAtPosition(position: Position): NPC | undefined`
- `updateNPCPosition(npcId: string, position: Position): void`
- `destroy(): void`

### GridHoverAnimation Methods
- `start(): void` - Start the hover animation
- `stop(): void` - Stop the animation
- `updatePosition(position: Position): void` - Move the animation
- `isAnimationActive(): boolean` - Check if active
- `destroy(): void` - Clean up resources

## Events

### EventBus Events
- `'npc-clicked'` - Emitted when NPC is clicked
  ```typescript
  EventBus.on('npc-clicked', (npc: NPC) => {
    console.log(`Clicked: ${npc.name}`);
  });
  ```

- `'start-dialogue'` - Automatically emitted when NPC with dialogue is clicked
  ```typescript
  // Automatically handled by NPCManager
  // Can also be manually triggered
  EventBus.emit('start-dialogue', 'custom_dialogue.json');
  ```

## Future Enhancements

Potential improvements that could be added:
- **Animated Spritesheets**: Support for multi-frame idle animations
- **State Management**: Different sprites based on game state (happy, sad, etc.)
- **Pathfinding**: NPCs that can move between waypoints
- **Interaction Radius**: Trigger dialogue when player is nearby
- **Custom Hover Sprites**: Use custom sprites instead of generated corners
- **Sound Effects**: Play sounds when NPC is clicked or speaks
- **Quests**: Built-in quest system integration
- **Trading**: NPC-based trading/shop system

## Credits

Developed with scalability and developer experience in mind, following the existing architecture patterns in Binary Coven.

