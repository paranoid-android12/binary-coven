import React, { useRef, useEffect, useState } from 'react';

interface ButtonFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SpriteButtonProps {
  position: { x: number; y: number };
  backgroundSprite: string; // Path to button.png
  upFrame: ButtonFrame; // Coordinates for "up" state
  downFrame: ButtonFrame; // Coordinates for "down" state
  scale?: number; // Scale factor for the button (default: 4)
  onClick?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  tooltip?: string; // Tooltip text to display on hover
}

export const SpriteButton: React.FC<SpriteButtonProps> = ({
  position,
  backgroundSprite,
  upFrame,
  downFrame,
  scale = 4,
  onClick,
  onMouseDown,
  onMouseUp,
  tooltip
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteImage, setSpriteImage] = useState<HTMLImageElement | null>(null);
  const [spriteLoaded, setSpriteLoaded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Button dimensions (16x16 base size)
  const BUTTON_SIZE = 16;
  const SCALED_SIZE = BUTTON_SIZE * scale;

  // Load sprite image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSpriteImage(img);
      setSpriteLoaded(true);
    };
    img.onerror = () => {
      console.warn('Failed to load button sprite:', backgroundSprite);
      setSpriteLoaded(true); // Use fallback drawing
    };
    img.src = backgroundSprite;
  }, [backgroundSprite]);

  // Draw the button sprite
  useEffect(() => {
    if (!spriteLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = SCALED_SIZE;
    canvas.height = SCALED_SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, SCALED_SIZE, SCALED_SIZE);

    // Disable smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    if (spriteImage) {
      // Choose the appropriate frame based on button state
      const frame = isPressed ? downFrame : upFrame;
      
      // Draw the button frame from the sprite
      ctx.drawImage(
        spriteImage,
        frame.x, frame.y, frame.w, frame.h, // Source coordinates and size
        0, 0, SCALED_SIZE, SCALED_SIZE // Destination coordinates and size
      );
    } else {
      // Fallback: draw a simple button if no sprite provided
      ctx.fillStyle = isPressed ? '#555555' : '#777777';
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(0, 0, SCALED_SIZE, SCALED_SIZE, 4);
      ctx.fill();
      ctx.stroke();
    }

  }, [spriteLoaded, spriteImage, upFrame, downFrame, isPressed, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPressed(true);
    onMouseDown?.();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPressed(false);
    onMouseUp?.();
    onClick?.();
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  return (
    <div
      title={tooltip}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: SCALED_SIZE,
        height: SCALED_SIZE,
        userSelect: 'none',
        zIndex: 1000,
        cursor: 'pointer',
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        width={SCALED_SIZE}
        height={SCALED_SIZE}
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

export default SpriteButton;
