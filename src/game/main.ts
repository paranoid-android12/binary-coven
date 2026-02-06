import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { ProgrammingGame } from './scenes/ProgrammingGame';

import { Types } from 'phaser';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: "100%",
    height: "100%",
    parent: 'game-container',
    pixelArt: true,
    backgroundColor: '#028af8',
    // Use window as keyboard target so the canvas doesn't need focus/tabIndex,
    // which prevents the browser from showing a blinking text caret on the canvas.
    input: {
        keyboard: {
            target: window
        }
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Game,
        GameOver,
        ProgrammingGame
    ]
};

const StartGame = (parent: string) => {

    return new Phaser.Game({ ...config, parent });

}

export default StartGame;
