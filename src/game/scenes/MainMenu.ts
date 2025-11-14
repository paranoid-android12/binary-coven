import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';



export class MainMenu extends Scene
{
    background: GameObjects.Sprite;
    mainTitle: GameObjects.Image;
    mainButton: GameObjects.Sprite;
    startText: GameObjects.Text;
    overlay: GameObjects.Rectangle;
    constructor ()
    {
        super('MainMenu');
    }

    preload() {
        // Load animated background frames
        for (let i = 0; i <= 7; i++) {
            this.load.image(`background_frame_${i}`, `/assets/f${i}.png`);
        }

        this.load.image("mainTitle", "/title.png");
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
        const { width, height } = this.scale;

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

        // Create animated background sprite
        this.background = this.add.sprite(width / 2, height / 2, 'background_frame_0');
        this.background.play('background_animation');

        // Create a black overlay in front of background at 20% opacity
        this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        this.overlay.setDepth(100);

        this.mainTitle = this.add.image(width / 2, (height / 2) - 170, "mainTitle").setScale(0.7);

        this.mainButton = this.add.sprite(width / 2, (height / 2 + 190), "mainButton", "startButtonUp").setScale(8);
        this.mainButton.setInteractive();
        
        // Add "Start" text in the middle of the button
        const startTextY = (height / 2 + 185);
        this.startText = this.add.text(width / 2, startTextY, "Start", {
            fontSize: '60px',
            color: '#1e0818',
            fontFamily: 'BoldPixels',
            fontStyle: 'bold'
        });
        this.startText.setOrigin(0.5, 0.5);
        
        this.mainButton.on("pointerdown", () => {
            this.mainButton.setFrame("startButtonDown");
            // Move text down by 20px when button is pressed
            this.startText.setY(startTextY + 10);
        });
        this.mainButton.on("pointerup", () => {
            // When pressed down, wait to be pressed up to change frame
            this.mainButton.setFrame("startButtonUp");
            // Move text back to original position
            this.startText.setY(startTextY);

            // Check if user is authenticated by emitting event to show login modal
            // The React side will check authentication and show modal if needed
            EventBus.emit('show-login-modal');
        });

        // Listen for successful login to start the game
        EventBus.on('login-success', () => {
            this.scene.start('ProgrammingGame');
        });

        // All buttons and title should be higher than overlay
        this.mainTitle.setDepth(101);
        this.mainButton.setDepth(101);
        this.startText.setDepth(102);

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {

        this.scene.start('Game');
    }
}
