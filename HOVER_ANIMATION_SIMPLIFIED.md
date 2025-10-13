# Hover Animation Simplified Implementation

## Overview

The hover animation system has been completely simplified to match the Manu NPC implementation pattern. It now uses a simple, perpetual looped animation just like Manu's idle animation - no rotation, no complex mapping methods, no manual frame switching.

## What Changed

### ✅ Simplified Approach

**Before (Complex):**
- Manual texture generation with Graphics API
- Tween-based frame switching
- Complex rotation logic for each corner
- Custom frame mapping (frame0, frame1)
- Manual animation control with onUpdate callbacks

**After (Simple):**
- Uses Extras.png spritesheet (same as other sprites)
- Standard Phaser animation created in Preloader
- No rotation - just 4 sprites at corners
- Simple `sprite.play('hover_animation')` call
- Animation loops automatically (like Manu)

## Implementation Details

### 1. Preloader.ts - Animation Creation

```typescript
// Hover animation (simple loop like Manu)
// Uses frames 0-3 from Extras.png for a perpetual corner animation
if (this.textures.exists('extras')) {
    this.anims.create({
        key: 'hover_animation',
        frames: this.anims.generateFrameNumbers('extras', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
    });
    console.log('[PRELOADER] Hover animation created successfully');
}
```

**Pattern:** Exactly the same as Manu's idle animation
- Frames 0-3 from spritesheet
- 4 fps frame rate
- Infinite loop (`repeat: -1`)

### 2. GridHoverAnimation.ts - Simplified Class

**Removed:**
- ❌ `animationSpeed` parameter
- ❌ `frame0` and `frame1` parameters
- ❌ Rotation logic
- ❌ Manual texture generation
- ❌ Tween-based frame switching
- ❌ `createCornerFrameTexture()` method
- ❌ `startAnimation()` method with complex frame logic

**Kept:**
- ✅ `position` - Grid position
- ✅ `gridSize` - Grid cell size
- ✅ `scale` - Sprite scale
- ✅ `tintColor` - Color tint

**New Logic:**
```typescript
// Simple sprite creation at 4 corners
const cornerOffsets = [
  { x: -gridSize, y: -gridSize }, // Upper-left
  { x: gridSize, y: -gridSize },  // Upper-right
  { x: -gridSize, y: gridSize },  // Lower-left
  { x: gridSize, y: gridSize }    // Lower-right
];

// Create sprite and play animation (just like Manu)
const sprite = this.scene.add.sprite(x, y, 'extras');
sprite.play('hover_animation');
```

### 3. NPCManager.ts - Hover Trigger

**Changed:** Animation now only shows when NPC is hovered

```typescript
// Start hover animation when mouse enters
npc.sprite.on('pointerover', () => {
  const hoverAnimation = this.hoverAnimations.get(npc.id);
  if (hoverAnimation && !hoverAnimation.isAnimationActive()) {
    hoverAnimation.start();
  }
});

// Stop hover animation when mouse leaves
npc.sprite.on('pointerout', () => {
  const hoverAnimation = this.hoverAnimations.get(npc.id);
  if (hoverAnimation && hoverAnimation.isAnimationActive()) {
    hoverAnimation.stop();
  }
});
```

## Spritesheet Integration

### Extras.png Layout

The hover animation uses frames 0-3 from `Extras.png`:

```
Extras.png (64x16 pixels or 16x64 pixels)
┌─────┬─────┬─────┬─────┐
│  0  │  1  │  2  │  3  │  ← Hover animation frames
└─────┴─────┴─────┴─────┘
 16x16  16x16  16x16  16x16
```

**Animation Cycle:**
```
Time:    0ms     250ms    500ms    750ms    1000ms
Frame:   [0] ──→  [1]  ──→  [2]  ──→  [3]  ──→  [0]
         │                                        │
         └────────────── Loops infinitely ───────┘
```

## Corner Positioning

### Visual Layout

```
     Upper-Left          Upper-Right
         [0]                 [0]
         
              NPC (Manu)
              
     Lower-Left          Lower-Right
         [0]                 [0]
```

