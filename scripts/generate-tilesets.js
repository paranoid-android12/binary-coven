const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

const TILESETS_DIR = path.join(__dirname, '../public/tilesets');
const PRELOADER_PATH = path.join(__dirname, '../src/game/scenes/Preloader.ts');
const TILESET_CONFIG_PATH = path.join(__dirname, '../src/config/tilesets.json');

function generateTilesetConfig() {
  console.log('🔍 Scanning for tilesets in /public/tilesets/...');

  if (!fs.existsSync(TILESETS_DIR)) {
    console.warn('⚠️  /public/tilesets/ directory not found. Creating it...');
    fs.mkdirSync(TILESETS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(TILESETS_DIR);
  const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

  console.log(`📦 Found ${pngFiles.length} spritesheet(s): ${pngFiles.join(', ')}`);

  const tilesets = [];

  for (const filename of pngFiles) {
    const filepath = path.join(TILESETS_DIR, filename);
    const key = filename.replace(/\.png$/i, '').replace(/\s+/g, '_');

    try {
      // Get image dimensions
      const dimensions = sizeOf(filepath);
      const width = dimensions.width;
      const height = dimensions.height;

      const TILE_SIZE = 16;
      const columns = Math.floor(width / TILE_SIZE);
      const rows = Math.floor(height / TILE_SIZE);

      tilesets.push({
        key,
        name: filename.replace(/\.png$/i, ''),
        filename,
        path: `tilesets/${filename}`,
        tileSize: TILE_SIZE,
        columns,
        rows,
        width,
        height
      });

      console.log(`  ✓ ${filename} → ${columns}x${rows} tiles (${width}x${height}px)`);
    } catch (error) {
      console.error(`  ✗ Failed to load ${filename}:`, error.message);
    }
  }

  // Save tileset configuration
  fs.writeFileSync(
    TILESET_CONFIG_PATH,
    JSON.stringify(tilesets, null, 2),
    'utf8'
  );
  console.log(`\n💾 Saved tileset config to src/config/tilesets.json`);

  // Update Preloader.ts
  updatePreloader(tilesets);

  return tilesets;
}

function updatePreloader(tilesets) {
  console.log('\n📝 Updating Preloader.ts...');

  let preloaderContent = fs.readFileSync(PRELOADER_PATH, 'utf8');

  // Generate spritesheet loading code
  const spritesheetLoads = tilesets.map(tileset => {
    return `    this.load.spritesheet('${tileset.key}', '${tileset.path}', {\n      frameWidth: ${tileset.tileSize},\n      frameHeight: ${tileset.tileSize}\n    });`;
  }).join('\n');

  // Find and replace the tileset loading section
  const startMarker = '// AUTO-GENERATED TILESETS START';
  const endMarker = '// AUTO-GENERATED TILESETS END';

  if (preloaderContent.includes(startMarker) && preloaderContent.includes(endMarker)) {
    // Replace existing auto-generated section
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g');
    preloaderContent = preloaderContent.replace(
      regex,
      `${startMarker}\n${spritesheetLoads}\n    ${endMarker}`
    );
  } else {
    // Find the spritesheet section and add markers
    const spritesheetRegex = /this\.load\.spritesheet\('Ground_Tileset'[\s\S]*?\}\);/;

    if (spritesheetRegex.test(preloaderContent)) {
      preloaderContent = preloaderContent.replace(
        spritesheetRegex,
        `${startMarker}\n${spritesheetLoads}\n    ${endMarker}`
      );
    } else {
      console.warn('⚠️  Could not find spritesheet loading section in Preloader.ts');
      console.log('Please manually add the following code to your preload() method:');
      console.log(`\n${startMarker}\n${spritesheetLoads}\n${endMarker}\n`);
      return;
    }
  }

  fs.writeFileSync(PRELOADER_PATH, preloaderContent, 'utf8');
  console.log('  ✓ Preloader.ts updated successfully');
}

// Run the generator
try {
  const tilesets = generateTilesetConfig();
  console.log(`\n✅ Done! ${tilesets.length} tileset(s) configured.`);
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
