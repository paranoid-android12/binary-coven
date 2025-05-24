import { useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './game/scenes/MainMenu';

function App()
{
    // The sprite can only be moved in the MainMenu Scene
    const [canMoveSprite, setCanMoveSprite] = useState(true);

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [spritePosition, setSpritePosition] = useState({ x: 0, y: 0 });

  // Handle arrow key presses
  const handleArrowKey = (event: KeyboardEvent) => {
    // Check for arrow keys
    switch (event.key) {
      case 'ArrowUp':
        moveEntity('up');
        break;
      case 'ArrowDown':
        moveEntity('down');
        break;
      case 'ArrowLeft':
        moveEntity('left');
        break;
      case 'ArrowRight':
        moveEntity('right');
        break;
      default:
        // Ignore other keys
        return;
    }
  };

  // Specific functions for each arrow key
  const handleUpArrow = () => {
    console.log('Up arrow pressed');
    // Call the custom handler if provided
  };

  const handleDownArrow = () => {
    console.log('Down arrow pressed');
  };

  const handleLeftArrow = () => {
    console.log('Left arrow pressed');
  };

  const handleRightArrow = () => {
    console.log('Right arrow pressed');
  };

  useEffect(() => {
    // Only add event listeners on the client side
    if (typeof window !== 'undefined') {
      // Add event listener when component mounts
      window.addEventListener('keydown', handleArrowKey);
      
      // Cleanup function to remove listener when component unmounts
      return () => {
        window.removeEventListener('keydown', handleArrowKey);
      };
    }
  }, []); // Empty dependency array means this runs once on mount

    const changeScene = () => {

        if(phaserRef.current)
        {     
            const scene = phaserRef.current.scene as MainMenu;
            
            if (scene)
            {
                scene.changeScene();
            }
        }
    }

    const moveEntity = (direction: string) => {
        if(phaserRef.current)
            {
                let xInc = 0;
                let yInc = 0;

                switch (direction) {
                    case 'up':
                        yInc = -70;
                        break;
                    case 'down':
                        yInc = 70;
                        break;
                    case 'left':
                        xInc = -70;
                        break;
                    case 'right':
                        xInc = 70;
                        break;
                    default:
                        break;
                }
                const scene = phaserRef.current.scene as MainMenu;
    
                if (scene && scene.scene.key === 'MainMenu')
                {
                    setSpritePosition({ x: spritePosition.x + xInc, y: spritePosition.y + yInc });
                }
            }
    }

    const moveSprite = () => {

        if(phaserRef.current)
        {

            const scene = phaserRef.current.scene as MainMenu;

            if (scene && scene.scene.key === 'MainMenu')
            {
                // Get the update logo position
                scene.moveLogo(({ x, y }) => {

                    setSpritePosition({ x, y });

                });
            }
        }

    }

    const addSprite = () => {

        if (phaserRef.current)
        {
            const scene = phaserRef.current.scene;

            if (scene)
            {
                // Add more stars
                const x = Phaser.Math.Between(64, scene.scale.width - 64);
                const y = Phaser.Math.Between(64, scene.scale.height - 64);
    
                //  `add.sprite` is a Phaser GameObjectFactory method and it returns a Sprite Game Object instance
                const star = scene.add.sprite(x, y, 'star');
    
                //  ... which you can then act upon. Here we create a Phaser Tween to fade the star sprite in and out.
                //  You could, of course, do this from within the Phaser Scene code, but this is just an example
                //  showing that Phaser objects and systems can be acted upon from outside of Phaser itself.
                scene.add.tween({
                    targets: star,
                    duration: 500 + Math.random() * 1000,
                    alpha: 0,
                    yoyo: true,
                    repeat: -1
                });
            }
        }
    }

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {

        setCanMoveSprite(scene.scene.key !== 'MainMenu');
        
    }

    return (
        <div className='' id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            <div>
                <div>
                    <button className="button" onClick={changeScene}>Change Scene</button>
                </div>
                <div>
                    <button disabled={canMoveSprite} className="button" onClick={moveSprite}>Toggle Movement</button>
                </div>
                <div className="spritePosition">Sprite Position:
                    <pre>{`{\n  x: ${spritePosition.x}\n  y: ${spritePosition.y}\n}`}</pre>
                </div>
                <div>
                    <button className="button" onClick={addSprite}>Add New Sprite</button>
                </div>
            </div>
        </div>
    )
}

export default App