All 4 sprites play the same animation simultaneously.

### Position Calculation

```typescript
const centerX = position.x * gridSize + gridSize / 2;
const centerY = position.y * gridSize + gridSize / 2;

// Upper-left:  centerX - gridSize, centerY - gridSize
// Upper-right: centerX + gridSize, centerY - gridSize
// Lower-left:  centerX - gridSize, centerY + gridSize
// Lower-right: centerX + gridSize, centerY + gridSize
```

## Usage

### Creating Hover Animation (NPCManager handles this automatically)

```typescript
const hoverAnimation = new GridHoverAnimation(scene, {
  position: { x: 5, y: 5 },
  gridSize: 128,
  scale: 1.5,
  tintColor: 0xffffff
});

// Show animation
hoverAnimation.start();

// Hide animation
hoverAnimation.stop();
```

### Customization Options

```typescript
// White corners (default)
tintColor: 0xffffff

// Green corners
tintColor: 0x00ff00

// Yellow corners
tintColor: 0xffff00

// Larger sprites
scale: 2.0

// Smaller sprites
scale: 1.0
```

## Benefits of Simplified Approach

### ✅ Developer Experience
- **Easier to understand**: Same pattern as Manu's animation
- **Less code**: Removed ~100 lines of complex logic
- **More maintainable**: Standard Phaser animation workflow
- **Consistent**: Uses same loading/mapping as other sprites

### ✅ Performance
- **More efficient**: Phaser handles animation internally
- **Less overhead**: No manual tween management
- **Better optimization**: Phaser's optimized animation system

### ✅ Scalability
- **Easy to modify**: Change frames in Preloader
- **Reusable**: Same pattern for other animations
- **Configurable**: Simple parameters

## Configuration Comparison

### Before
```typescript
interface GridHoverAnimationConfig {
  position: Position;
  gridSize: number;
  scale?: number;
  tintColor?: number;
  animationSpeed?: number;  // REMOVED
  frame0?: number;          // REMOVED
  frame1?: number;          // REMOVED
}
```

### After
```typescript
interface GridHoverAnimationConfig {
  position: Position;
  gridSize: number;
  scale?: number;
  tintColor?: number;
}
```

## File Changes Summary

### Modified Files
1. **Preloader.ts**
   - Added `hover_animation` creation (frames 0-3, like Manu)
   
2. **GridHoverAnimation.ts**
   - Removed rotation logic
   - Removed manual frame switching
   - Removed tween animation
   - Removed texture generation
   - Simplified to just create 4 sprites and play animation
   
3. **NPCManager.ts**
   - Removed `frame0`, `frame1`, `animationSpeed` parameters
   - Added hover trigger (show on pointerover, hide on pointerout)

## Console Output

When working correctly, you should see:

```
[PRELOADER] Hover animation created successfully
[GridHoverAnimation] Created 4 corner sprites with hover animation
```

## Troubleshooting

### Hover Animation Not Showing

**Check:**
1. `Extras.png` exists in `/public/` folder
2. Spritesheet has frames 0-3
3. Console shows "Hover animation created successfully"
4. Mouse is over the NPC

### Animation Not Looping

**Check:**
1. `repeat: -1` in Preloader animation
2. Frames are valid (0-3 exist in Extras.png)
3. Frame rate is > 0 (currently 4 fps)

## Summary

The hover animation now follows the **exact same pattern** as Manu's idle animation:

| Feature | Manu Idle | Hover Animation |
|---------|-----------|-----------------|
| Spritesheet | `Manu_Idle.png` | `Extras.png` |
| Frames | 0-3 | 0-3 |
| Frame Rate | 4 fps | 4 fps |
| Animation Key | `manu_idle` | `hover_animation` |
| Loop | Yes (`repeat: -1`) | Yes (`repeat: -1`) |
| Rotation | No | No |
| Manual Control | No | No |
| Created In | Preloader | Preloader |

**Result:** Clean, simple, reusable, and consistent with the existing codebase architecture! 🎉

