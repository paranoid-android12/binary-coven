import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';



export class MainMenu extends Scene
{
    background: GameObjects.Sprite;
    logo: GameObjects.Image;
    mainTitle: GameObjects.Image;
    mainButton: GameObjects.Sprite;
    optionsButton: GameObjects.Sprite;
    exitButton: GameObjects.Sprite;
    overlay: GameObjects.Rectangle;
    constructor ()
    {
        super('MainMenu');
    }

    preload() {
        const SCALE = 4
        // this.load.spritesheet("mainButton", "/button.png", {
        //     frameWidth: 16,
        //     frameHeight: 16
        // })

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

        this.mainButton = this.add.sprite(width / 2, (height / 2 + 90), "mainButton", "startButtonUp").setScale(4);
        this.mainButton.setInteractive();
        this.mainButton.on("pointerdown", () => {
            this.mainButton.setFrame("startButtonDown");
        });
        this.mainButton.on("pointerup", () => {
            // When pressed down, wait to be pressed up to change frame
            this.mainButton.setFrame("startButtonUp");
            this.scene.start('ProgrammingGame');
        });

        this.optionsButton = this.add.sprite(width / 2, (height / 2) + 90 + 80, "mainButton", "startButtonUp").setScale(4);
        this.optionsButton.setInteractive();
        this.optionsButton.on("pointerdown", () => {
            this.optionsButton.setFrame("startButtonDown");
        });
        this.optionsButton.on("pointerup", () => {
            this.optionsButton.setFrame("startButtonUp");
        });

        this.exitButton = this.add.sprite(width / 2, (height / 2) + 90 +160, "mainButton", "startButtonUp").setScale(4);
        this.exitButton.setInteractive();
        this.exitButton.on("pointerdown", () => {
            this.exitButton.setFrame("startButtonDown");
        });
        this.exitButton.on("pointerup", () => {
            this.exitButton.setFrame("startButtonUp");
        });

        // All buttons and title should be higher than overlay
        this.mainTitle.setDepth(101);
        this.mainButton.setDepth(101);
        this.optionsButton.setDepth(101);
        this.exitButton.setDepth(101);

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {

        this.scene.start('Game');
    }
}
