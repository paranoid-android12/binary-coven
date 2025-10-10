import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        // Set texture filtering for pixel-perfect rendering BEFORE loading
        this.load.on('filecomplete', (key: string) => {
            if (['qubit_walk', 'qubit_idle', 'qubit_planting', 'wheat_growth', 'Ground_Tileset', 'Fence_Wood', 'Well'].includes(key)) {
                const texture = this.textures.get(key);
                texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
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

        // Load the Ground_Tileset for map editor (16x16 tiles in a spritesheet)
        this.load.spritesheet('Ground_Tileset', 'Ground_Tileset.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        // Load the Fence_Wood tileset for map editor (16x16 tiles in a spritesheet)
        this.load.spritesheet('Fence_Wood', 'Fence Wood.png', {
            frameWidth: 16,
            frameHeight: 16
        });

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
        
        console.log('[PRELOADER] Spritesheets queued for loading from root (/)');
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        // =====================================================================
        // CREATE GLOBAL ANIMATIONS (ONE-TIME SETUP)
        // =====================================================================
        // Animations are created once here and are available across all scenes
        // This is the recommended Phaser best practice
        
        console.log('[PRELOADER] Starting animation creation...');
        console.log('[PRELOADER] Textures loaded:', Object.keys(this.textures.list));
        console.log('[PRELOADER] qubit_walk exists?', this.textures.exists('qubit_walk'));
        console.log('[PRELOADER] qubit_idle exists?', this.textures.exists('qubit_idle'));
        console.log('[PRELOADER] Ground_Tileset exists?', this.textures.exists('Ground_Tileset'));
        
        this.createQubitAnimations();
        
        console.log('[PRELOADER] All animations created globally');
        console.log('[PRELOADER] qubit_idle animation exists?', this.anims.exists('qubit_idle'));
        console.log('[PRELOADER] qubit_walk_down animation exists?', this.anims.exists('qubit_walk_down'));

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
        
        // Log frame information for debugging
        const walkTexture = this.textures.get('qubit_walk');
        const idleTexture = this.textures.get('qubit_idle');
        console.log('[PRELOADER] Qubit walk texture frames:', walkTexture.getFrameNames());
        console.log('[PRELOADER] Qubit idle texture frames:', idleTexture.getFrameNames());
        
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
        
        console.log('[PRELOADER] Qubit animations created successfully');
    }
}
