# Binary Coven - Block-Based Programming Game

A innovative block-based programming game where you control a robot (qubit) by writing Python-like code. Built with **PhaserJS**, **NextJS**, and **React**.

## 🎮 Game Overview

In Binary Coven, you control a robot called "Qubit" by writing actual code in a Python-like syntax. The game features a grid-based world where you can:

- **Mine Bitcoins** using mining terminals
- **Generate Energy** with dynamos
- **Store Resources** in wallets
- **Program Multiple Functions** that can call each other
- **Control Character Stats** like walking speed and energy

## 🏗️ Architecture & Features

### ✨ Core Features

- **Visual Code Editor**: Multiple draggable code windows with syntax highlighting
- **Grid-Based World**: Tile-based movement and interaction system
- **Real-time Execution**: Watch your code come to life as the qubit executes it
- **Extensible Design**: Easy to add new grids, functions, and entities
- **Resource Management**: Energy, Bitcoin, and currency systems
- **Inventory System**: Store and manage items

### 🔧 Technical Architecture

- **Frontend**: React + NextJS with TypeScript
- **Game Engine**: PhaserJS for 2D game rendering
- **State Management**: Zustand for game state
- **Code Editor**: Monaco Editor (VS Code editor)
- **Modular Systems**: Extensible grid, entity, and function systems

## 🎯 Grid Types & Functions

### Bitcoin Mining Terminal
- `mine_initiate()` - Start mining (takes 5 seconds, costs 10 energy)
- `collect()` - Collect mined bitcoins (costs 5 energy)

### Energy Dynamo
- `crank()` - Generate 10 energy points (takes 10 seconds, costs 5 energy)

### Storage Wallet
- `store(amount)` - Store bitcoins as spendable currency (costs 2 energy)

## 🎮 Built-in Functions

### Movement Functions
- `move_up()`, `move_down()`, `move_left()`, `move_right()`
- `move_to(x, y)` - Move to specific coordinates

### Utility Functions
- `get_current_grid()` - Get info about current tile
- `get_position()` - Get current coordinates
- `get_energy()` - Check energy levels
- `get_inventory()` - View inventory
- `wait(seconds)` - Pause execution
- `print(message)` - Debug output

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd binary-coven
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to `http://localhost:8080`

### Basic Usage

1. **Write Code**: Use the main function window to write your code
2. **Create Functions**: Click "+ New Function" to create additional functions
3. **Run Code**: Click the "▶ Run" button to execute your program
4. **Control Qubit**: Watch as your code controls the qubit in real-time

### Example Code

```python
# Main function - execution starts here
def main():
    print("Testing move_to function...")
    
    # Print starting position
    start_pos = get_position()
    print(f"Starting position: {start_pos}")
    
    # Test move_to function
    print("Moving to (3, 3)...")
    move_to(3, 3)
    
    # Verify new position
    new_pos = get_position()
    print(f"New position: {new_pos}")
    
    # Move to mining terminal and test
    mine_initiate()
    wait(5)
    collect()
    
    # Move to wallet and store
    move_to(9, 3)
    store(1)
    
    print("Move test complete!")

# Helper function example
def go_to_dynamo():
    move_to(6, 3)
    crank()
```

## 🏗️ Project Structure

```
src/
├── components/           # React UI components
│   ├── CodeWindow.tsx   # Draggable code editor windows
│   └── GameInterface.tsx # Main game interface
├── game/
│   ├── scenes/          # Phaser game scenes
│   │   └── ProgrammingGame.ts # Main game scene
│   └── systems/         # Game systems
│       ├── GridSystem.ts      # Grid management
│       ├── BuiltInFunctions.ts # Built-in functions
│       └── CodeExecutor.ts    # Code interpretation
├── stores/
│   └── gameStore.ts     # Zustand state management
├── types/
│   └── game.ts          # TypeScript type definitions
└── App.tsx              # Main React app
```

## 🔄 Extensibility

The game is designed to be highly extensible:

### Adding New Grid Types

```typescript
// Register a new grid type
GridTypeRegistry.registerGridType({
  type: 'new_machine',
  name: 'New Machine',
  description: 'A custom machine',
  defaultProperties: { /* ... */ },
  defaultState: { /* ... */ },
  functions: [
    {
      name: 'custom_function',
      description: 'Does something custom',
      parameters: []
    }
  ],
  spriteKey: 'new_machine_sprite',
  energyRequired: 15
});
```

### Adding New Built-in Functions

```typescript
// Register a new built-in function
BuiltInFunctionRegistry.registerFunction({
  name: 'new_function',
  description: 'A new built-in function',
  category: 'utility',
  parameters: [],
  execute: async (context) => {
    // Implementation
    return { success: true, message: 'Function executed' };
  }
});
```

### Adding New Entity Types

```typescript
// Create new entity via game store
const entityId = gameStore.addEntity({
  name: 'New Bot',
  type: 'advanced_bot',
  position: { x: 10, y: 10 },
  stats: {
    walkingSpeed: 2.0,
    energy: 150,
    maxEnergy: 150,
    // Custom stats
    processingPower: 100
  },
  inventory: { items: [], capacity: 20 },
  isActive: true
});
```

## 🎛️ Controls

- **Arrow Keys**: Manual movement (for testing)
- **Mouse**: Drag code windows, resize, click buttons
- **Code Editor**: Full VS Code-like editing experience

## 🐛 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run dev-nolog` - Development without logging

### Key Dependencies

- **Phaser**: 2D game engine
- **NextJS**: React framework
- **Monaco Editor**: Code editor
- **Zustand**: State management
- **TypeScript**: Type safety

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add new grids, functions, or features
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🎯 Future Enhancements

- **Advanced Python Features**: Loops, conditionals, variables
- **Multiplayer Support**: Multiple programmable entities
- **Level Editor**: Create custom worlds
- **Achievement System**: Programming challenges
- **Advanced Grids**: More complex machines and interactions
- **Visual Debugger**: Step-through code execution
- **Code Sharing**: Share and import functions
- **Performance Metrics**: Code efficiency scoring

---

**Happy Coding! 🚀**
