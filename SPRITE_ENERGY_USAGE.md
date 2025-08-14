# Sprite-Based Energy Display Usage Guide

## ✅ Refactored Features

The `SpriteEnergyDisplay` component has been refactored to be:
- **Static** (no dragging functionality)
- **Sprite-based** (uses your custom sprite images)
- **Configurable energy bar** (displays different lengths based on energy level)

## 🎯 How to Use Your Own Sprite

### 1. **Place Your Sprite File**
Put your energy panel sprite in the `public/assets/ui/` directory:
```
public/
  assets/
    ui/
      energy-panel.png  ← Your sprite file here
```

### 2. **Configure the Energy Bar**
The energy bar displays a specific section of your sprite with dynamic width based on energy level.

**Example Configuration:**
```typescript
<SpriteEnergyDisplay
  entity={activeEntity}
  position={{ x: 20, y: 20 }}
  backgroundSprite="/assets/ui/energy-panel.png"
  energyBarConfig={{
    x: 20,        // X position where energy bar starts on your sprite
    y: 50,        // Y position where energy bar starts on your sprite  
    maxWidth: 20, // Maximum width when full energy (e.g., 2x10 pixels)
    height: 2,    // Height of energy bar (e.g., 2 pixels)
    color: '#00ff00' // Color overlay for the energy bar
  }}
  scale={2}       // Scale factor (2x makes it twice as big)
/>
```

## 📐 Energy Bar Behavior

The energy bar works by drawing a colored rectangle over a specific area of your sprite:

- **Full Energy (100%)**: Displays the full `maxWidth` (e.g., 20 pixels wide)
- **Half Energy (50%)**: Displays half the `maxWidth` (e.g., 10 pixels wide)  
- **Low Energy (10%)**: Displays 10% of `maxWidth` (e.g., 2 pixels wide)
- **No Energy (0%)**: Displays nothing (0 pixels wide)

## 🎨 Example Sprite Layout

If your sprite is 64x32 pixels, you might layout:
```
┌─────────────────────────────────────────────────────────────┐
│  [Avatar]  Entity Name                                      │
│  [Icon ]   Entity Type                                      │
│                                                             │
│            ████████████████████████  ← Energy bar area     │
│                                        (x:20, y:50)        │
│            Inventory: [▓][▓][░][░][░]                       │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration Options

### `backgroundSprite` (optional)
- Path to your sprite image
- If not provided, uses a fallback design
- Example: `"/assets/ui/energy-panel.png"`

### `energyBarConfig` (optional)
- `x`: X coordinate on sprite where energy bar starts
- `y`: Y coordinate on sprite where energy bar starts  
- `maxWidth`: Maximum width when at full energy
- `height`: Height of the energy bar
- `color`: Color overlay for the energy bar (hex/rgb/etc)

### `scale` (optional, default: 1)
- Scale factor for the entire sprite
- `2` makes it twice as big, `0.5` makes it half size

### `position` (required)
- `x`, `y` coordinates where to place the UI on screen

## 🔧 Implementation Details

### How Energy Bar Drawing Works:
1. **Load your background sprite**
2. **Draw it to canvas at specified scale**
3. **Calculate energy width**: `maxWidth * (energy / maxEnergy)`
4. **Draw colored rectangle** over the energy bar area
5. **Apply pixel-perfect scaling** for crisp visuals

### File Locations:
- **Component**: `src/components/SpriteEnergyDisplay.tsx`
- **Usage**: `src/components/GameInterface.tsx` (lines 672-686)
- **Assets**: `public/assets/ui/` (your sprite files)

## 🎮 Example Usage Scenarios

### Retro Gaming Style:
```typescript
energyBarConfig={{
  x: 16, y: 24,
  maxWidth: 32, height: 4,
  color: '#00ff00'
}}
scale={3}
```

### Minimalist Style:
```typescript
energyBarConfig={{
  x: 10, y: 40,
  maxWidth: 16, height: 2,
  color: '#4a90e2'
}}
scale={1}
```

### Large Display Style:
```typescript
energyBarConfig={{
  x: 30, y: 60,
  maxWidth: 40, height: 6,
  color: '#ffaa00'
}}
scale={2}
```

The component will automatically update the energy bar width in real-time as the entity's energy changes during gameplay!
