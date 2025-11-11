# Tilesets Directory

This directory contains all spritesheets used by the Map Editor.

## How to Add New Spritesheets

1. **Prepare your spritesheet:**
   - Must be a PNG file
   - Must use a 16x16 pixel grid for each tile
   - Can be any dimensions (as long as they're multiples of 16)

2. **Add to this folder:**
   - Simply drop your PNG file into `/public/tilesets/`
   - File name can contain spaces (e.g., "My Tileset.png")

3. **Run the app:**
   - When you start the dev server (`npm run dev`), the tileset will be automatically discovered
   - It will appear as a new tab in the Map Editor UI
   - You can immediately start drawing with it!

## How It Works

The build process automatically:
- Scans this folder for all PNG files
- Calculates dimensions (columns × rows based on 16x16 tiles)
- Generates `src/config/tilesets.json` with metadata
- Updates `src/game/scenes/Preloader.ts` to load the spritesheets
- Makes them available in the Map Editor

## Current Tilesets

- **Ground_Tileset.png** - 25×27 tiles (400×432px)
- **Fence Wood.png** - 12×14 tiles (192×224px)

## Manual Regeneration

If you add/remove tilesets and want to regenerate without restarting:

```bash
npm run generate:tilesets
```

## Technical Details

- Tileset key: Filename without extension, spaces replaced with underscores
- Path: `tilesets/[filename]`
- All tilesets use 16×16 frameWidth and frameHeight
- Config location: `src/config/tilesets.json`
