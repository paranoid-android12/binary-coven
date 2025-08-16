import React, { useRef, useEffect, useState } from 'react';
import { Entity } from '../types/game';

interface ImageSpriteEnergyDisplayProps {
  entity: Entity;
  position: { x: number; y: number };
  energyBarSprite?: string;
}

export const ImageSpriteEnergyDisplay: React.FC<ImageSpriteEnergyDisplayProps> = ({
  entity,
  position,
  energyBarSprite = '/Bars.png',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [energyBarImage, setEnergyBarImage] = useState<HTMLImageElement | null>(null);

  // Constants
  const scale = 4;
  const spriteWidth = 140;
  const spriteHeight = 90;
  
  // Sprite sheet coordinates
  const spriteSourceX = 48;
  const spriteSourceY = 96;
  const spriteSourceWidth = 48;
  const spriteSourceHeight = 16;

  useEffect(() => {
    const loadImages = async () => {
      try {
        const energyImg = new Image();

        const energyPromise = new Promise((resolve, reject) => {
          energyImg.onload = resolve;
          energyImg.onerror = reject;
          energyImg.src = energyBarSprite;
        });

        await Promise.all([energyPromise]);
        
        setEnergyBarImage(energyImg);
        setSpritesLoaded(true);
      } catch (error) {
        console.warn('Could not load UI sprites, falling back to programmatic drawing:', error);
        setSpritesLoaded(true);
      }
    };

    loadImages();
  }, [energyBarSprite]);

  useEffect(() => {
    if (!spritesLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fix blurriness
    ctx.imageSmoothingEnabled = false;

    // Energy bar
    const energyPercent = entity.stats.energy / entity.stats.maxEnergy;
    ctx.clearRect(0, 0, spriteWidth * scale, spriteHeight * scale);
    if (energyBarImage) {
      // Use sprite for energy bar
      ctx.save()
      ctx.beginPath();
      ctx.rect(23, 0, (((spriteSourceWidth * scale) - 81) * energyPercent), (spriteSourceHeight * scale));
      ctx.clip();
      ctx.drawImage(
        energyBarImage,
        spriteSourceX, spriteSourceY, spriteSourceWidth, spriteSourceHeight,
        0, 0, spriteSourceWidth * scale, spriteSourceHeight * scale
      );
      ctx.restore();
    }

  }, [entity.stats.energy, entity.stats.maxEnergy, spritesLoaded, energyBarImage, scale]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: spriteWidth * scale,
        height: spriteHeight * scale,
        userSelect: 'none',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
    >
      <canvas
        ref={canvasRef}
        width={spriteWidth * scale}
        height={spriteHeight * scale}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
          filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.6))'
        }}
      />
      {!spritesLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          fontSize: '10px'
        }}>
          Loading...
        </div>
      )}
    </div>
  );
};

export default ImageSpriteEnergyDisplay;