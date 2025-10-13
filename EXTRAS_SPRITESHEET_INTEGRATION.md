# Extras Spritesheet Integration for Hover Animation

## Overview

The GridHoverAnimation system now uses your `Extras.png` spritesheet instead of manually drawing corner frames. This provides better visual consistency and allows you to use your custom corner bracket sprites.

## What Changed

### 1. **Preloader.ts** - Asset Loading
```typescript
// Load Extras spritesheet for hover animations (16x16 frames)
this.load.spritesheet('extras', 'Extras.png', {
    frameWidth: 16,
    frameHeight: 16
});
```

### 2. **GridHoverAnimation.ts** - Spritesheet Usage
- **Automatic Detection**: Checks if `extras` spritesheet exists
- **Fallback Support**: Falls back to manual drawing if spritesheet not found
- **Configurable Frames**: You can specify which frames to use
- **Debug Logging**: Console output shows what's happening

### 3. **New Configuration Options**
```typescript
interface GridHoverAnimationConfig {
  // ... existing options ...
  frame0?: number; // Frame index for first animation frame (default: 0)
  frame1?: number; // Frame index for second animation frame (default: 1)
}
```

## How It Works

### Frame Mapping
The system uses two frames from your Extras spritesheet:
- **Frame 0** (default): First animation state (smaller corner brackets)
- **Frame 1** (default): Second animation state (larger corner brackets)

### Animation Cycle
```
Time:    0ms     500ms    1000ms   1500ms   2000ms
Frame:   [0] ──→ [1]  ──→  [0]  ──→ [1]  ──→ [0]
         │                                        │
         └────────────── Loops ──────────────────┘
```

### Corner Positioning
The 4 corner sprites are positioned at the edges of a 3x3 grid:
```
⌜─────────⌐
│         │
│   NPC   │
│         │
⌞─────────⌟
```

Each corner is rotated to face outward:
- **Top-left**: 0° rotation
- **Top-right**: 90° rotation  
- **Bottom-right**: 180° rotation
- **Bottom-left**: -90° rotation

## Usage Examples

### Default Usage (Frames 0 and 1)
```typescript
const hoverAnim = new GridHoverAnimation(scene, {
  position: { x: 10, y: 10 },
  gridSize: 128,
  // Uses frames 0 and 1 by default
});
hoverAnim.start();
```

### Custom Frame Mapping
```typescript
const hoverAnim = new GridHoverAnimation(scene, {
  position: { x: 15, y: 15 },
  gridSize: 128,
  frame0: 5,  // Use frame 5 for first state
  frame1: 6,  // Use frame 6 for second state
  tintColor: 0x00ff00, // Green tint
  animationSpeed: 800  // Faster animation
});
hoverAnim.start();
```

### Different Colors for Different NPCs
```typescript
// Quest NPC - Yellow
const questHover = new GridHoverAnimation(scene, {
  position: { x: 20, y: 20 },
  gridSize: 128,
  tintColor: 0xffff00,
  frame0: 0,
  frame1: 1
});

// Special NPC - Blue  
const specialHover = new GridHoverAnimation(scene, {
  position: { x: 25, y: 25 },
  gridSize: 128,
  tintColor: 0x0080ff,
  frame0: 2,
  frame1: 3
});
```

## Console Output

When working correctly, you should see:

```
[PRELOADER] File loaded: extras
[PRELOADER] Applied NEAREST filter to: extras
[GridHoverAnimation] Checking for Extras spritesheet: true
[GridHoverAnimation] Using Extras spritesheet for hover animation
[GridHoverAnimation] Set initial frame 0 for corner sprite
[GridHoverAnimation] Set initial frame 0 for corner sprite
[GridHoverAnimation] Set initial frame 0 for corner sprite
[GridHoverAnimation] Set initial frame 0 for corner sprite
```

## Troubleshooting

### Extras Spritesheet Not Found
**Console Output:**
```
[GridHoverAnimation] Checking for Extras spritesheet: false
[GridHoverAnimation] Extras spritesheet not found, falling back to manual drawing
```

**Solutions:**
1. Verify `Extras.png` is in `/public/` folder
2. Check file name is exactly `Extras.png` (case-sensitive)
3. Ensure file isn't corrupted
4. Hard refresh browser to clear cache

### Wrong Frames Showing
**Problem**: Wrong corner bracket sprites appear
**Solution**: 
1. Check your Extras.png spritesheet layout
2. Identify correct frame numbers for corner brackets
3. Update `frame0` and `frame1` in config

### Animation Not Smooth
**Problem**: Choppy animation between frames
**Solution**:
1. Ensure frames 0 and 1 are consecutive corner bracket states
2. Check `animationSpeed` setting (default: 1000ms)
3. Verify spritesheet has proper frame dimensions (16x16)

## Frame Layout in Extras.png

Your Extras.png should have corner bracket sprites arranged like:

```
Extras.png (example layout)
┌─────┬─────┬─────┬─────┐
│Frame│Frame│Frame│Frame│
│  0  │  1  │  2  │  3  │
│(corner│(corner│     │     │
│small)│large)│     │     │
└─────┴─────┴─────┴─────┘
```

- **Frame 0**: Small corner bracket (first animation state)
- **Frame 1**: Large corner bracket (second animation state)
- **Frames 2+**: Other sprites (can be used with custom frame0/frame1)

## Customization Tips

### 1. **Different Corner Styles**
Use different frame pairs for different NPC types:
```typescript
// Standard NPCs
frame0: 0, frame1: 1

// Quest NPCs  
frame0: 2, frame1: 3

// Special NPCs
frame0: 4, frame1: 5
```

### 2. **Color Coding**
Combine frame selection with color tinting:
```typescript
// Green for friendly NPCs
tintColor: 0x00ff00, frame0: 0, frame1: 1

// Red for hostile NPCs
tintColor: 0xff0000, frame0: 2, frame1: 3

// Blue for quest NPCs
tintColor: 0x0080ff, frame0: 4, frame1: 5
```

### 3. **Animation Speed**
Adjust timing for different effects:
```typescript
// Subtle animation
animationSpeed: 2000  // 2 seconds

// Attention-grabbing
animationSpeed: 600   // 0.6 seconds

// Default
animationSpeed: 1000  // 1 second
```

## Migration from Manual Drawing

The system automatically detects if Extras.png is available:
- ✅ **Extras.png found**: Uses your spritesheet frames
- ❌ **Extras.png missing**: Falls back to manual drawing (old behavior)

This ensures backward compatibility while allowing you to use your custom sprites.

## Summary

✅ **Extras.png spritesheet integration complete**
✅ **Configurable frame mapping**  
✅ **Automatic fallback to manual drawing**
✅ **Debug logging for troubleshooting**
✅ **Backward compatibility maintained**

Your hover animations now use your custom corner bracket sprites from the Extras.png spritesheet!

