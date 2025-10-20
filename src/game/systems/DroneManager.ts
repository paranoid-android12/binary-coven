import { Scene } from 'phaser';
import { Entity, DroneConfig, Position, CodeWindow } from '../../types/game';
import { GridHoverAnimation } from './GridHoverAnimation';
import { EventBus } from '../EventBus';
import { useGameStore } from '../../stores/gameStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * DroneManager
 * 
 * A system for managing programmable Drone entities in the game.
 * Drones are autonomous entities that:
 * - Can be programmed like the player (Qubit)
 * - Have their own code windows and execution context
 * - Execute code independently
 * - Have full access to all programming functions
 * - Can be clicked to open their programming interface
 * 
 * Features:
 * - Independent code execution per drone
 * - Full entity capabilities (movement, inventory, actions)
 * - Visual feedback with hover animations
 * - Clickable interaction to access programming interface
 */

export class DroneManager {
  private scene: Scene;
  private gridSize: number;
  private drones: Map<string, Entity> = new Map();
  private hoverAnimations: Map<string, GridHoverAnimation> = new Map();

  constructor(scene: Scene, gridSize: number) {
    this.scene = scene;
    this.gridSize = gridSize;
  }

  /**
   * Create and add a programmable drone to the game
   */
  createDrone(config: DroneConfig): Entity {
    const store = useGameStore.getState();

    // Check if drone with this ID already exists
    if (this.drones.has(config.id) || store.entities.has(config.id)) {
      console.warn(`Drone with id ${config.id} already exists. Removing old drone.`);
      this.removeDrone(config.id);
    }

    // Create default main code window for the drone
    const mainWindowId = uuidv4();
    const mainWindow: CodeWindow = {
      id: mainWindowId,
      name: 'main',
      code: `# ${config.name} - Main function
def main():
    # Your drone code here
    move_left()
    plant("wheat")`,
      isMain: true,
      isActive: true,
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 }
    };

    // Create drone entity with all required properties
    const droneEntity: Entity = {
      id: config.id,
      name: config.name,
      type: 'drone',
      position: config.position,
      visualPosition: { ...config.position },
      stats: {
        walkingSpeed: config.stats?.walkingSpeed || 3.0,
        energy: config.stats?.energy || 100,
        maxEnergy: config.stats?.maxEnergy || 100,
        harvestAmount: config.stats?.harvestAmount || 1,
        plantingSpeedMultiplier: config.stats?.plantingSpeedMultiplier || 1.0
      },
      inventory: {
        items: [],
        capacity: 10
      },
      isActive: true,
      taskState: {
        isBlocked: false,
        currentTask: undefined,
        progress: undefined
      },
      // Drone-specific properties
      isDrone: true,
      codeWindows: new Map([[mainWindowId, mainWindow]]),
      mainWindowId: mainWindowId,
      isExecuting: false,
      spriteKey: config.spriteKey,
      scale: config.scale || 1.5
    };

    // Create sprite for drone BEFORE adding to store
    this.createDroneSprite(droneEntity);

    // Create hover animation if enabled
    if (config.showHoverAnimation !== false) {
      this.createHoverAnimation(droneEntity);
    }

    // Add drone to game store with sprite already attached
    const entityId = store.addEntity(droneEntity);

    // Store drone reference locally
    this.drones.set(config.id, droneEntity);

    console.log(`[DRONE-INIT] ════════════════════════════════════`);
    console.log(`[DRONE-INIT] ✓ Drone FINAL STATE: ${config.name}`, {
      id: config.id,
      spriteKey: config.spriteKey,
      hasSprite: !!droneEntity.sprite,
      spriteVisible: droneEntity.sprite?.visible,
      spriteTexture: droneEntity.sprite?.texture?.key,
      spriteFrame: droneEntity.sprite?.frame?.name,
      spritePosition: { x: droneEntity.sprite?.x, y: droneEntity.sprite?.y },
      spriteDepth: droneEntity.sprite?.depth,
      spriteAlpha: droneEntity.sprite?.alpha,
      isPlaying: droneEntity.sprite?.anims?.isPlaying,
      currentAnim: droneEntity.sprite?.anims?.currentAnim?.key
    });
    console.log(`[DRONE-INIT] ════════════════════════════════════`);

