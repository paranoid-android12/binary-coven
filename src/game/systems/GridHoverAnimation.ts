import { Scene } from 'phaser';
import { Position } from '../../types/game';

/**
 * GridHoverAnimation
 * 
 * A reusable system for displaying hover animations on grid positions.
 * Creates a 3x3 grid (48x48 pixels) corner-only box sprite animation
 * that hovers in and out with two frames.
 * 
 * This can be used for NPCs, special grids, or any interactive element
 * that needs visual feedback.
 */

export interface GridHoverAnimationConfig {
  position: Position; // Grid position
  gridSize: number; // Size of each grid cell in pixels
  scale?: number; // Optional scale for the sprite (default: 1.5)
  tintColor?: number; // Optional tint color (default: 0xffffff - white)
  animationSpeed?: number; // Duration of hover animation in ms (default: 1000)
}

export class GridHoverAnimation {
  private scene: Scene;
  private config: GridHoverAnimationConfig;
  private cornerSprites: Phaser.GameObjects.Sprite[] = [];
  private animationTween?: Phaser.Tweens.Tween;
  private isActive: boolean = false;

  constructor(scene: Scene, config: GridHoverAnimationConfig) {
    this.scene = scene;
    this.config = {
      scale: 1.5,
      tintColor: 0xffffff,
      animationSpeed: 1000,
      ...config
    };
  }

  /**
   * Create and start the hover animation
   */
  start(): void {
    if (this.isActive) {
      console.warn('GridHoverAnimation is already active');
      return;
    }

    this.createCornerSprites();
    this.startAnimation();
    this.isActive = true;
  }

  /**
   * Stop and clean up the animation
   */
  stop(): void {
    if (!this.isActive) return;

    // Stop animation tween
    if (this.animationTween) {
      this.animationTween.stop();
      this.animationTween = undefined;
    }

    // Destroy all corner sprites
    this.cornerSprites.forEach(sprite => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.cornerSprites = [];

    this.isActive = false;
  }

  /**
   * Update the position of the animation (useful for moving entities)
   */
  updatePosition(position: Position): void {
    this.config.position = position;
    
    if (this.isActive) {
      // Update all corner sprite positions
      this.updateCornerPositions();
    }
  }

  /**
   * Create the corner sprites for the hover animation
   * Creates 4 corner sprites arranged in a 3x3 grid pattern
   */
  private createCornerSprites(): void {
    const { position, gridSize, scale, tintColor } = this.config;
    
    // Calculate center position in pixels
    const centerX = position.x * gridSize + gridSize / 2;
    const centerY = position.y * gridSize + gridSize / 2;

    // Create corner frame sprite if it doesn't exist
    this.createCornerFrameTexture();

    // Corner positions relative to center (for 3x3 grid)
    // Each corner is at the outer edge of the 3x3 grid
    const cornerOffsets = [
      { x: -gridSize, y: -gridSize, rotation: 0 },           // Top-left
      { x: gridSize, y: -gridSize, rotation: Math.PI / 2 },  // Top-right
      { x: gridSize, y: gridSize, rotation: Math.PI },       // Bottom-right
      { x: -gridSize, y: gridSize, rotation: -Math.PI / 2 }  // Bottom-left
    ];

    cornerOffsets.forEach(offset => {
      const sprite = this.scene.add.sprite(
        centerX + offset.x,
        centerY + offset.y,
        'corner_frame_0'
      );

      sprite.setDepth(2000); // High depth to be above most elements
      sprite.setOrigin(0.5, 0.5);
      sprite.setRotation(offset.rotation);
      sprite.setTint(tintColor!);

      // Set scale based on config (corner sprites are small, so we scale them appropriately)
      const cornerScale = (scale || 1.5) * 0.8;
      sprite.setScale(cornerScale);

      this.cornerSprites.push(sprite);
    });
  }

  /**
   * Create the corner frame texture programmatically
   * Creates two frames for animation
   */
  private createCornerFrameTexture(): void {
    // Check if textures already exist
    if (this.scene.textures.exists('corner_frame_0')) {
      return;
    }

    const graphics = this.scene.add.graphics();
    
    // Frame 0: Corner bracket (normal state)
    graphics.lineStyle(2, 0xffffff, 1);
    // Draw L-shaped corner bracket
    graphics.beginPath();
    graphics.moveTo(0, 8);
    graphics.lineTo(0, 0);
    graphics.lineTo(8, 0);
    graphics.strokePath();
    graphics.generateTexture('corner_frame_0', 16, 16);
    graphics.clear();

    // Frame 1: Corner bracket (expanded state - slightly larger)
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(0, 10);
    graphics.lineTo(0, 0);
    graphics.lineTo(10, 0);
    graphics.strokePath();
    graphics.generateTexture('corner_frame_1', 16, 16);
    graphics.clear();

    graphics.destroy();
  }

  /**
   * Start the hover in/out animation
   */
  private startAnimation(): void {
    // Create a repeating animation that switches between frames
    let currentFrame = 0;
    
    // Use a timeline for smooth frame switching
    this.animationTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: this.config.animationSpeed!,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        const progress = tween.getValue();
        
        // Switch frame based on progress
        const frameIndex = progress > 0.5 ? 1 : 0;
        
        if (frameIndex !== currentFrame) {
          currentFrame = frameIndex;
          this.cornerSprites.forEach(sprite => {
            if (sprite && sprite.active) {
              sprite.setTexture(`corner_frame_${currentFrame}`);
            }
          });
        }
      }
    });
  }

  /**
   * Update corner sprite positions (for repositioning)
   */
  private updateCornerPositions(): void {
    const { position, gridSize } = this.config;
    const centerX = position.x * gridSize + gridSize / 2;
    const centerY = position.y * gridSize + gridSize / 2;

    const cornerOffsets = [
      { x: -gridSize, y: -gridSize },
      { x: gridSize, y: -gridSize },
      { x: gridSize, y: gridSize },
      { x: -gridSize, y: gridSize }
    ];

    this.cornerSprites.forEach((sprite, index) => {
      if (sprite && sprite.active) {
        const offset = cornerOffsets[index];
        sprite.setPosition(centerX + offset.x, centerY + offset.y);
      }
    });
  }

  /**
   * Check if animation is currently active
   */
  isAnimationActive(): boolean {
    return this.isActive;
  }

  /**
   * Destroy the animation and clean up resources
   */
  destroy(): void {
    this.stop();
  }
}

