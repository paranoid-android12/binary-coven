import React, { useRef, useEffect, useState } from 'react';
import { Entity } from '../types/game';

interface ImageSpriteEnergyDisplayProps {
  entity: Entity;
  position: { x: number; y: number };
  onDrag?: (position: { x: number; y: number }) => void;
  backgroundSprite?: string; // Path to background sprite image
  energyBarSprite?: string; // Path to energy bar sprite
  inventorySlotSprite?: string; // Path to inventory slot sprite
}

export const ImageSpriteEnergyDisplay: React.FC<ImageSpriteEnergyDisplayProps> = ({
  entity,
  position,
  onDrag,
  backgroundSprite = '/assets/ui/energy-panel-bg.png',
  energyBarSprite = '/assets/ui/energy-bar.png',
  inventorySlotSprite = '/assets/ui/inventory-slot.png'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [images, setImages] = useState<{
    background?: HTMLImageElement;
    energyBar?: HTMLImageElement;
    inventorySlot?: HTMLImageElement;
  }>({});

  // Constants for sprite design
  const SPRITE_WIDTH = 140;
  const SPRITE_HEIGHT = 90;

  // Load sprite images
  useEffect(() => {
    const loadImages = async () => {
      try {
        const bgImg = new Image();
        const energyImg = new Image();
        const invImg = new Image();

        // Set up promises for image loading
        const bgPromise = new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = backgroundSprite;
        });

        const energyPromise = new Promise((resolve, reject) => {
          energyImg.onload = resolve;
          energyImg.onerror = reject;
          energyImg.src = energyBarSprite;
        });

        const invPromise = new Promise((resolve, reject) => {
          invImg.onload = resolve;
          invImg.onerror = reject;
          invImg.src = inventorySlotSprite;
        });

        // Wait for all images to load
        await Promise.all([bgPromise, energyPromise, invPromise]);
        
        setImages({
          background: bgImg,
          energyBar: energyImg,
          inventorySlot: invImg
        });
        setSpritesLoaded(true);
      } catch (error) {
        console.warn('Could not load UI sprites, falling back to programmatic drawing:', error);
        setSpritesLoaded(true); // Still allow drawing without images
      }
    };

    loadImages();
  }, [backgroundSprite, energyBarSprite, inventorySlotSprite]);

  // Draw the sprite-based UI
  useEffect(() => {
    if (!spritesLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);

    // Draw background
    if (images.background) {
      ctx.drawImage(images.background, 0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
    } else {
      // Fallback: draw programmatic background
      ctx.fillStyle = 'rgba(25, 35, 45, 0.95)';
      ctx.strokeStyle = '#4a90e2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT, 12);
      ctx.fill();
      ctx.stroke();
    }

    // Draw entity avatar area
    ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 32, 32, 4);
    ctx.fill();
    
    // Entity icon (placeholder)
    ctx.fillStyle = '#4a90e2';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(entity.type[0].toUpperCase(), 24, 28);

    // Draw entity name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(entity.name, 48, 16);
    
    // Draw entity type
    ctx.fillStyle = '#cccccc';
    ctx.font = '10px monospace';
    ctx.fillText(entity.type.toUpperCase(), 48, 30);

    // Energy bar area
    const energyBarX = 48;
    const energyBarY = 38;
    const energyBarWidth = 80;
    const energyBarHeight = 12;
    
    // Draw energy bar background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(energyBarX, energyBarY, energyBarWidth, energyBarHeight);
    
    // Draw energy bar fill
    const energyPercent = entity.stats.energy / entity.stats.maxEnergy;
    const energyFillWidth = energyBarWidth * energyPercent;
    
    if (images.energyBar) {
      // Use sprite for energy bar
      ctx.save();
      ctx.beginPath();
      ctx.rect(energyBarX, energyBarY, energyFillWidth, energyBarHeight);
      ctx.clip();
      ctx.drawImage(images.energyBar, energyBarX, energyBarY, energyBarWidth, energyBarHeight);
      ctx.restore();
    } else {
      // Fallback: programmatic energy bar
      if (energyPercent > 0.6) {
        ctx.fillStyle = '#00ff66';
      } else if (energyPercent > 0.3) {
        ctx.fillStyle = '#ffaa00';
      } else {
        ctx.fillStyle = '#ff4444';
      }
      ctx.fillRect(energyBarX, energyBarY, energyFillWidth, energyBarHeight);
    }
    
    // Energy bar border
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(energyBarX, energyBarY, energyBarWidth, energyBarHeight);
    
    // Energy text
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${entity.stats.energy}/${entity.stats.maxEnergy}`, energyBarX + energyBarWidth, energyBarY + 9);

    // Inventory section
    ctx.fillStyle = '#cccccc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('INVENTORY', 8, 65);
    
    // Draw inventory slots
    const slotSize = 12;
    const slotSpacing = 2;
    const slotsPerRow = 5;
    const startX = 8;
    const startY = 70;
    
    for (let i = 0; i < Math.min(entity.inventory.capacity, 10); i++) {
      const slotX = startX + (i % slotsPerRow) * (slotSize + slotSpacing);
      const slotY = startY + Math.floor(i / slotsPerRow) * (slotSize + slotSpacing);
      
      if (images.inventorySlot) {
        ctx.drawImage(images.inventorySlot, slotX, slotY, slotSize, slotSize);
      } else {
        // Fallback: programmatic slot
        if (i < entity.inventory.items.length) {
          ctx.fillStyle = '#4a90e2';
        } else {
          ctx.fillStyle = '#333333';
        }
        ctx.fillRect(slotX, slotY, slotSize, slotSize);
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.strokeRect(slotX, slotY, slotSize, slotSize);
      }
      
      // Draw item indicator if slot is filled
      if (i < entity.inventory.items.length) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('•', slotX + slotSize/2, slotY + slotSize/2 + 2);
      }
    }
    
    // Inventory count
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${entity.inventory.items.length}/${entity.inventory.capacity}`, SPRITE_WIDTH - 8, 78);

  }, [entity, spritesLoaded, images]);

  // Handle dragging (same as before)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && onDrag) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onDrag({
        x: Math.max(0, Math.min(newX, window.innerWidth - SPRITE_WIDTH)),
        y: Math.max(0, Math.min(newY, window.innerHeight - SPRITE_HEIGHT))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, onDrag]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: SPRITE_WIDTH,
        height: SPRITE_HEIGHT,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      <canvas
        ref={canvasRef}
        width={SPRITE_WIDTH}
        height={SPRITE_HEIGHT}
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
