# Hover Animation Visual Guide

## Overview

The hover animation creates a 3x3 grid (48x48 pixels total) with corner brackets that pulse in and out.

## Visual Layout

```
Grid Layout (3x3 cells, 16px each):

┌────────┬────────┬────────┐
│  NW    │  N     │  NE    │  ← Top row (16px height)
│  (L)   │        │  (⌐)   │
├────────┼────────┼────────┤
│  W     │ CENTER │  E     │  ← Middle row (16px height)
│        │  NPC   │        │
├────────┼────────┼────────┤
│  SW    │  S     │  SE    │  ← Bottom row (16px height)
│  (⌞)   │        │  (⌟)   │
└────────┴────────┴────────┘
```

## Corner Positions

### Relative to NPC Center:

```
     (-128, -128)                    (+128, -128)
         ⌜                                ⌐
         
         
                    (0, 0)
                     NPC
         
         
         ⌞                                ⌟
     (-128, +128)                    (+128, +128)
```

### In Grid Coordinates:

If NPC is at position (x, y):
- Top-Left Corner: (x-1, y-1)
- Top-Right Corner: (x+1, y-1)
- Bottom-Left Corner: (x-1, y+1)
- Bottom-Right Corner: (x+1, y+1)

## Animation Frames

### Frame 0 (Small)
```
L-shaped bracket: 8px x 8px

┐
│  ← 8px
└──
  ↑
 8px
```

### Frame 1 (Large)
```
L-shaped bracket: 10px x 10px

┐
│  ← 10px
│
└──
  ↑
 10px
```

## Animation Cycle

```
Time:    0ms     500ms    1000ms   1500ms   2000ms
Frame:   [0] ──→ [1]  ──→  [0]  ──→ [1]  ──→ [0]
Size:   small    large    small    large    small
         │         │         │         │         │
         └─────────┴─────────┴─────────┴─────────┘
                    Repeats infinitely
```

## Corner Rotations

Each corner is rotated to face outward:

```
Rotation angles (in radians):

     0° (0)                    90° (π/2)
       ⌜─                          ─⌐
       │                             │
       
       
       │                             │
      ─⌞                           ⌟─
    -90° (-π/2)               180° (π)
```

## Full Visual Example

### NPC at Position (10, 10)

```
World Space (pixels):

         1152                   1280                   1408
          │                      │                      │
    ──────┼──────────────────────┼──────────────────────┼──────
   1152 ──┤  ⌜                   │                   ⌐  │
          │                      │                      │
          │                      │                      │
   1280 ──┤                    [NPC]                    │
          │                   Manu/Other                │
          │                      │                      │
   1408 ──┤  ⌞                   │                   ⌟  │
    ──────┴──────────────────────┴──────────────────────┴──────
          
    Grid cells at (9,9), (10,9), (11,9)
                   (9,10), (10,10), (11,10)
                   (9,11), (10,11), (11,11)
```

## Color Options

### Default (White)
```
Color: 0xffffff
Result: White corners

  ⌜────⌐
  │ NPC │
  ⌞────⌟
```

### Custom Colors

```typescript
// Green highlight
tintColor: 0x00ff00

// Blue highlight
tintColor: 0x0080ff

// Yellow highlight
tintColor: 0xffff00

// Red warning
tintColor: 0xff0000
```

### Color Examples:

```
Green (0x00ff00):        Yellow (0xffff00):      Red (0xff0000):
  ⌜────⌐                   ⌜────⌐                  ⌜────⌐
  │ NPC │ Special          │ NPC │ Quest           │ NPC │ Danger
  ⌞────⌟                   ⌞────⌟                  ⌞────⌟
```

## Usage Variations

### 1. Standard NPC (White, 1.5 scale)
```
Scale: 1.5
Color: White
Speed: 1000ms

  ⌜────⌐
  │ NPC │
  ⌞────⌟
```

### 2. Quest NPC (Yellow, 1.8 scale)
```
Scale: 1.8
Color: Yellow
Speed: 800ms (faster)

   ⌜─────⌐
   │ NPC  │  ← Slightly larger
   ⌞─────⌟
```

### 3. Special Grid (Green, 1.0 scale)
```
Scale: 1.0
Color: Green
Speed: 1200ms (slower)

 ⌜───⌐
 │▓▓▓│  ← Special tile
 ⌞───⌟
```

## Technical Details

### Sprite Creation

```typescript
// Corner bracket shape
graphics.lineStyle(2, 0xffffff, 1);
graphics.beginPath();
graphics.moveTo(0, 8);    // Bottom of vertical line
graphics.lineTo(0, 0);    // Top corner
graphics.lineTo(8, 0);    // End of horizontal line
graphics.strokePath();
```

### Positioning Math

