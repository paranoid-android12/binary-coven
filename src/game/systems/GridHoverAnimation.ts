import { Scene } from 'phaser';
import { Position } from '../../types/game';

/**
 * GridHoverAnimation
 * 
 * A reusable system for displaying hover animations on grid positions.
 * Creates 4 corner sprites (upper-left, upper-right, lower-left, lower-right)
 * with a simple looped animation, just like Manu's idle animation.
 * 
 * This can be used for NPCs, special grids, or any interactive element
 * that needs visual feedback.
 */

export interface GridHoverAnimationConfig {
  position: Position; // Grid position
  gridSize: number; // Size of each grid cell in pixels
  scale?: number; // Optional scale for the sprite (default: 1.5)
  tintColor?: number; // Optional tint color (default: 0xffffff - white)
}

export class GridHoverAnimation {
  private scene: Scene;
  private config: GridHoverAnimationConfig;
  private cornerSprites: Phaser.GameObjects.Sprite[] = [];
  private isActive: boolean = false;

  constructor(scene: Scene, config: GridHoverAnimationConfig) {
    this.scene = scene;
    this.config = {
      scale: 1.5,
      tintColor: 0xffffff,
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
    this.isActive = true;
  }

  /**
   * Stop and clean up the animation
   */
  stop(): void {
    if (!this.isActive) return;

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
   * Creates 4 corner sprites at upper-left, upper-right, lower-left, lower-right
   * Each sprite plays the 'hover_animation' loop
   */
  private createCornerSprites(): void {
    const { position, gridSize, scale, tintColor } = this.config;
    
    // Calculate center position in pixels
    const centerX = position.x * gridSize + gridSize / 2;
    const centerY = position.y * gridSize + gridSize / 2;

    // Check if hover animation is available
    if (!this.scene.anims.exists('hover_animation')) {
      console.warn('[GridHoverAnimation] hover_animation not found in Preloader');
      return;
    }

    // Corner positions: upper-left, upper-right, lower-left, lower-right
    const cornerOffsets = [
      { x: -gridSize + 20, y: -gridSize + 20, rotation: 0 },       // Upper-left: 90°
      { x: gridSize - 20, y: -gridSize + 20, rotation: Math.PI / 2 },            // Upper-right: 180°
      { x: -gridSize + 20, y: gridSize - 20, rotation: ( 3 * Math.PI) / 2 }, // Lower-left: 270°
      { x: gridSize - 20, y: gridSize - 20, rotation: Math.PI }                    // Lower-right: 0° (or 360°)
    ];
    
    //Rotated 90 increasingly starting index
    cornerOffsets.forEach(offset => {
      const sprite = this.scene.add.sprite(
        centerX + offset.x,
        centerY + offset.y,
        'extras'
      );

      sprite.setDepth(2000); // High depth to be above most elements
      sprite.setOrigin(0.5, 0.5);
      sprite.setTint(tintColor!);
      sprite.setRotation(offset.rotation);

      // Set scale based on config
      const cornerScale = (6) * 0.8;
      sprite.setScale(cornerScale);

      // Play the hover animation (looped, just like Manu)
      sprite.play('hover_animation');

      this.cornerSprites.push(sprite);
    });

    console.log(`[GridHoverAnimation] Created ${this.cornerSprites.length} corner sprites with hover animation`);
  }

  /**
   * Update corner sprite positions (for repositioning)
   */
  private updateCornerPositions(): void {
    const { position, gridSize } = this.config;
    const centerX = position.x * gridSize + gridSize / 2;
    const centerY = position.y * gridSize + gridSize / 2;

    const cornerOffsets = [
      { x: -gridSize, y: -gridSize }, // Upper-left
      { x: gridSize, y: -gridSize },  // Upper-right
      { x: -gridSize, y: gridSize },  // Lower-left
      { x: gridSize, y: gridSize }    // Lower-right
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

