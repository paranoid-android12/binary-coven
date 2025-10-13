import { Scene } from 'phaser';
import { NPC, NPCConfig, Position } from '../../types/game';
import { GridHoverAnimation } from './GridHoverAnimation';
import { EventBus } from '../EventBus';

/**
 * NPCManager
 * 
 * A system for managing Non-Player Characters (NPCs) in the game.
 * NPCs are stationary characters placed at specific grid positions
 * that can trigger dialogue or other interactions when clicked.
 * 
 * Features:
 * - Static NPCs with idle animations
 * - Click interaction to trigger dialogue
 * - Optional hover animation for visual feedback
 * - Easy configuration and management
 */

export class NPCManager {
  private scene: Scene;
  private gridSize: number;
  private npcs: Map<string, NPC> = new Map();
  private hoverAnimations: Map<string, GridHoverAnimation> = new Map();

  constructor(scene: Scene, gridSize: number) {
    this.scene = scene;
    this.gridSize = gridSize;
  }

  /**
   * Create and add an NPC to the game
   */
  createNPC(config: NPCConfig): NPC {
    // Check if NPC with this ID already exists
    if (this.npcs.has(config.id)) {
      console.warn(`NPC with id ${config.id} already exists. Removing old NPC.`);
      this.removeNPC(config.id);
    }

    const npc: NPC = {
      id: config.id,
      name: config.name,
      position: config.position,
      config: config
    };

    // Create sprite for NPC
    this.createNPCSprite(npc);

    // Create hover animation if enabled
    if (config.showHoverAnimation !== false) {
      this.createHoverAnimation(npc);
    }

    // Store NPC
    this.npcs.set(config.id, npc);

    console.log(`[NPC-MANAGER] Created NPC: ${config.name} at (${config.position.x}, ${config.position.y})`);

    return npc;
  }

  /**
   * Remove an NPC from the game
   */
  removeNPC(npcId: string): void {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      console.warn(`NPC with id ${npcId} not found`);
      return;
    }

    // Destroy sprite
    if (npc.sprite) {
      npc.sprite.destroy();
    }

    // Destroy hover animation
    const hoverAnimation = this.hoverAnimations.get(npcId);
    if (hoverAnimation) {
      hoverAnimation.destroy();
      this.hoverAnimations.delete(npcId);
    }

    // Remove from map
    this.npcs.delete(npcId);

