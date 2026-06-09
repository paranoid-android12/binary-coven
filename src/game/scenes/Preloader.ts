import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        // Themed, responsive loading screen. Everything is laid out from the
        // live canvas size (the game runs in Scale.RESIZE / full window), so it
        // stays centred on any display — the old template used hardcoded
        // (512, 384) coordinates, which is why the bar was off-centre.

        // Warm, dark farm-toned gradient backdrop covering the whole viewport.
        const bgGfx = this.add.graphics();
        const drawBg = (w: number, h: number) => {
            bgGfx.clear();
            bgGfx.fillGradientStyle(0x2a1d10, 0x2a1d10, 0x130d07, 0x130d07, 1);
            bgGfx.fillRect(0, 0, w, h);
        };

        // Wood "BINARY COVEN" logo (crisp pixel scaling).
        let title: Phaser.GameObjects.Image | null = null;
        if (this.textures.exists('gameTitle')) {
            this.textures.get('gameTitle').setFilter(Phaser.Textures.FilterMode.NEAREST);
            title = this.add.image(0, 0, 'gameTitle').setOrigin(0.5);
        }

        const subtitle = this.add.text(0, 0, 'Learn to code · grow your farm', {
            fontFamily: 'BoldPixels', fontSize: '22px', color: '#d8c39a',
        }).setOrigin(0.5);
        subtitle.setShadow(0, 2, '#000000', 2, false, true);

        // Progress bar (rounded track + gold fill) drawn via Graphics so it can
        // re-render on each progress tick and on resize.
        const trackGfx = this.add.graphics();
        const fillGfx = this.add.graphics();

        const label = this.add.text(0, 0, 'Loading… 0%', {
            fontFamily: 'BoldPixels', fontSize: '18px', color: '#f0e6cf',
        }).setOrigin(0.5);
        label.setShadow(0, 2, '#000000', 2, false, true);

        // Decorative pixel wheat flanking the bar.
        const hasWheat = this.textures.exists('wheatIcon');
        if (hasWheat) this.textures.get('wheatIcon').setFilter(Phaser.Textures.FilterMode.NEAREST);
        const wheatL = hasWheat ? this.add.image(0, 0, 'wheatIcon').setOrigin(0.5).setAlpha(0.9) : null;
        const wheatR = hasWheat ? this.add.image(0, 0, 'wheatIcon').setOrigin(0.5).setAlpha(0.9).setFlipX(true) : null;

        let progress = 0;
        const geo = { x: 0, y: 0, w: 0, h: 22 };

        const drawFill = () => {
            fillGfx.clear();
            const pad = 4;
            const maxW = geo.w - pad * 2;
            const fw = Math.max(0, maxW * progress);
            if (fw <= 0) return;
            fillGfx.fillStyle(0xf5a623, 1);
            fillGfx.fillRoundedRect(geo.x + pad, geo.y + pad, fw, geo.h - pad * 2, (geo.h - pad * 2) / 2);
        };

        const layout = (w: number, h: number) => {
            if (!w || !h) return;
            const cx = w / 2;
            drawBg(w, h);

            if (title) {
                const tw = Math.min(w * 0.5, 560);
                title.setScale(tw / title.width).setPosition(cx, h * 0.40);
                subtitle.setPosition(cx, title.y + title.displayHeight * 0.5 + 26);
            } else {
                subtitle.setPosition(cx, h * 0.42);
            }

            const barW = Math.min(w * 0.5, 460);
            geo.x = cx - barW / 2;
            geo.y = h * 0.66;
            geo.w = barW;
            geo.h = 22;

            trackGfx.clear();
            trackGfx.fillStyle(0x000000, 0.45);
            trackGfx.fillRoundedRect(geo.x, geo.y, geo.w, geo.h, geo.h / 2);
            trackGfx.lineStyle(2, 0x6b5836, 1);
            trackGfx.strokeRoundedRect(geo.x, geo.y, geo.w, geo.h, geo.h / 2);
            drawFill();

            label.setPosition(cx, geo.y + geo.h + 22);

            const wy = geo.y + geo.h / 2;
            if (wheatL) wheatL.setScale(2).setPosition(geo.x - 34, wy);
            if (wheatR) wheatR.setScale(2).setPosition(geo.x + geo.w + 34, wy);
        };

        // Register progress BEFORE preload() begins loading.
        this.load.on('progress', (value: number) => {
            progress = value;
            drawFill();
            label.setText(`Loading… ${Math.round(value * 100)}%`);
        });
        this.load.on('complete', () => {
            progress = 1;
            drawFill();
            label.setText('Ready!');
        });

        // Initial layout + reflow on resize, cleaned up when the scene ends.
        layout(this.scale.width, this.scale.height);
        const onResize = (size: Phaser.Structs.Size) => layout(size.width, size.height);
        this.scale.on('resize', onResize);
        this.events.once('shutdown', () => this.scale.off('resize', onResize));

        // BoldPixels is a CSS @font-face and may not be ready on first paint;
        // re-stamp the text once it loads so it renders in the pixel font.
        const doc: any = typeof document !== 'undefined' ? document : null;
        if (doc?.fonts?.ready) {
            doc.fonts.ready.then(() => {
                subtitle.setText(subtitle.text);
                label.setText(label.text);
            }).catch(() => {});
        }
    }

    preload ()
    {
        // Set texture filtering for pixel-perfect rendering BEFORE loading
        this.load.on('filecomplete', (key: string) => {
            if (['qubit_walk', 'qubit_idle', 'qubit_planting', 'manu_idle', 'drone_idle', 'wheat_growth', 'extras', 'Ground_Tileset', 'Fence_Wood', 'Well'].includes(key)) {
                const texture = this.textures.get(key);
                texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                if (key === 'drone_idle') {
                    console.log(`[DRONE-INIT] ✓ Texture loaded: ${key}`, {
                        exists: this.textures.exists(key),
                        frames: texture.getFrameNames(),
                        frameCount: texture.getFrameNames().length
                    });
                }
            }
        });

        //  Load the assets for the game
        this.load.setPath('assets');
        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');

        // =====================================================================
        // LOAD GAME SPRITESHEETS FROM PUBLIC ROOT
        // =====================================================================
        // These files are in public/ not public/assets/, so we need to reset path
        // Using setPath() with base URL to ensure correct loading
        this.load.setPath('/');

        // Load background music
        this.load.audio('bgm', 'bgm.mp3');

        this.load.spritesheet('manu_idle', 'Manu_Idle.png', {
            frameWidth: 32,
            frameHeight: 32
        });


        
        // Load the walking spritesheet for qubit
        this.load.spritesheet('qubit_walk', 'Walk.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load the idle spritesheet for qubit
        this.load.spritesheet('qubit_idle', 'Idle.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load the planting spritesheet for qubit
        this.load.spritesheet('qubit_planting', 'Hoe.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.spritesheet('drone_idle', 'drone_idle.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // AUTO-GENERATED TILESETS START
    this.load.spritesheet('Box', 'tilesets/Box.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('Exterior', 'tilesets/Exterior.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('Fence_Wood', 'tilesets/Fence Wood.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('Ground_Tileset', 'tilesets/Ground_Tileset.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('wood_moss', 'tilesets/wood moss.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    // AUTO-GENERATED TILESETS END

        // Load the Well spritesheet
        this.load.spritesheet('Well', 'Well.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        // Load wheat growth sprites (6 phases in the last row, 16x16 each)
        this.load.spritesheet('wheat_growth', 'summer_crops.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        // Load Extras spritesheet for hover animations (16x16 frames)
        this.load.spritesheet('extras', 'Extras.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        // =====================================================================
        // LOAD NPC DIALOGUE PORTRAITS
        // =====================================================================
        // Load NPC portrait sprites from assets folder (used in dialogue system)
        this.load.setPath('/assets');

        // Load Manu dialogue portraits (for dialogue system only, not world sprites)
        this.load.image('manu_portrait', 'manu.png');
        this.load.image('manu_speaking', 'manu-speaking.png');
        this.load.image('manu_pleased', 'manu-pleased.png');
        this.load.image('manu_angry', 'manu-angry.png');
        this.load.image('manu_defeated', 'manu-defeated.png');
        
        // Load Qubit NPC sprites (can be used as NPC too)
        this.load.image('qubit_npc', 'qubit-speaking.png');
        this.load.image('qubit_pleased', 'qubit-pleased.png');
        this.load.image('qubit_angry', 'qubit-angry.png');
        this.load.image('qubit_defeated', 'qubit-defeated.png');
    }

    create ()
    {
        this.createQubitAnimations();

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }

    /**
     * Create all Qubit character animations
     * These animations will be available globally across all scenes
     */
    private createQubitAnimations()
    {
        // Check if the spritesheets loaded successfully
        if (!this.textures.exists('qubit_walk')) {
            console.warn('[PRELOADER] qubit_walk texture not found. Walk animations will not be created.');
            return;
        }
        
        if (!this.textures.exists('qubit_idle')) {
            console.warn('[PRELOADER] qubit_idle texture not found. Idle animations will not be created.');
            return;
        }

        if (!this.textures.exists('qubit_planting')) {
            console.warn('[PRELOADER] qubit_planting texture not found. Planting animations will not be created.');
            return;
        }

        if (!this.textures.exists('manu_idle')) {
            console.warn('[PRELOADER] manu_idle texture not found. Manu animations will not be created.');
            return;
        }

        if (!this.textures.exists('drone_idle')) {
            console.warn('[PRELOADER] ✗ drone_idle texture not found. Drone animations will not be created.');
            return;
        }
        // =====================================================================
        // IDLE ANIMATIONS
        // =====================================================================
        
        // Idle down (first row of idle sheet)
        this.anims.create({
            key: 'qubit_idle_down',
            frames: this.anims.generateFrameNumbers('qubit_idle', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });
        
        // Idle up (second row of idle sheet)
        this.anims.create({
            key: 'qubit_idle_up',
            frames: this.anims.generateFrameNumbers('qubit_idle', { start: 4, end: 7 }),
            frameRate: 4,
            repeat: -1
        });
        
        // Idle right (third row of idle sheet)
        this.anims.create({
            key: 'qubit_idle_right',
            frames: this.anims.generateFrameNumbers('qubit_idle', { start: 8, end: 11 }),
            frameRate: 4,
            repeat: -1
        });
        
        // Idle left (third row of idle sheet, flipped)
        this.anims.create({
            key: 'qubit_idle_left',
            frames: this.anims.generateFrameNumbers('qubit_idle', { start: 8, end: 11 }),
            frameRate: 4,
            repeat: -1
        });
        
        // Default idle animation (down facing)
        this.anims.create({
            key: 'qubit_idle',
            frames: this.anims.generateFrameNumbers('qubit_idle', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });

        // =====================================================================
        // DRONE ANIMATIONS
        // =====================================================================
        
        // Drone idle animation
        const droneTexture = this.textures.get('drone_idle');
        const droneFrameCount = droneTexture.getFrameNames().length;
        console.log(`[DRONE-INIT] ✓ Creating animation with ${droneFrameCount} frames:`, droneTexture.getFrameNames());
        
        this.anims.create({
            key: 'drone_idle',
            frames: this.anims.generateFrameNumbers('drone_idle', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });
        
        console.log('[DRONE-INIT] ✓ Animation created:', {
            key: 'drone_idle',
            exists: this.anims.exists('drone_idle'),
            frameCount: droneFrameCount
        });
        
        // =====================================================================
        // WALKING ANIMATIONS
        // =====================================================================
        
        // Walking down (first row of walk sheet)
        this.anims.create({
            key: 'qubit_walk_down',
            frames: this.anims.generateFrameNumbers('qubit_walk', { start: 0, end: 5 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Walking up (second row of walk sheet)
        this.anims.create({
            key: 'qubit_walk_up',
            frames: this.anims.generateFrameNumbers('qubit_walk', { start: 6, end: 11 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Walking right (third row of walk sheet)
        this.anims.create({
            key: 'qubit_walk_right',
            frames: this.anims.generateFrameNumbers('qubit_walk', { start: 12, end: 17 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Walking left (third row of walk sheet, flipped)
        this.anims.create({
            key: 'qubit_walk_left',
            frames: this.anims.generateFrameNumbers('qubit_walk', { start: 12, end: 17 }),
            frameRate: 8,
            repeat: -1
        });
        
        // =====================================================================
        // ACTION ANIMATIONS
        // =====================================================================
        
        // Planting animation
        this.anims.create({
            key: 'qubit_planting',
            frames: this.anims.generateFrameNumbers('qubit_planting', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });

        // Manu idle animation
        this.anims.create({
            key: 'manu_idle',
            frames: this.anims.generateFrameNumbers('manu_idle', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });

        // Hover animation (simple loop like Manu)
        // Uses frames 0-3 from Extras.png for a perpetual corner animation
        if (this.textures.exists('extras')) {
            this.anims.create({
                key: 'hover_animation',
                frames: [
                    { key: 'extras', frame: 11 },
                    { key: 'extras', frame: 14 }
                ],
                frameRate: 2,
                repeat: -1
            });
        }
    }
}