```typescript
// Center position
const centerX = position.x * gridSize + gridSize / 2;
const centerY = position.y * gridSize + gridSize / 2;

// Corner offsets
const topLeft     = { x: centerX - gridSize, y: centerY - gridSize };
const topRight    = { x: centerX + gridSize, y: centerY - gridSize };
const bottomRight = { x: centerX + gridSize, y: centerY + gridSize };
const bottomLeft  = { x: centerX - gridSize, y: centerY + gridSize };
```

## Depth Layers

```
Layer Stack (from back to front):

┌────────────────────────────────┐
│                                │  Depth 3000: UI Elements
├────────────────────────────────┤
│      ⌜────⌐                    │  Depth 2000: Hover Corners
├────────────────────────────────┤
│      │ NPC │                   │  Depth 1000: NPCs / Entities
├────────────────────────────────┤
│                                │  Depth 10:   Wheat / Crops
├────────────────────────────────┤
│                                │  Depth 1:    Grid Objects
├────────────────────────────────┤
│  [Background Tiles]            │  Depth -10:  Ground
└────────────────────────────────┘
```

## Responsive Scaling

```
Grid Size: 128px (default)

Small Grid (64px):
  ⌜─⌐
  │N│
  ⌞─⌟

Normal Grid (128px):
  ⌜───⌐
  │NPC│
  ⌞───⌟

Large Grid (256px):
   ⌜──────⌐
   │ NPC  │
   ⌞──────⌟
```

## Animation States

### State 1: Idle (Frame 0)
```
t=0.0s
  ⌜─⌐     Small brackets
  │N│     Close to NPC
  ⌞─⌟
```

### State 2: Expanding (Frame 0→1)
```
t=0.5s
  ⌜──⌐    Brackets growing
  │ N │   Moving outward
  ⌞──⌟
```

### State 3: Expanded (Frame 1)
```
t=1.0s
  ⌜───⌐   Large brackets
  │ N  │  Far from NPC
  ⌞───⌟
```

### State 4: Contracting (Frame 1→0)
```
t=1.5s
  ⌜──⌐    Brackets shrinking
  │ N │   Moving inward
  ⌞──⌟
```

## Combining Multiple Animations

### Multiple NPCs
```
  ⌜─⌐          ⌜─⌐          ⌜─⌐
  │A│          │B│          │C│
  ⌞─⌟          ⌞─⌟          ⌞─⌟
  
Each NPC has independent animation timing
```

### Different Colors
```
  ⌜─⌐ White    ⌜─⌐ Yellow   ⌜─⌐ Green
  │1│          │2│          │3│
  ⌞─⌟          ⌞─⌟          ⌞─⌟
  
Different NPCs can have different colors
```

## Best Practices

### ✅ Good Usage
```
Important NPCs:
  ⌜───⌐
  │Boss│  ← Show animation
  ⌞───⌟

Quest Givers:
  ⌜───⌐
  │ ! │  ← Show animation
  ⌞───⌟

Interactive Objects:
  ⌜───⌐
  │Chest│ ← Show animation
  ⌞───⌟
```

### ❌ Avoid
```
Every NPC:
  ⌜─⌐ ⌜─⌐ ⌜─⌐ ⌜─⌐ ⌜─⌐
  │1│ │2│ │3│ │4│ │5│  ← Too cluttered
  ⌞─⌟ ⌞─⌟ ⌞─⌟ ⌞─⌟ ⌞─⌟

Background NPCs should not have animations
```

## Performance Impact

### Single Animation
- 4 sprites (one per corner)
- 1 tween animation
- ~0.1ms update time

### 10 Animations
- 40 sprites
- 10 tween animations
- ~1ms update time

### 50 Animations (not recommended)
- 200 sprites
- 50 tween animations
- ~5ms update time

**Recommendation**: Limit to 10-15 simultaneous hover animations.

## Customization Example

```typescript
// Slow, subtle animation for ambient NPCs
new GridHoverAnimation(scene, {
  position: { x: 10, y: 10 },
  gridSize: 128,
  tintColor: 0x8888ff,      // Soft blue
  animationSpeed: 2000,      // 2 seconds (slower)
  scale: 1.2                 // Slightly smaller
});

// Fast, attention-grabbing for quest
new GridHoverAnimation(scene, {
  position: { x: 20, y: 20 },
  gridSize: 128,
  tintColor: 0xffff00,      // Bright yellow
  animationSpeed: 600,       // 0.6 seconds (faster)
  scale: 1.8                 // Larger
});
```

## Summary

The hover animation is:
- ✅ **Lightweight**: Only 4 sprites per animation
- ✅ **Smooth**: 60 FPS tween animation
- ✅ **Flexible**: Customizable colors, speed, scale
- ✅ **Reusable**: Works for NPCs, grids, any position
- ✅ **Clean**: Automatic cleanup and resource management

Use it to draw attention to important interactive elements in your game!