    return droneEntity;
  }

  /**
   * Remove a drone from the game
   */
  removeDrone(droneId: string): void {
    const store = useGameStore.getState();
    const drone = this.drones.get(droneId) || store.entities.get(droneId);
    
    if (!drone) {
      console.warn(`Drone with id ${droneId} not found`);
      return;
    }

    // Destroy sprite
    if (drone.sprite) {
      drone.sprite.destroy();
    }

    // Destroy hover animation
    const hoverAnimation = this.hoverAnimations.get(droneId);
    if (hoverAnimation) {
      hoverAnimation.destroy();
      this.hoverAnimations.delete(droneId);
    }

    // Remove from store
    store.removeEntity(droneId);

    // Remove from local map
    this.drones.delete(droneId);
  }

  /**
   * Get a drone by ID
   */
  getDrone(droneId: string): Entity | undefined {
    return this.drones.get(droneId) || useGameStore.getState().entities.get(droneId);
  }

  /**
   * Get all drones
   */
  getAllDrones(): Entity[] {
    const store = useGameStore.getState();
    return Array.from(store.entities.values()).filter(entity => entity.isDrone);
  }

  /**
   * Get drone at a specific position
   */
  getDroneAtPosition(position: Position): Entity | undefined {
    const drones = this.getAllDrones();
    return drones.find(drone => 
      drone.position.x === position.x && drone.position.y === position.y
    );
  }

  /**
   * Update drone position
   */
  updateDronePosition(droneId: string, position: Position): void {
    const store = useGameStore.getState();
    const drone = store.entities.get(droneId);
    
    if (!drone) return;

    // Update entity position in store
    store.updateEntity(droneId, { position });

    // Update sprite position
    if (drone.sprite) {
      const pixelX = position.x * this.gridSize + this.gridSize / 2;
      const pixelY = position.y * this.gridSize + this.gridSize / 2;
      drone.sprite.setPosition(pixelX, pixelY);
    }

    // Update hover animation position
    const hoverAnimation = this.hoverAnimations.get(droneId);
    if (hoverAnimation) {
      hoverAnimation.updatePosition(position);
    }
  }

  /**
   * Create sprite for drone
   */
  private createDroneSprite(drone: Entity): void {
    const scale = drone.scale || 1.5;

    // Calculate pixel position
    const pixelX = drone.position.x * this.gridSize + this.gridSize / 2;
    const pixelY = drone.position.y * this.gridSize + this.gridSize / 2;

    // Check if sprite texture exists
    const spriteKey = drone.spriteKey || 'drone';
    const textureExists = this.scene.textures.exists(spriteKey);
    
    console.log(`[DRONE-INIT] ════════════════════════════════════`);
    console.log(`[DRONE-INIT] Creating sprite for ${drone.name}:`, {
      spriteKey,
      textureExists,
      position: { grid: drone.position, pixel: { x: pixelX, y: pixelY } },
      scale,
      displaySize: this.gridSize * scale,
      allTextures: Object.keys(this.scene.textures.list)
    });
    
    if (!textureExists) {
      console.error(`[DRONE-INIT] ✗✗✗ TEXTURE NOT FOUND: '${spriteKey}'`);
      console.error(`[DRONE-INIT] Available textures:`, Object.keys(this.scene.textures.list));
    }
    
    if (textureExists) {
      // Create sprite
      drone.sprite = this.scene.add.sprite(pixelX, pixelY, spriteKey);
      
      // Set scale
      drone.sprite.setDisplaySize(this.gridSize * scale, this.gridSize * scale);
      
      // Set pixel-perfect rendering
      drone.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      
      // Set depth (same as other entities)
      drone.sprite.setDepth(1000);

      console.log(`[DRONE-INIT] ✓ Sprite created:`, {
        frame: drone.sprite.frame.name,
        visible: drone.sprite.visible,
        alpha: drone.sprite.alpha,
        actualSize: { width: drone.sprite.width, height: drone.sprite.height }
      });

      // Play idle animation if it exists
      const animExists = this.scene.anims.exists(spriteKey);
      const idleAnimKey = `${spriteKey}_idle`;
      const idleAnimExists = this.scene.anims.exists(idleAnimKey);
      
      if (animExists) {
        drone.sprite.play(spriteKey);
        console.log(`[DRONE-INIT] ✓ Playing animation: ${spriteKey}`, {
          isPlaying: drone.sprite.anims.isPlaying,
          currentAnim: drone.sprite.anims.currentAnim?.key,
          currentFrame: drone.sprite.anims.currentFrame?.index
        });
      } else if (idleAnimExists) {
        drone.sprite.play(idleAnimKey);
        console.log(`[DRONE-INIT] ✓ Playing animation: ${idleAnimKey}`, {
          isPlaying: drone.sprite.anims.isPlaying,
          currentAnim: drone.sprite.anims.currentAnim?.key
        });
      } else {
        console.warn(`[DRONE-INIT] ✗ No animation found for '${spriteKey}' or '${idleAnimKey}'`);
      }
    } else {
      // Fallback: create placeholder sprite
      console.warn(`[DRONE-INIT] ✗ Texture '${spriteKey}' not found. Creating placeholder.`);
      this.createPlaceholderSprite(spriteKey);
      
      drone.sprite = this.scene.add.sprite(pixelX, pixelY, spriteKey);
      drone.sprite.setDisplaySize(this.gridSize * scale, this.gridSize * scale);
      drone.sprite.setDepth(1000);
    }

    // Make sprite interactive
    drone.sprite.setInteractive({ cursor: 'pointer' });

    // Add click handler to open drone programming interface
    drone.sprite.on('pointerdown', () => {
      this.handleDroneClick(drone);
    });

    // Add hover effects
    drone.sprite.on('pointerover', () => {
      drone.sprite?.setTint(0xcccccc); // Slight tint on hover
      
      // Start hover animation
      const hoverAnimation = this.hoverAnimations.get(drone.id);
      if (hoverAnimation && !hoverAnimation.isAnimationActive()) {
        hoverAnimation.start();
      }
    });

    drone.sprite.on('pointerout', () => {
      drone.sprite?.clearTint();
      
      // Stop hover animation
      const hoverAnimation = this.hoverAnimations.get(drone.id);
      if (hoverAnimation && hoverAnimation.isAnimationActive()) {
        hoverAnimation.stop();
      }
    });
  }

  /**
   * Create hover animation for drone
   */
  private createHoverAnimation(drone: Entity): void {
    const hoverAnimation = new GridHoverAnimation(this.scene, {
      position: drone.position,
      gridSize: this.gridSize,
      scale: drone.scale || 1.5,
      tintColor: 0xffffff
    });

    this.hoverAnimations.set(drone.id, hoverAnimation);
  }

  /**
   * Handle drone click interaction - opens programming interface
   */
  private handleDroneClick(drone: Entity): void {
    // Emit event to open drone programming interface
    EventBus.emit('drone-clicked', drone);
  }

  /**
   * Create placeholder sprite for missing textures
   */
  private createPlaceholderSprite(spriteKey: string): void {
    if (this.scene.textures.exists(spriteKey)) {
      return;
    }

    const graphics = this.scene.add.graphics();
    
    // Create a simple colored square as placeholder (blue for drones)
    graphics.fillStyle(0x4A90E2, 1); // Blue color for drones
    graphics.fillRect(0, 0, this.gridSize - 4, this.gridSize - 4);
    
    // Add triangle shape to indicate direction
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillTriangle(
      this.gridSize / 2, this.gridSize * 0.3,
      this.gridSize * 0.3, this.gridSize * 0.7,
      this.gridSize * 0.7, this.gridSize * 0.7
    );
    
    graphics.generateTexture(spriteKey, this.gridSize - 4, this.gridSize - 4);
    graphics.destroy();
  }

  /**
   * Get drone's main code window
   */
  getDroneMainWindow(droneId: string): CodeWindow | undefined {
    const drone = this.getDrone(droneId);
    if (!drone || !drone.codeWindows || !drone.mainWindowId) {
      return undefined;
    }
    return drone.codeWindows.get(drone.mainWindowId);
  }

  /**
   * Update drone's code
   */
  updateDroneCode(droneId: string, windowId: string, code: string): void {
    const store = useGameStore.getState();
    const drone = store.entities.get(droneId);
    
    if (!drone || !drone.codeWindows) {
      console.warn(`Cannot update code: Drone ${droneId} not found or has no code windows`);
      return;
    }

    const window = drone.codeWindows.get(windowId);
    if (!window) {
      console.warn(`Cannot update code: Window ${windowId} not found in drone ${droneId}`);
      return;
    }

    // Update the code window
    const updatedWindow = { ...window, code };
    drone.codeWindows.set(windowId, updatedWindow);

    // Update the entity in store
    store.updateEntity(droneId, { codeWindows: new Map(drone.codeWindows) });
  }

  /**
   * Set drone execution state
   */
  setDroneExecuting(droneId: string, isExecuting: boolean): void {
    const store = useGameStore.getState();
    store.updateEntity(droneId, { isExecuting });
  }

  /**
   * Clean up all drones and animations
   */
  destroy(): void {
    // Remove all drones
    const droneIds = Array.from(this.drones.keys());
    droneIds.forEach(id => this.removeDrone(id));

    this.drones.clear();
    this.hoverAnimations.clear();
  }
}

