# NPC System - Quick Usage Examples

## Example 1: Simple NPC with Dialogue

```typescript
// In ProgrammingGame.ts or any scene
this.createNPC({
  id: 'village_elder',
  name: 'Village Elder',
  position: { x: 10, y: 10 },
  spriteKey: 'manu_idle',
  dialogueFile: 'elder_greeting.json',
  showHoverAnimation: true
});
```

## Example 2: Multiple NPCs in a Town

```typescript
// Create a town with multiple NPCs
createTownNPCs() {
  const townNPCs = [
    {
      id: 'merchant',
      name: 'Merchant',
      position: { x: 12, y: 15 },
      spriteKey: 'manu_idle',
      dialogueFile: 'merchant_shop.json'
    },
    {
      id: 'blacksmith',
      name: 'Blacksmith',
      position: { x: 18, y: 15 },
      spriteKey: 'qubit_npc',
      dialogueFile: 'blacksmith_forge.json'
    },
    {
      id: 'guard',
      name: 'Town Guard',
      position: { x: 15, y: 12 },
      spriteKey: 'manu_idle',
      showHoverAnimation: false // No animation for this NPC
    }
  ];

  townNPCs.forEach(npc => this.createNPC(npc));
}
```

## Example 3: Quest Giver NPC

```typescript
// Create a quest giver that appears based on game state
spawnQuestGiver(questId: string) {
  this.createNPC({
    id: `quest_giver_${questId}`,
    name: 'Mysterious Stranger',
    position: { x: 20, y: 20 },
    spriteKey: 'manu_idle',
    dialogueFile: `quest_${questId}_intro.json`,
    scale: 1.8, // Slightly larger to stand out
    showHoverAnimation: true
  });
}

// Remove when quest is complete
completeQuest(questId: string) {
  this.removeNPC(`quest_giver_${questId}`);
}
```

## Example 4: NPC with Custom Interaction

```typescript
import { EventBus } from './game/EventBus';

// Create NPC
this.createNPC({
  id: 'shopkeeper',
  name: 'Shopkeeper',
  position: { x: 25, y: 18 },
  spriteKey: 'manu_idle',
  // No dialogueFile - we'll handle interaction manually
  showHoverAnimation: true
});

// Listen for NPC clicks
EventBus.on('npc-clicked', (npc) => {
  if (npc.id === 'shopkeeper') {
    // Open custom shop UI instead of dialogue
    this.openShopInterface();
  }
});
```

## Example 5: Using Hover Animation Separately

```typescript
import { GridHoverAnimation } from './game/systems/GridHoverAnimation';

// Highlight a special location without an NPC
highlightSpecialGrid(position: Position) {
  const highlight = new GridHoverAnimation(this, {
    position: position,
    gridSize: 128,
    scale: 1.5,
    tintColor: 0x00ff00, // Green for special areas
    animationSpeed: 800
  });
  
  highlight.start();
  
  // Store reference to remove later
  this.specialHighlights.set('treasure', highlight);
}

// Remove highlight when player finds treasure
removeHighlight() {
  const highlight = this.specialHighlights.get('treasure');
  if (highlight) {
    highlight.stop();
    highlight.destroy();
    this.specialHighlights.delete('treasure');
  }
}
```

## Example 6: Dynamic NPC Positioning

```typescript
// Get NPC manager
const npcManager = this.getNPCManager();

// Create NPCs in a circle around a center point
createNPCCircle(center: Position, radius: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const x = Math.round(center.x + Math.cos(angle) * radius);
    const y = Math.round(center.y + Math.sin(angle) * radius);
    
    this.createNPC({
      id: `circle_npc_${i}`,
      name: `Guard ${i + 1}`,
      position: { x, y },
      spriteKey: 'qubit_npc',
      showHoverAnimation: true
    });
  }
}

// Usage
createNPCCircle({ x: 26, y: 16 }, 5, 8); // 8 NPCs in a circle
```

## Example 7: NPC with State-Based Dialogue

```typescript
// Store NPC state
private npcStates = new Map<string, string>();

createStatefulNPC(id: string, position: Position) {
  this.npcStates.set(id, 'greeting');
  
  this.createNPC({
    id: id,
    name: 'Wise Sage',
    position: position,
    spriteKey: 'manu_idle',
    // dialogueFile will be set dynamically
    showHoverAnimation: true
  });
}

// Override click handler to change dialogue based on state
EventBus.on('npc-clicked', (npc) => {
  if (npc.id === 'wise_sage') {
    const state = this.npcStates.get(npc.id) || 'greeting';
    
    // Trigger different dialogue based on state
    const dialogueFiles = {
      'greeting': 'sage_greeting.json',
      'quest_active': 'sage_quest_progress.json',
      'quest_complete': 'sage_quest_reward.json'
    };
    
    EventBus.emit('start-dialogue', dialogueFiles[state]);
  }
});
```

