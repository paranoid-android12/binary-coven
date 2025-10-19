# Programmable Drone Entity System

## Overview

The drone system extends the existing NPC framework to support fully programmable, autonomous entities that can execute code independently from the player. Drones have access to **all programming functions** available to the player (Qubit) and operate with their own execution contexts, code windows, and inventory systems.

## Architecture

### Core Components

1. **DroneManager** (`src/game/systems/DroneManager.ts`)
   - Manages drone lifecycle (creation, removal, updates)
   - Handles drone sprites and animations
   - Manages hover animations for visual feedback
   - Provides click interaction support

2. **Extended Entity Type** (`src/types/game.ts`)
   - Added drone-specific properties to Entity interface
   - New `DroneConfig` and `Drone` interfaces
   - Supports per-entity code windows

3. **GameStore Updates** (`src/stores/gameStore.ts`)
   - Added `activeDroneId` for tracking selected drone
   - Added `droneExecutors` map for per-drone code execution
   - New methods: `setActiveDrone`, `getDroneCodeWindows`, `updateDroneCodeWindow`, `addDroneCodeWindow`, `removeDroneCodeWindow`

4. **ProgrammingGame Scene** (`src/game/scenes/ProgrammingGame.ts`)
   - Integrated DroneManager
   - Added drone execution methods: `startDroneExecution`, `stopDroneExecution`, `stopAllDroneExecution`
   - Separate CodeExecutor instances for each drone

5. **UI Components**
   - **GameInterface**: Handles drone click events and execution state tracking
   - **ProgrammingInterface**: Updated to support both player and drone code editing
   - **StatusModal**: Works seamlessly with drones (opens programming interface)

## Key Features

### 1. Independent Execution
- Each drone has its own CodeExecutor instance
- Drones execute autonomously (no player control during execution)
- Multiple drones can execute simultaneously
- Separate execution contexts prevent state conflicts

### 2. Full Programming Capability
Drones have access to ALL player functions:
- **Movement**: `move_up()`, `move_down()`, `move_left()`, `move_right()`, `move_to(x, y)`
- **Actions**: `plant()`, `harvest()`, `eat()`, `store()`
- **Utility**: `scanner(x, y)`, `get_position()`, `get_energy()`, `get_inventory()`
- **System**: `wait()`, `sleep()`, `print()`
- **And any other functions available to the player**

### 3. Separate Code Windows
- Each drone has its own independent code windows
- Main function + custom functions
- Code is stored per-drone in entity state
- Preset templates available

### 4. Independent Inventory
- Each drone has its own inventory system
- Separate capacity and items from player
- Can collect, store, and use items independently

### 5. Visual Feedback
- Hover animations on mouse-over
- Click interaction to open programming interface
- Distinct placeholder sprite (blue with triangle)
- Execution state tracking in UI

## Usage

### Creating a Drone

In `ProgrammingGame.ts` or any scene:

```typescript
this.createDrone({
  id: 'drone_alpha',
  name: 'Alpha Drone',
  position: { x: 18, y: 8 },
  spriteKey: 'drone',  // Or custom sprite key
  scale: 1.5,
  showHoverAnimation: true,
  stats: {
    walkingSpeed: 3.0,
    energy: 100,
    maxEnergy: 100,
    harvestAmount: 1,
    plantingSpeedMultiplier: 1.0
  }
});
```

### Programming a Drone

1. **Click on the drone** in the game world
2. The Status Modal opens showing the drone's profile
3. Click the **"Program"** tab
4. Write code in the code editor (Monaco Editor)
5. Code is automatically saved to the drone's code windows

### Running Drone Code

**Via UI:**
- Open the drone's programming interface
- Add a play button to the StatusModal or GameInterface
- Call `handleRunDroneCode(droneId)`

**Via Code:**
```typescript
const scene = phaserRef.current?.scene as ProgrammingGame;
scene.startDroneExecution('drone_alpha');
```

### Stopping Drone Execution

```typescript
const scene = phaserRef.current?.scene as ProgrammingGame;
scene.stopDroneExecution('drone_alpha');
// Or stop all drones
scene.stopAllDroneExecution();
```

## Example Drone Code

```python
# Drone main function
def main():
    # Move in a patrol pattern
    for i in range(5):
        move_right()
        move_down()
        move_left()
        move_up()
        
    # Harvest crops if ready
    move_to(12, 12)
    if can_harvest():
        harvest()
```

## Events

### Drone Events (EventBus)

