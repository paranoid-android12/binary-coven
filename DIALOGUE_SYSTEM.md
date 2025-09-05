# Dialogue System Documentation

## Overview

A modular dialogue system has been implemented in `GameInterface.tsx` that provides a complete overlay UI for displaying conversations and narrative content. The system follows the existing code patterns and integrates seamlessly with the game's EventBus communication system.

## Features

- **Overlay UI**: Dialogue box overlays the game screen with a semi-transparent background
- **Sprite Support**: Displays speaker sprites and customizable dialogue background
- **Interactive Navigation**: Any key press or mouse click advances dialogue
- **State Management**: Dialogue mode blocks all other game functionality
- **Automatic Completion**: System exits when dialogue sequence ends
- **Progress Indicators**: Shows current dialogue position and continuation prompts
- **Loading States**: Displays loading indicator while fetching dialogue data

## Usage

### Simple Function Call
```javascript
// Start a dialogue sequence
startDialogue('sample_dialogue.json');
```

### Via EventBus
```javascript
// Trigger dialogue from anywhere in the application
EventBus.emit('start-dialogue', 'sample_dialogue.json');
```

### Via Global Window Object
```javascript
// Direct access from browser console or any script
window.startDialogue('sample_dialogue.json');
```

## Data Structure

### JSON File Format
Place dialogue JSON files in the `public/` folder with the following structure:

```json
[
  {
    "name": "Speaker Name",
    "content": "Dialogue text content that can be quite long and will wrap appropriately in the UI.",
    "sprite": "speaker_image.png"
  },
  {
    "name": "Another Speaker",
    "content": "Another piece of dialogue content.",
    "sprite": "another_speaker.png"
  }
]
```

### Required Fields
- **name**: The speaker's name (displayed above the text)
- **content**: The dialogue text content
- **sprite**: Filename of the speaker's image (should be in `/assets/` folder)

## Asset Requirements

### Speaker Sprites
- Place speaker sprite images in `/public/assets/`
- Supported formats: PNG, JPG, GIF
- Recommended size: 80x80 pixels or larger
- Images are automatically scaled and positioned

### Dialogue Background
- Currently uses `/public/title.png` as the dialogue box background
- You can modify this in the `GameInterface.tsx` file by changing the `backgroundImage` URL
- Recommended to use a dialogue box sprite designed for text overlay

## Implementation Details

### State Management
The dialogue system uses React's `useState` hooks following the existing pattern in `GameInterface.tsx`:

```typescript
interface DialogueState {
  isActive: boolean;
  dialogues: DialogueEntry[];
  currentIndex: number;
  isLoading: boolean;
}
```

### Event Handling
- **Keyboard**: Any keydown event advances dialogue when active
- **Mouse**: Clicking on the dialogue container advances dialogue
- **Navigation**: Sequential progression through dialogue array
- **Completion**: Automatic closure when reaching the end

### Integration Points
1. **EventBus Events**:
   - `start-dialogue`: Trigger dialogue with filename parameter
   - `dialogue-system-ready`: Emitted when system is initialized

2. **Global Access**:
   - `window.startDialogue()`: Direct function access
   - Available from browser console for testing

3. **State Blocking**:
   - Dialogue overlay prevents interaction with game elements
   - High z-index ensures dialogue appears above all other UI

## Styling and Visual Design

### Layout
- **Position**: Fixed overlay covering entire viewport
- **Background**: Semi-transparent dark overlay (rgba(0, 0, 0, 0.3))
- **Dialogue Box**: Centered at bottom of screen, responsive width
- **Speaker Sprite**: Top-left of dialogue box (80x80px)
- **Text Area**: Right side with speaker name above content

### Typography
- **Font**: Monospace for retro/pixel aesthetic
- **Speaker Name**: 18px, bold, white with text shadow
- **Content**: 16px, white with text shadow, scrollable if needed
- **Indicators**: 12px and 14px for progress and continuation hints

### Animations
- **Pulse**: Continuation prompt has pulsing animation (1.5s cycle)
- **Slide In**: Error messages slide in from left (inherited from existing system)

## Testing

### Sample Dialogue
A sample dialogue file has been created at `/public/sample_dialogue.json` for testing. You can test the system by:

1. Opening the browser console
2. Running: `startDialogue('sample_dialogue.json')`
3. Using keyboard or mouse to advance through the dialogue

### Creating Custom Dialogues
1. Create a new JSON file in `/public/` folder
2. Add speaker sprite images to `/public/assets/`
3. Call `startDialogue('your_dialogue_file.json')`

## Error Handling

- **File Not Found**: Error logged to console, loading state cleared
- **Invalid JSON**: Error logged to console, system remains stable
- **Missing Sprites**: Dialogue continues without speaker image
- **Network Errors**: Graceful fallback with error logging

## Performance Considerations

- **Lazy Loading**: Dialogue content loaded only when requested
- **Memory Management**: Dialogue state cleared after completion
- **Event Cleanup**: All event listeners properly removed on unmount
- **Minimal Re-renders**: Optimized with React.useCallback for functions

## Future Enhancements

Potential improvements that could be added:
- **Typed Text Effect**: Character-by-character text reveal animation
- **Voice Acting**: Audio file support for dialogue lines
- **Choice Systems**: Branching dialogue with user choices
- **Emotion Sprites**: Multiple sprite states for speaker emotions
- **Dialogue History**: Ability to scroll back through previous lines
- **Custom Styling**: Per-dialogue custom styling and themes
