import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  The Boot Scene loads only the assets shown on the loading screen.
        //  Boot has no preloader UI itself, so keep these small and fast.
        //  (The previous 'assets/bg.png' did not exist — its 404 left the bright
        //  blue background colour showing for the whole load.)
        this.load.image('gameTitle', '/title.png');       // wood "BINARY COVEN" logo (216KB)
        this.load.image('wheatIcon', '/assets/wheat.png'); // tiny pixel wheat sprite
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