- `drone-clicked` - Fired when a drone is clicked
  ```typescript
  EventBus.on('drone-clicked', (drone: Entity) => { ... });
  ```

- `drone-execution-started` - Fired when drone starts executing
  ```typescript
  EventBus.on('drone-execution-started', (data: { droneId: string }) => { ... });
  ```

- `drone-execution-completed` - Fired when drone completes execution successfully
  ```typescript
  EventBus.on('drone-execution-completed', (data: { droneId: string; result: any }) => { ... });
  ```

- `drone-execution-failed` - Fired when drone execution fails
  ```typescript
  EventBus.on('drone-execution-failed', (data: { droneId: string; error: string }) => { ... });
  ```

- `drone-execution-stopped` - Fired when drone execution is manually stopped
  ```typescript
  EventBus.on('drone-execution-stopped', (data: { droneId: string }) => { ... });
  ```

## Technical Details

### Execution Context

Each drone gets its own execution context:
```typescript
{
  entity: drone,  // The drone entity with its own state
  availableFunctions: BuiltInFunctionRegistry.createFunctionMap(),  // All functions
  globalVariables: {},  // Drone's own variables
  isRunning: true,
  currentGrid: gameState.getGridAt(drone.position)
}
```

### State Management

Drone state is tracked in multiple places:
- **Entity in GameStore**: Core drone data, stats, inventory
- **codeWindows Map**: Drone's code windows (stored in entity)
- **droneExecutors Map**: Active CodeExecutor instances
- **droneExecutionStates**: UI state for execution tracking

### Sprite Management

Drones use the same sprite system as NPCs:
- Custom sprites can be loaded via `spriteKey`
- Fallback placeholder sprite (blue with triangle)
- Hover animations via GridHoverAnimation
- Interactive click handlers

## Best Practices

1. **Unique IDs**: Always use unique IDs for each drone
2. **Resource Management**: Monitor drone energy and inventory
3. **Error Handling**: Listen to execution-failed events
4. **Performance**: Limit the number of simultaneously executing drones
5. **Code Safety**: Implement timeouts and max iterations in drone code
6. **State Consistency**: Always use GameStore for state updates

## Extending the System

### Adding Custom Drone Types

1. Create a new sprite/animation for the drone type
2. Extend `DroneConfig` with type-specific properties
3. Add conditional logic in DroneManager for different behaviors
4. Create factory functions for common drone configurations

### Adding Drone-Specific Functions

1. Add functions to `BuiltInFunctionRegistry` (they're automatically available)
2. Or create drone-specific function sets
3. Filter functions in CodeExecutor based on entity type

### Adding UI Controls

Example: Add a play button for drones in GameInterface:

```tsx
{/* Drone Control Panel */}
{activeDroneId && entities.get(activeDroneId) && (
  <div style={{ position: 'fixed', bottom: '20px', right: '20px' }}>
    <SpriteButton
      position={{ x: 0, y: 0 }}
      backgroundSprite="button.png"
      upFrame={{ x: 176, y: 16, w: 16, h: 16 }}
      downFrame={{ x: 176, y: 32, w: 16, h: 16 }}
      scale={4}
      onClick={() => handleRunDroneCode(activeDroneId)}
    />
    <div>{entities.get(activeDroneId)?.name}</div>
    <div>Energy: {entities.get(activeDroneId)?.stats.energy}</div>
  </div>
)}
```

## Testing

A test drone "Alpha Drone" is automatically spawned at position (18, 8) when the game starts. You can:

1. Click on it to open the programming interface
2. Write code in the editor
3. Add execution controls to the UI
4. Test all programming functions

## Future Enhancements

Potential improvements:
- Drone-to-drone communication
- Formation movement
- Specialized drone types (harvester, builder, scout)
- Drone AI behaviors
- Drone upgrades and customization
- Visual programming for drones
- Drone squadrons with shared objectives

## Troubleshooting

### Drone Not Appearing
- Check if sprite key exists
- Verify position is within grid bounds
- Check console for DroneManager logs

### Code Not Executing
- Verify main function exists
- Check for syntax errors in code
- Monitor execution events in console
- Ensure drone is not blocked by tasks

### Execution State Not Updating
- Check event listeners are properly set up
- Verify GameInterface is receiving events
- Check droneExecutionStates map updates

## Summary

The Programmable Drone System provides a scalable, developer-friendly framework for creating autonomous entities that can be programmed and controlled independently. The system fully integrates with existing game systems while maintaining clean separation of concerns and following best practices for state management and code organization.

