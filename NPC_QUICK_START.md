# NPC System - Quick Start Guide

## 5-Minute Setup

### Step 1: Add Your NPC Sprite (1 minute)

1. Place your NPC image in `/public/assets/`
   ```
   /public/assets/my-npc.png
   ```

### Step 2: Load the Sprite (1 minute)

Edit `/src/game/scenes/Preloader.ts`:

```typescript
preload() {
  // Find the existing setPath('/assets') line
  this.load.setPath('/assets');
  
  // Add your sprite
  this.load.image('my_npc_idle', 'my-npc.png');
}

create() {
  // Add animation (at the end of createNPCAnimations method)
  if (this.textures.exists('my_npc_idle')) {
    this.anims.create({
      key: 'my_npc_idle_idle',
      frames: [{ key: 'my_npc_idle', frame: 0 }],
      frameRate: 1,
      repeat: -1
    });
  }
}
```

### Step 3: Create Dialogue (Optional, 1 minute)

Create `/public/my_npc_dialogue.json`:

```json
[
  {
    "name": "My NPC",
    "content": "Hello! I'm a new NPC!",
    "sprite": "my-npc.png"
  }
]
```

### Step 4: Add NPC to Game (1 minute)

Edit `/src/game/scenes/ProgrammingGame.ts`:

Find the `createSampleNPCs()` method and add:

```typescript
private createSampleNPCs(): void {
  // ... existing NPCs ...
  
  // Add your NPC
  this.createNPC({
    id: 'my_custom_npc',
    name: 'My NPC',
    position: { x: 15, y: 15 },  // Change position as needed
    spriteKey: 'my_npc_idle',
    dialogueFile: 'my_npc_dialogue.json',
    scale: 1.5,
    showHoverAnimation: true
  });
}
```

### Step 5: Test (1 minute)

1. Save all files
2. Refresh your game
3. Click on your NPC at position (15, 15)
4. See the dialogue appear!

## Done! 🎉

Your NPC is now in the game with:
- ✅ Sprite rendering
- ✅ Hover animation
- ✅ Click interaction
- ✅ Dialogue trigger

## Common Modifications

### Change NPC Position

```typescript
position: { x: 20, y: 25 }  // Grid coordinates
```

### Disable Hover Animation

```typescript
showHoverAnimation: false
```

### Make NPC Larger/Smaller

```typescript
scale: 2.0   // Larger (2x grid size)
scale: 1.0   // Normal (1x grid size)
scale: 0.75  // Smaller (0.75x grid size)
```

### Remove Dialogue

```typescript
// Just don't include dialogueFile property
this.createNPC({
  id: 'silent_npc',
  name: 'Silent NPC',
  position: { x: 10, y: 10 },
  spriteKey: 'my_npc_idle'
  // No dialogueFile = no dialogue on click
});
```

## Using Existing Sprites

You can use the pre-loaded Manu sprites:

```typescript
// Available sprite keys:
'manu_idle'      // Normal Manu
'manu_speaking'  // Manu speaking
'manu_pleased'   // Manu happy
'manu_angry'     // Manu angry
'manu_defeated'  // Manu sad
'qubit_npc'      // Qubit speaking

// Example:
this.createNPC({
  id: 'manu_helper',
  name: 'Manu',
  position: { x: 8, y: 8 },
  spriteKey: 'manu_idle',
  dialogueFile: 'sample_dialogue.json'
});
```

## Removing Sample NPCs

To remove the default sample NPCs, edit `createSampleNPCs()`:

```typescript
private createSampleNPCs(): void {
  // Comment out or delete these:
  // this.createNPC({ ... }); // Manu
  // this.createNPC({ ... }); // Helper
  
  // Add your own NPCs here
  this.createNPC({ ... });
}
```

## Troubleshooting

### NPC Not Showing

**Check:**
1. ✅ Sprite file exists in `/public/assets/`
2. ✅ Sprite loaded in Preloader
3. ✅ Position is within grid bounds (0-51 x, 0-31 y)
4. ✅ No console errors

### Hover Animation Not Showing

**Check:**
1. ✅ `showHoverAnimation: true` in config
2. ✅ NPC position is valid
3. ✅ No other errors in console

### Dialogue Not Triggering

**Check:**
1. ✅ Dialogue file exists in `/public/`
2. ✅ `dialogueFile` property is set correctly
3. ✅ Dialogue system is working (test with sample_dialogue.json)

### Sprite Looks Wrong

**Try:**
```typescript
// Adjust scale
scale: 1.5  // Default
scale: 1.0  // Smaller
scale: 2.0  // Larger

// Check if sprite loaded
console.log(this.textures.exists('my_npc_idle'));
```

## Next Steps

Want to do more?

**Read the full documentation:**
- `NPC_SYSTEM.md` - Complete system documentation
- `NPC_USAGE_EXAMPLE.md` - 10 practical examples
- `HOVER_ANIMATION_VISUAL.md` - Visual animation guide

**Advanced features:**
- Create multiple NPCs programmatically
- Use hover animation for other grids
- Add custom click handlers
- Create quest systems
- Build NPC-based shops

## Support

If you need help:
1. Check the console for error messages
2. Verify all files are in correct locations
3. Review the documentation files
4. Test with the included sample NPCs first

## Summary

You've successfully added an NPC system to your game! It's:
- 🚀 **Fast to use** - 5 minutes to add a new NPC
- 📝 **Well documented** - Comprehensive guides included
- 🎨 **Customizable** - Change position, scale, colors, animations
- 🔧 **Developer friendly** - Clean API, type-safe, maintainable

Happy game development! 🎮

