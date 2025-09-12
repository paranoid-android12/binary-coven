# Dialogue Camera System

The dialogue system now supports camera panning to guide the player's attention to specific locations during conversations.

## Features

- **Smooth Camera Panning**: The camera smoothly slides to specified coordinates instead of instantly jumping
- **Automatic Camera Management**: Temporarily unlocks camera from following the player, then re-locks it after panning
- **Optional Feature**: Camera panning is completely optional - dialogues without camera coordinates work as before

## Usage

### JSON Format

Add a `camera` object to any dialogue entry in your dialogue JSON files:

```json
{
  "name": "Tutorial Guide",
  "content": "Look at this area!",
  "sprite": "logo.png",
  "camera": {
    "x": 15,
    "y": 10
  }
}
```

### Camera Coordinates

- `x`: Grid X coordinate (0-based)
- `y`: Grid Y coordinate (0-based)
- The camera will pan to the center of the specified grid cell
- Panning duration is fixed at 1000ms (1 second) for smooth movement

### Example Dialogue

```json
[
  {
    "name": "Guide",
    "content": "Welcome to the game!",
    "sprite": "guide.png"
  },
  {
    "name": "Guide",
    "content": "Now look at this important area...",
    "sprite": "guide.png",
    "camera": {
      "x": 20,
      "y": 15
    }
  },
  {
    "name": "Guide",
    "content": "The camera will return to following you after this dialogue ends.",
    "sprite": "guide.png"
  }
]
```

## Technical Details

- Camera panning is handled in `ProgrammingGame.ts` with the `panCameraTo()` method
- The dialogue system in `GameInterface.tsx` automatically triggers camera panning when advancing to dialogues with camera coordinates
- Camera temporarily unlocks from following the player during panning, then re-locks after completion
- Uses Phaser's built-in `camera.pan()` method with smooth easing

## EventBus Integration

You can also trigger camera panning programmatically:

```javascript
EventBus.emit('pan-camera-to', { x: 10, y: 5, duration: 1500 });
```

This is useful for non-dialogue camera movements or custom tutorials.
