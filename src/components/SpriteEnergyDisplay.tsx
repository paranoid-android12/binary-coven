import React, { useRef, useEffect, useState } from 'react';
import { Entity } from '../types/game';

interface SpriteEnergyDisplayProps {
  entity: Entity;
  position: { x: number; y: number };
  backgroundSprite?: string; // Path to your main UI sprite
  energyBarConfig?: {
    x: number; // X position of energy bar on the sprite
    y: number; // Y position of energy bar on the sprite
    maxWidth: number; // Maximum width when full energy (e.g., 20 for 2x10)
    height: number; // Height of energy bar (e.g., 2)
    color?: string; // Optional color overlay for energy bar
  };
  scale?: number; // Scale factor for the entire sprite (default: 1)
}

export const SpriteEnergyDisplay: React.FC<SpriteEnergyDisplayProps> = ({
  entity,
  position,
  backgroundSprite,
  energyBarConfig = {
    x: 20,
    y: 50,
    maxWidth: 20, // 2x10 pixels when full
    height: 2,
    color: '#00ff00'
  },
  scale = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteImage, setSpriteImage] = useState<HTMLImageElement | null>(null);
  const [spriteLoaded, setSpriteLoaded] = useState(false);

  // Calculate actual dimensions based on sprite or defaults
  const GRID_SIZE = 16
  const SPRITE_WIDTH = spriteImage ? spriteImage.width : 120;
  const SPRITE_HEIGHT = spriteImage ? spriteImage.height : 80;
  const SCALED_WIDTH = SPRITE_WIDTH * scale;
  const SCALED_HEIGHT = SPRITE_HEIGHT * scale;

  // Load sprite image
  useEffect(() => {
    if (!backgroundSprite) {
      setSpriteLoaded(true); // Use fallback drawing
      return;
    }

    const img = new Image();
    img.onload = () => {
      setSpriteImage(img);
      setSpriteLoaded(true);
    };
    img.onerror = () => {
      console.warn('Failed to load sprite:', backgroundSprite);
      setSpriteLoaded(true); // Use fallback drawing
    };
    img.src = backgroundSprite;
  }, [backgroundSprite]);

  // Draw the sprite-based UI
  useEffect(() => {
    if (!spriteLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = (GRID_SIZE * scale) * 3;
    canvas.height = (GRID_SIZE * scale);

    // Clear canvas
    ctx.clearRect(0, 0, SCALED_WIDTH, SCALED_HEIGHT);

    // Disable smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    if (spriteImage) {
      // Draw the main sprite
      ctx.drawImage(spriteImage, 144, 96, 48, 16, 0, 0, (48*scale), (16*scale));
    } else {
      // Fallback: draw a simple background if no sprite provided
      ctx.fillStyle = 'rgba(20, 30, 40, 0.9)';
      ctx.strokeStyle = '#4a90e2';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(0, 0, SCALED_WIDTH, SCALED_HEIGHT, 8 * scale);
      ctx.fill();
      ctx.stroke();
    }

    // Draw energy bar overlay
    const energyPercent = entity.stats.energy / entity.stats.maxEnergy;
    const energyWidth = energyBarConfig.maxWidth * energyPercent;
    
    // Scale the energy bar position and dimensions
    const scaledEnergyX = energyBarConfig.x * scale;
    const scaledEnergyY = energyBarConfig.y * scale;
    const scaledEnergyWidth = energyWidth * scale;
    const scaledEnergyHeight = energyBarConfig.height * scale;

    if (energyBarConfig.color && energyWidth > 0) {
      ctx.fillStyle = energyBarConfig.color;
      ctx.fillRect(scaledEnergyX, scaledEnergyY, scaledEnergyWidth, scaledEnergyHeight);
    }

  }, [entity, spriteLoaded, spriteImage, energyBarConfig, scale]); // Redraw when relevant data changes

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: SCALED_WIDTH,
        height: SCALED_HEIGHT,
        userSelect: 'none',
        zIndex: 1000,
        pointerEvents: 'none' // Static, no interaction
      }}
    >
      <canvas
        ref={canvasRef}
        width={SCALED_WIDTH}
        height={SCALED_HEIGHT}
        style={{
          display: 'block',
          imageRendering: 'pixelated', // For crisp pixel art style
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))'
        }}
      />
      
      {!spriteLoaded && (
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
          fontSize: `${10 * scale}px`,
          borderRadius: `${4 * scale}px`
        }}>
          Loading...
        </div>
      )}
    </div>
  );
};

export default SpriteEnergyDisplay;