## Example 8: Removing All NPCs (Scene Transition)

```typescript
// When switching scenes or areas
cleanupCurrentArea() {
  const npcManager = this.getNPCManager();
  const allNPCs = npcManager.getAllNPCs();
  
  // Remove all NPCs
  allNPCs.forEach(npc => {
    npcManager.removeNPC(npc.id);
  });
  
  console.log('All NPCs removed');
}
```

## Example 9: Check for NPC at Position

```typescript
// Before placing something at a position, check if NPC exists
placeObject(position: Position) {
  const npcManager = this.getNPCManager();
  const existingNPC = npcManager.getNPCAtPosition(position);
  
  if (existingNPC) {
    console.log(`Cannot place object - NPC ${existingNPC.name} is here`);
    return false;
  }
  
  // Safe to place object
  this.createGridObject(position);
  return true;
}
```

## Example 10: Tutorial NPC that Disappears

```typescript
createTutorialNPC() {
  this.createNPC({
    id: 'tutorial_helper',
    name: 'Tutorial Guide',
    position: { x: 5, y: 5 },
    spriteKey: 'manu_idle',
    dialogueFile: 'tutorial_intro.json',
    scale: 1.5,
    showHoverAnimation: true
  });
  
  // Remove after player completes tutorial
  EventBus.on('tutorial-complete', () => {
    this.removeNPC('tutorial_helper');
    
    // Show completion message
    console.log('Tutorial complete! Guide has left.');
  });
}
```

## Common Patterns

### Pattern 1: NPC Groups
```typescript
// Keep track of NPC groups for easy management
private npcGroups = new Map<string, string[]>();

addNPCGroup(groupName: string, npcIds: string[]) {
  this.npcGroups.set(groupName, npcIds);
}

removeNPCGroup(groupName: string) {
  const npcIds = this.npcGroups.get(groupName);
  if (npcIds) {
    npcIds.forEach(id => this.removeNPC(id));
    this.npcGroups.delete(groupName);
  }
}
```

### Pattern 2: NPC Factory
```typescript
createNPCFromTemplate(template: string, position: Position) {
  const templates = {
    'guard': {
      spriteKey: 'qubit_npc',
      scale: 1.5,
      dialogueFile: 'guard_dialogue.json'
    },
    'merchant': {
      spriteKey: 'manu_idle',
      scale: 1.5,
      dialogueFile: 'merchant_dialogue.json'
    }
  };
  
  const config = templates[template];
  if (!config) return;
  
  this.createNPC({
    id: `${template}_${Date.now()}`,
    name: template.charAt(0).toUpperCase() + template.slice(1),
    position,
    ...config,
    showHoverAnimation: true
  });
}
```

### Pattern 3: Conditional NPC Spawning
```typescript
updateNPCSpawns() {
  const gameState = useGameStore.getState();
  const playerLevel = gameState.entities.get('qubit')?.stats.level || 1;
  
  // Spawn higher level NPCs based on player progress
  if (playerLevel >= 5 && !this.getNPCManager().getNPC('advanced_merchant')) {
    this.createNPC({
      id: 'advanced_merchant',
      name: 'Master Merchant',
      position: { x: 30, y: 20 },
      spriteKey: 'manu_idle',
      dialogueFile: 'advanced_merchant.json',
      showHoverAnimation: true
    });
  }
}
```

## Tips

1. **Unique IDs**: Always use unique, descriptive IDs for your NPCs
2. **Positioning**: Keep NPCs in logical, easily accessible locations
3. **Hover Animation**: Use sparingly for important NPCs to avoid visual clutter
4. **Cleanup**: Always remove NPCs when changing scenes or areas
5. **Testing**: Check console logs for NPC creation/removal confirmations
6. **Performance**: Preload all NPC sprites in Preloader scene

## Debugging

```typescript
// Debug: Show all NPCs
debugShowAllNPCs() {
  const npcManager = this.getNPCManager();
  const allNPCs = npcManager.getAllNPCs();
  
  console.log('=== All NPCs ===');
  allNPCs.forEach(npc => {
    console.log(`${npc.name} (${npc.id}): (${npc.position.x}, ${npc.position.y})`);
  });
}

// Debug: Highlight all NPC positions
debugHighlightNPCs() {
  const npcManager = this.getNPCManager();
  allNPCs.forEach(npc => {
    // Add visual marker
    const marker = this.add.circle(
      npc.position.x * 128 + 64,
      npc.position.y * 128 + 64,
      10,
      0xff0000
    );
    marker.setDepth(3000);
  });
}
```

