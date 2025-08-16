import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';



export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    mainButton: GameObjects.Sprite;
    optionsButton: GameObjects.Sprite;
    exitButton: GameObjects.Sprite;

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
            
        this.mainButton = this.add.sprite(width / 2, (height / 2 + 50), "mainButton", "startButtonUp").setScale(4);
        this.mainButton.setInteractive();
        this.mainButton.on("pointerdown", () => {
            this.mainButton.setFrame("startButtonDown");
        });
        this.mainButton.on("pointerup", () => {
            // When pressed down, wait to be pressed up to change frame
            this.mainButton.setFrame("startButtonUp");
            this.scene.start('ProgrammingGame');
        });

        this.optionsButton = this.add.sprite(width / 2, (height / 2) + 50 + 80, "mainButton", "startButtonUp").setScale(4);
        this.optionsButton.setInteractive();
        this.optionsButton.on("pointerdown", () => {
            this.optionsButton.setFrame("startButtonDown");
        });
        this.optionsButton.on("pointerup", () => {
            this.optionsButton.setFrame("startButtonUp");
        });

        this.exitButton = this.add.sprite(width / 2, (height / 2) + 50 +160, "mainButton", "startButtonUp").setScale(4);
        this.exitButton.setInteractive();
        this.exitButton.on("pointerdown", () => {
            this.exitButton.setFrame("startButtonDown");
        });
        this.exitButton.on("pointerup", () => {
            this.exitButton.setFrame("startButtonUp");
        });

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {

        this.scene.start('Game');
    }
}