    console.log(`[NPC-MANAGER] Removed NPC: ${npc.name}`);
  }

  /**
   * Get an NPC by ID
   */
  getNPC(npcId: string): NPC | undefined {
    return this.npcs.get(npcId);
  }

  /**
   * Get all NPCs
   */
  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  /**
   * Get NPC at a specific position
   */
  getNPCAtPosition(position: Position): NPC | undefined {
    for (const npc of this.npcs.values()) {
      if (npc.position.x === position.x && npc.position.y === position.y) {
        return npc;
      }
    }
    return undefined;
  }

  /**
   * Update NPC position (if needed in the future)
   */
  updateNPCPosition(npcId: string, position: Position): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    npc.position = position;

    // Update sprite position
    if (npc.sprite) {
      const pixelX = position.x * this.gridSize + this.gridSize / 2;
      const pixelY = position.y * this.gridSize + this.gridSize / 2;
      npc.sprite.setPosition(pixelX, pixelY);
    }

    // Update hover animation position
    const hoverAnimation = this.hoverAnimations.get(npcId);
    if (hoverAnimation) {
      hoverAnimation.updatePosition(position);
    }
  }

  /**
   * Create sprite for NPC
   */
  private createNPCSprite(npc: NPC): void {
    const config = npc.config;
    const scale = config.scale || 1.5;

    // Calculate pixel position
    const pixelX = npc.position.x * this.gridSize + this.gridSize / 2;
    const pixelY = npc.position.y * this.gridSize + this.gridSize / 2;

    // Check if sprite texture exists
    console.log(`[NPC-MANAGER] Checking texture '${config.spriteKey}' exists:`, this.scene.textures.exists(config.spriteKey));
    console.log(`[NPC-MANAGER] Available textures:`, Object.keys(this.scene.textures.list));
    
    if (this.scene.textures.exists(config.spriteKey)) {
      // Create animated sprite
      console.log(`[NPC-MANAGER] Creating sprite with texture '${config.spriteKey}'`);
      npc.sprite = this.scene.add.sprite(pixelX, pixelY, config.spriteKey);
      
      // Set scale
      npc.sprite.setDisplaySize(this.gridSize * scale, this.gridSize * scale);
      
      // Set pixel-perfect rendering
      npc.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      
      // Set depth (same as Qubit for consistency)
      npc.sprite.setDepth(1000);

      // Play idle animation if it exists
      // Try the spriteKey itself first (e.g., 'manu_idle')
      // Then try with '_idle' suffix (e.g., 'manu_idle_idle')
      let animationPlayed = false;
      if (this.scene.anims.exists(config.spriteKey)) {
        npc.sprite.play(config.spriteKey);
        animationPlayed = true;
        console.log(`[NPC-MANAGER] Playing animation: ${config.spriteKey}`);
      } else {
        const idleAnimKey = `${config.spriteKey}_idle`;
        if (this.scene.anims.exists(idleAnimKey)) {
          npc.sprite.play(idleAnimKey);
          animationPlayed = true;
          console.log(`[NPC-MANAGER] Playing animation: ${idleAnimKey}`);
        }
      }
      
      if (!animationPlayed) {
        console.log(`[NPC-MANAGER] No animation found for ${config.spriteKey}`);
      }
    } else {
      // Fallback: create placeholder sprite
      console.warn(`[NPC-MANAGER] Sprite texture '${config.spriteKey}' not found. Creating placeholder.`);
      this.createPlaceholderSprite(config.spriteKey);
      
      npc.sprite = this.scene.add.sprite(pixelX, pixelY, config.spriteKey);
      npc.sprite.setDisplaySize(this.gridSize * scale, this.gridSize * scale);
      npc.sprite.setDepth(1000);
    }

    // Make sprite interactive
    npc.sprite.setInteractive({ cursor: 'pointer' });

    // Add click handler
    npc.sprite.on('pointerdown', () => {
      this.handleNPCClick(npc);
    });

    // Add hover effects
    npc.sprite.on('pointerover', () => {
      npc.sprite?.setTint(0xcccccc); // Slight tint on hover
      
      // Start hover animation when mouse enters
      const hoverAnimation = this.hoverAnimations.get(npc.id);
      if (hoverAnimation && !hoverAnimation.isAnimationActive()) {
        hoverAnimation.start();
      }
    });

    npc.sprite.on('pointerout', () => {
      npc.sprite?.clearTint();
      
      // Stop hover animation when mouse leaves
      const hoverAnimation = this.hoverAnimations.get(npc.id);
      if (hoverAnimation && hoverAnimation.isAnimationActive()) {
        hoverAnimation.stop();
      }
    });
  }

  /**
   * Create hover animation for NPC
   * Note: Animation is created but not started - it will start on mouse hover
   */
  private createHoverAnimation(npc: NPC): void {
    const hoverAnimation = new GridHoverAnimation(this.scene, {
      position: npc.position,
      gridSize: this.gridSize,
      scale: npc.config.scale || 1.5,
      tintColor: 0xffffff
    });

    // Don't start the animation yet - it will be started on hover
    this.hoverAnimations.set(npc.id, hoverAnimation);
  }

  /**
   * Handle NPC click interaction
   */
  private handleNPCClick(npc: NPC): void {
    console.log(`[NPC-MANAGER] NPC clicked: ${npc.name}`);

    // Emit event for external listeners
    EventBus.emit('npc-clicked', npc);

    // Trigger dialogue if configured
    if (npc.config.dialogueFile) {
      console.log(`[NPC-MANAGER] Triggering dialogue: ${npc.config.dialogueFile}`);
      EventBus.emit('start-dialogue', npc.config.dialogueFile);
    }
  }

  /**
   * Create placeholder sprite for missing textures
   */
  private createPlaceholderSprite(spriteKey: string): void {
    console.log(`[NPC-MANAGER] Checking texture '${spriteKey}' exists:`, this.scene.textures.exists(spriteKey));
    console.log(`[NPC-MANAGER] Available textures:`, Object.keys(this.scene.textures.list));
    
    if (this.scene.textures.exists(spriteKey)) {
      return;
    }

    const graphics = this.scene.add.graphics();
    
    // Create a simple colored square as placeholder
    graphics.fillStyle(0xff6b9d, 1); // Pink color for NPC
    graphics.fillRect(0, 0, this.gridSize - 4, this.gridSize - 4);
    
    // Add NPC text
    graphics.fillStyle(0xffffff);
    
    graphics.generateTexture(spriteKey, this.gridSize - 4, this.gridSize - 4);
    graphics.destroy();
  }

  /**
   * Clean up all NPCs and animations
   */
  destroy(): void {
    // Remove all NPCs
    const npcIds = Array.from(this.npcs.keys());
    npcIds.forEach(id => this.removeNPC(id));

    this.npcs.clear();
    this.hoverAnimations.clear();

    console.log('[NPC-MANAGER] Destroyed all NPCs');
  }
}

