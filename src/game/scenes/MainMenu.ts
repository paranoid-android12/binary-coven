import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';



export class MainMenu extends Scene
{
    background: GameObjects.Sprite;
    mainTitle: GameObjects.Image;
    mainButton: GameObjects.Sprite;
    startText: GameObjects.Text;
    overlay: GameObjects.Rectangle;
    muteButton: GameObjects.Text;
    startTextBaseY: number = 0;
    constructor ()
    {
        super('MainMenu');
    }

    preload() {
        // Load animated background frames
        for (let i = 0; i <= 7; i++) {
            this.load.image(`background_frame_${i}`, `/assets/f${i}.png`);
        }

        this.load.image("mainTitle", "/assets/QUBIT.png");
        this.load.atlas("mainButton", "/button.png", {
            "frames": {
                "startButtonUp": {
                    "frame": {
                        "x": 0,
                        "y": 112,
                        "w": (16 * 3),
                        "h": 16
                    }
                },
                "startButtonDown": {
                    "frame": {
                        "x": 0,
                        "y": 128,
                        "w": (16 * 3),
                        "h": 16
                    }
                }
            }
        });
    }

    create ()
    {
        // Create animation for background
        this.anims.create({
            key: 'background_animation',
            frames: [
                { key: 'background_frame_0' },
                { key: 'background_frame_1' },
                { key: 'background_frame_2' },
                { key: 'background_frame_3' },
                { key: 'background_frame_4' },
                { key: 'background_frame_5' },
                { key: 'background_frame_6' },
                { key: 'background_frame_7' }
            ],
            frameRate: 8, // Adjust this to control animation speed
            repeat: -1 // Loop indefinitely
        });

        // Create animated background sprite (scaled to cover the screen in applyLayout)
        this.background = this.add.sprite(0, 0, 'background_frame_0');
        this.background.play('background_animation');

        // Black overlay dimming the animated background behind UI
        this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.8);
        this.overlay.setDepth(100);

        this.mainTitle = this.add.image(0, 0, "mainTitle");
        this.mainTitle.setDepth(101);

        this.mainButton = this.add.sprite(0, 0, "mainButton", "startButtonUp").setScale(8);
        this.mainButton.setInteractive();
        this.mainButton.setDepth(101);

        // Add "Start" text in the middle of the button
        this.startText = this.add.text(0, 0, "Start", {
            fontSize: '60px',
            color: '#1e0818',
            fontFamily: 'BoldPixels',
            fontStyle: 'bold'
        });
        this.startText.setOrigin(0.5, 0.5);
        this.startText.setDepth(102);

        this.mainButton.on("pointerdown", () => {
            this.mainButton.setFrame("startButtonDown");
            // Nudge text down while the button is pressed
            this.startText.setY(this.startTextBaseY + 10);
        });
        this.mainButton.on("pointerup", () => {
            // When pressed down, wait to be pressed up to change frame
            this.mainButton.setFrame("startButtonUp");
            // Move text back to original position
            this.startText.setY(this.startTextBaseY);

            // Check if user is authenticated by emitting event to show login modal
            // The React side will check authentication and show modal if needed
            EventBus.emit('show-login-modal');
        });

        // Listen for successful login to start the game
        EventBus.on('login-success', () => {
            this.scene.start('ProgrammingGame');
        });

        // Mute background music toggle (top-right corner)
        const isMutedInit = typeof window !== 'undefined' && localStorage.getItem('bgm-muted') === 'true';
        this.muteButton = this.add.text(0, 0, isMutedInit ? '♪ MUSIC: OFF' : '♪ MUSIC: ON', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'BoldPixels',
            fontStyle: 'bold'
        });
        this.muteButton.setOrigin(1, 0);
        this.muteButton.setDepth(102);
        this.muteButton.setInteractive({ useHandCursor: true });
        this.muteButton.on('pointerover', () => this.muteButton.setColor('#ffd700'));
        this.muteButton.on('pointerout', () => this.muteButton.setColor('#ffffff'));
        this.muteButton.on('pointerup', () => {
            const newMuted = !(localStorage.getItem('bgm-muted') === 'true');
            this.sound.getAll('bgm').forEach(s => { (s as any).mute = newMuted; });
            localStorage.setItem('bgm-muted', String(newMuted));
            this.muteButton.setText(newMuted ? '♪ MUSIC: OFF' : '♪ MUSIC: ON');
        });

        // Position everything for the current screen size, and reflow on resize
        this.applyLayout(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            this.applyLayout(gameSize.width, gameSize.height);
        });
        this.events.once('shutdown', () => this.scale.off('resize'));

        // Start background music (persists across scenes via global SoundManager)
        const existingBgm = this.sound.getAll('bgm');
        if (existingBgm.length === 0) {
            const bgm = this.sound.add('bgm', { loop: true, volume: 0.3 });
            const isMuted = typeof window !== 'undefined' && localStorage.getItem('bgm-muted') === 'true';
            bgm.mute = isMuted;
            if (this.sound.locked) {
                this.sound.once('unlocked', () => {
                    bgm.play();
                });
            } else {
                bgm.play();
            }
        } else {
            // Returning to menu — restore full volume
            existingBgm.forEach(s => { (s as any).volume = 0.15; });
        }

        EventBus.emit('current-scene-ready', this);
    }

    // Lay out all menu elements responsively for the given canvas size.
    applyLayout (width: number, height: number)
    {
        if (!width || !height) return;

        // Background: scale to cover the whole screen (like CSS background-size: cover)
        // so the island fills the view instead of floating in the water-blue backdrop.
        const cover = Math.max(width / this.background.width, height / this.background.height);
        this.background.setScale(cover).setPosition(width / 2, height / 2);

        // Dimming overlay covers the full canvas.
        this.overlay.setSize(width, height).setPosition(width / 2, height / 2);

        // Title: sized relative to the screen, capped so it never dominates large displays.
        const titleWidth = Math.min(width * 0.5, 620);
        this.mainTitle.setScale(titleWidth / this.mainTitle.width);
        this.mainTitle.setPosition(width / 2, height * 0.32);

        // Start button anchored in the lower third, with its label centred on it.
        this.mainButton.setPosition(width / 2, height * 0.7);
        this.startTextBaseY = this.mainButton.y - 5;
        this.startText.setPosition(width / 2, this.startTextBaseY);

        // Mute toggle in the top-right corner.
        this.muteButton.setPosition(width - 20, 20);
    }

    changeScene ()
    {

        this.scene.start('Game');
    }
}
