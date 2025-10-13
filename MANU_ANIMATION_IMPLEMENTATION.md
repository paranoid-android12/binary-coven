# Manu Idle Animation Implementation

## Summary

Manu's idle animation has been successfully implemented following the same pattern as Qubit's animations. Manu is now rendered as an NPC with a smooth 4-frame idle animation.

## What Was Changed

### 1. Preloader.ts - Asset Loading

**Spritesheet Loading:**
```typescript
// Load manu_idle spritesheet from root (32x32 frames)
this.load.spritesheet('manu_idle', 'Manu_Idle.png', {
    frameWidth: 32,
    frameHeight: 32
});
```

**Animation Creation:**
```typescript
// Manu idle animation (frames 0-3, 4 fps)
this.anims.create({
    key: 'manu_idle',
    frames: this.anims.generateFrameNumbers('manu_idle', { start: 0, end: 3 }),
    frameRate: 4,
    repeat: -1
});
```

**Asset Cleanup:**
- Renamed `manu_idle` static image to `manu_portrait` to distinguish between world sprite and dialogue portrait
- Dialogue portraits remain in `/assets/` folder
- World spritesheet is in root `/Manu_Idle.png`

### 2. NPCManager.ts - Animation System

**Enhanced Animation Detection:**
The NPCManager now tries multiple animation key patterns:

```typescript
// Try the spriteKey itself first (e.g., 'manu_idle')
if (this.scene.anims.exists(config.spriteKey)) {
    npc.sprite.play(config.spriteKey);
}
// Then try with '_idle' suffix (e.g., 'manu_idle_idle')
else {
    const idleAnimKey = `${config.spriteKey}_idle`;
    if (this.scene.anims.exists(idleAnimKey)) {
        npc.sprite.play(idleAnimKey);
    }
}
```

This matches Qubit's pattern where the animation key is the same as the texture key.

### 3. ProgrammingGame.ts - NPC Creation

**Sample NPC:**
```typescript
this.createNPC({
  id: 'npc_manu',
  name: 'Manu',
  position: { x: 5, y: 5 },
  spriteKey: 'manu_idle',  // Matches both texture and animation key
  dialogueFile: 'sample_dialogue.json',
  scale: 1.5,
  showHoverAnimation: true
});
```

## How It Works

### Animation Flow

1. **Preloader Stage:**
   - Loads `Manu_Idle.png` spritesheet (32x32 frames)
   - Creates `manu_idle` animation with frames 0-3
   - Animation loops infinitely at 4 fps

2. **NPC Creation Stage:**
   - NPCManager receives `spriteKey: 'manu_idle'`
   - Creates sprite using `manu_idle` texture
   - Checks if `manu_idle` animation exists
   - Plays the animation
   - Sprite continuously animates with 4-frame idle loop

3. **Runtime:**
   - Manu's sprite displays at scale 1.5x (same as Qubit)
   - Hover animation displays around her (optional)
   - Click triggers dialogue system
   - Animation continues indefinitely

## Comparison with Qubit

| Feature | Qubit | Manu |
|---------|-------|------|
| Sprite File | `Idle.png`, `Walk.png` | `Manu_Idle.png` |
| Frame Size | 32x32 | 32x32 |
| Idle Frames | 0-3 (per direction) | 0-3 |
| Frame Rate | 4 fps | 4 fps |
| Animation Key | `qubit_idle` | `manu_idle` |
| Texture Key | `qubit_idle` | `manu_idle` |
| Scale | 1.5x (QUBIT_SCALE_FACTOR) | 1.5x (configurable) |
| Movement | Yes (Entity) | No (Static NPC) |
| Depth | 1000 | 1000 |

## File Structure

```
binary-coven/
├── public/
│   ├── Manu_Idle.png              [NEW] Manu spritesheet
│   └── assets/
│       ├── manu.png                Dialogue portrait (renamed from manu_idle)
│       ├── manu-speaking.png       Dialogue portraits
│       ├── manu-pleased.png
│       ├── manu-angry.png
│       └── manu-defeated.png
└── src/
    └── game/
        ├── scenes/
        │   └── Preloader.ts        [MODIFIED] Load spritesheet, create animation
        └── systems/
            └── NPCManager.ts       [MODIFIED] Enhanced animation detection
```

## Technical Details

### Spritesheet Format

```
Manu_Idle.png (128x32 pixels)
┌────────┬────────┬────────┬────────┐
│ Frame 0│ Frame 1│ Frame 2│ Frame 3│
│  32x32 │  32x32 │  32x32 │  32x32 │
└────────┴────────┴────────┴────────┘
```

### Animation Cycle

```
Time:    0ms     250ms    500ms    750ms    1000ms
Frame:   [0] ──→  [1]  ──→  [2]  ──→  [3]  ──→  [0]
         │                                        │
         └────────────── Loops infinitely ───────┘
         
Frame Rate: 4 fps = 250ms per frame
Total Cycle: 1000ms (1 second)
```

### Rendering Pipeline

```
1. Preloader loads 'Manu_Idle.png'
   ↓
2. Creates 'manu_idle' texture with 4 frames
   ↓
3. Creates 'manu_idle' animation (frames 0-3)
   ↓
4. NPCManager creates sprite with 'manu_idle' texture
   ↓
5. NPCManager plays 'manu_idle' animation
   ↓
6. Sprite renders at (x*128 + 64, y*128 + 64)
   ↓
7. Animation updates automatically every 250ms
```

## Console Output

When working correctly, you should see:

```
[PRELOADER] manu_idle exists? true
[PRELOADER] manu_idle animation exists? true
[PRELOADER] Manu animations created successfully
[NPC-MANAGER] Playing animation: manu_idle
[NPC-MANAGER] Created NPC: Manu at (5, 5)
```

## Troubleshooting

### Manu Not Animating

**Check:**
1. `Manu_Idle.png` exists in `/public/` folder
2. Spritesheet dimensions are correct (32x32 frames)
3. Animation is created in Preloader
4. Console shows "Playing animation: manu_idle"

### Manu Appears Static

**Check:**
1. Animation key matches texture key (`manu_idle`)
2. Frames are 0-3 (not out of bounds)
3. Frame rate is > 0 (currently 4 fps)
4. `repeat: -1` for infinite loop

### Console Errors

**"Animation not found"**
- Check animation was created in Preloader
- Verify animation key is correct

**"Texture not found"**
- Verify `Manu_Idle.png` is in `/public/` folder
- Check file name capitalization

## Future Enhancements

### Add More Animations

```typescript
// In Preloader.ts
this.load.spritesheet('manu_walk', 'Manu_Walk.png', {
    frameWidth: 32,
    frameHeight: 32
});

this.anims.create({
    key: 'manu_walk_down',
    frames: this.anims.generateFrameNumbers('manu_walk', { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1
});
```

### State-Based Animations

```typescript
// Switch animations based on game state
if (isHappy) {
    npc.sprite.play('manu_idle_happy');
} else if (isAngry) {
    npc.sprite.play('manu_idle_angry');
}
```

## Summary

✅ **Manu now has a 4-frame idle animation**
✅ **Follows the same pattern as Qubit's implementation**
✅ **Animation loops continuously at 4 fps**
✅ **Properly scaled and rendered at 1.5x size**
✅ **NPCManager automatically detects and plays the animation**
✅ **No breaking changes to existing code**

Manu is now a fully animated NPC character!

