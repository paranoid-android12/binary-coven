# Binary Coven - Repository Information

## 📋 Project Overview

**Binary Coven** is a programming game where players control a robot (Qubit) by writing Python-like code. The game combines a visual grid-based world with a full-featured code editor, allowing players to learn programming concepts through gameplay.

### Tech Stack
- **Frontend Framework**: Next.js 15.3.1 with React 19.0.0
- **Game Engine**: Phaser 3.88.2
- **State Management**: Zustand 4.4.7
- **Language**: TypeScript 5
- **Build Tool**: Next.js (with SWC compiler)

---

## 🖥️ Programming Interface

### Primary Module/Library: **Monaco Editor**

The programming interface uses **`@monaco-editor/react`** (version 4.6.0), which provides:

- **Full VS Code editing experience** with syntax highlighting
- **Python language mode** with Python-like syntax
- **Custom configuration** including:
  - Custom font: "BoldPixels"
  - Font size: 18px
  - Dark theme (`vs-dark`)
  - Line numbers enabled
  - Word wrap enabled
  - Code folding support
  - Context menu support

**Location**: `src/components/ProgrammingInterface.tsx` (lines 260-284)

```typescript
<Editor
  height="100%"
  defaultLanguage="python"
  value={selectedFunction.code}
  onChange={handleCodeChange}
  theme="vs-dark"
  options={{
    minimap: { enabled: false },
    fontSize: 18,
    fontFamily: 'BoldPixels',
    // ... more options
  }}
/>
```

### Multi-Function Support

The interface supports creating and managing multiple functions:
- **Main function**: Entry point for code execution (required)
- **User-defined functions**: Players can create custom functions that can call each other
- **Function management**: Create, delete, rename, and set main function through UI

---

## 🎮 Available In-Game Functions (Built-in Functions)

Built-in functions are registered in `src/game/systems/BuiltInFunctions.ts` and organized into categories:

### Movement Functions
| Function | Parameters | Description | Energy Cost |
|----------|-----------|-------------|-------------|
| `move_up()` | None | Move one grid space up | 5 |
| `move_down()` | None | Move one grid space down | 5 |
| `move_left()` | None | Move one grid space left | 5 |
| `move_right()` | None | Move one grid space right | 5 |
| `move_to(x, y)` | x: number, y: number | Move to specific coordinates | 5 × distance |

### Interaction Functions
| Function | Parameters | Description | Details |
|----------|-----------|-------------|---------|
| `plant(crop_type?)` | crop_type: string (optional) | Plant crops on farmland | Default: 'wheat', blocks entity |
| `harvest()` | None | Harvest ready crops | Blocks entity during harvest |
| `eat()` | None | Eat food to restore energy | Must be at food station |
| `store(item_type, amount?)` | item_type: string, amount: number | Store items in silo | Default amount: 1 |
| `get_current_grid()` | None | Get info about current tile | Returns grid type, name, functions |
| `get_position()` | None | Get current coordinates | Returns {x, y} position |
| `get_energy()` | None | Check energy levels | Returns energy/maxEnergy |
| `get_inventory()` | None | View inventory contents | Returns items and capacity |
| `can_harvest()` | None | Check if current grid can be harvested | Returns boolean |

### System Functions
| Function | Parameters | Description |
|----------|-----------|-------------|
| `wait(seconds)` | seconds: number | Pause execution for N seconds |
| `sleep(milliseconds)` | milliseconds: number | Pause execution for N milliseconds |
| `print(message)` | message: string | Print message to console |

### Utility Functions
| Function | Parameters | Description | Returns |
|----------|-----------|-------------|---------|
| `scanner(x, y)` | x: number, y: number | Scan a grid at coordinates | Grid info (type, status, functions) |
| `range(start, stop, step?)` | 1-3 numbers | Generate number sequence | Array of numbers |
| `len(iterable)` | iterable: any | Get length of string/array | Number |
| `abs(number)` | number: number | Get absolute value | Number |
| `min(...values)` | values: numbers/array | Get minimum value | Number |
| `max(...values)` | values: numbers/array | Get maximum value | Number |
| `sum(iterable)` | iterable: array | Sum all numbers in array | Number |

### Debug Functions
| Function | Parameters | Description |
|----------|-----------|-------------|
| `debug_grid_info()` | None | Show position and nearby grids |
| `debug_farmland_states()` | None | Show all farmland states |

---

## 🔤 Control Flow & Token Programs

The game implements a **full Python-like interpreter** in `src/game/systems/CodeExecutor.ts`.

### Control Flow Statements

#### 1. **Conditional Statements**
```python
# if statement
if condition:
    # code block

# if-elif-else chain
if condition1:
    # code
elif condition2:
    # code
else:
    # code
```

**Supported comparison operators**: `==`, `!=`, `<`, `>`, `<=`, `>=`  
**Logical operators**: `and`, `or`, `not`

#### 2. **Loop Statements**

**For Loop:**
```python
# Iterate over range
for i in range(5):
    # code

# Iterate over array/string
for item in items:
    # code
```

**While Loop:**
```python
while condition:
    # code
```
- Maximum 10,000 iterations to prevent infinite loops

#### 3. **Loop Control**
- **`break`**: Exit the current loop immediately
- **`continue`**: Skip to the next iteration of the loop
- **`return`**: Exit the current function

#### 4. **Comments**
```python
# This is a comment (lines starting with #)
```

---

## 🔍 What is `pass`?

### Definition
**`pass`** is a Python statement that does **nothing**. It's a **null operation** or **placeholder**.

### Purpose
`pass` is used when:
1. **Syntax requires a statement** but you don't want to execute any code
2. **Function/control structure is not yet implemented** but you want valid syntax
3. **Creating minimal/empty code blocks**

### Examples in the Codebase

**Default main function** (line 468 in `GameInterface.tsx`):
```python
def main():
    # Your code here
    pass
```

**Default user function template** (line 43 in `ProgrammingInterface.tsx`):
```python
def function_name():
    # Your code here
    pass
```

### How It Works
In the code executor (`CodeExecutor.ts`), `pass` is effectively **ignored** during execution:
- It doesn't generate any operations
- It doesn't change any state
- It simply allows the code to be syntactically valid

Think of `pass` as a "do nothing" command - a placeholder that says "code should go here eventually, but for now, just move on."

---

## 🏗️ Code Execution Architecture

### Execution Flow
1. **User writes code** in Monaco Editor
2. **Code stored** in Zustand game store (`gameStore.ts`)
3. **Run button clicked** → `GameInterface` triggers execution
4. **Scene processes** → `ProgrammingGame.ts` starts execution
5. **Code Executor** (`CodeExecutor.ts`) interprets code line-by-line
6. **Built-in functions** executed via `BuiltInFunctionRegistry`
7. **Results displayed** in game world and UI

### Key Systems

**CodeExecutor** (`src/game/systems/CodeExecutor.ts`):
- Parses Python-like syntax with indentation handling
- Manages execution state and call stack
- Handles control flow (if/else, loops, etc.)
- Evaluates expressions and manages variables
- Coordinates with BuiltInFunctions and GridSystem

**BuiltInFunctionRegistry** (`src/game/systems/BuiltInFunctions.ts`):
- Central registry of all built-in functions
- Categorizes functions by type
- Provides function lookup and execution

**GridSystem** (`src/game/systems/GridSystem.ts`):
- Manages grid tiles and their functions
- Handles grid-specific actions (plant, harvest, etc.)

---

## 📦 Variable System

### Supported Data Types
- **Numbers**: `x = 5`, `speed = 2.5`
- **Strings**: `name = "Qubit"`, `crop = 'wheat'`
- **Booleans**: `True`, `False`
- **Arrays**: `items = [1, 2, 3]` (from range() or manual creation)
- **None/null**: `value = None`

### Variable Scope
- **Function-local**: Variables defined in a function are scoped to that function
- **Global variables**: Accessible across execution context

### Expression Evaluation
Supports:
- **Arithmetic**: `+`, `-`, `*`, `/`
- **Comparisons**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `and`, `or`, `not`
- **Function calls**: `range(5)`, `len(items)`, etc.

---

## 🎯 Programming Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| **Variables** | ✅ Full | All basic types supported |
| **Functions** | ✅ Full | User-defined + built-in |
| **If/Else** | ✅ Full | Including elif chains |
| **For Loops** | ✅ Full | Supports range() and iterables |
| **While Loops** | ✅ Full | Max 10,000 iterations |
| **Break/Continue** | ✅ Full | Loop control |
| **Return** | ✅ Full | Function returns |
| **Pass** | ✅ Full | No-op placeholder |
| **Comments** | ✅ Full | # syntax |
| **Arrays** | ✅ Partial | Via range() and function returns |
| **String Operations** | ✅ Basic | String literals and len() |
| **Math Operations** | ✅ Full | +, -, *, /, abs(), min(), max() |
| **Indentation-based** | ✅ Full | 4-space Python-style blocks |

---

## 📚 Example Code

### Basic Movement and Interaction
```python
def main():
    print("Starting farming routine")
    
    # Move to farmland
    move_to(5, 5)
    
    # Plant crops
    if not can_harvest():
        plant("wheat")
        print("Planted wheat")
    
    # Move to food station to restore energy
    move_to(10, 10)
    eat()
    
    print("Routine complete")
```

### Advanced Loop Example
```python
def harvest_all_fields():
    """Harvest a 3x3 grid of farmlands"""
    for x in range(5, 8):
        for y in range(5, 8):
            move_to(x, y)
            if can_harvest():
                harvest()
                print(f"Harvested at ({x}, {y})")
            else:
                print(f"Nothing to harvest at ({x}, {y})")

def main():
    harvest_all_fields()
```

### Using Utility Functions
```python
def scan_and_report():
    """Scan all grids and report status"""
    positions = [
        [8, 6],
        [12, 6],
        [16, 6]
    ]
    
    for pos in positions:
        x = pos[0]
        y = pos[1]
        result = scanner(x, y)
        print(f"Grid at ({x}, {y}): {result}")

def main():
    scan_and_report()
```

---

## 🎮 Game Systems

### Grid Types
- **Farmland**: Plant and harvest crops
- **Food Station**: Restore energy
- **Silo**: Store harvested items

### Entity System
Players control entities (Qubit) with stats:
- **Walking Speed**: Movement speed multiplier
- **Energy**: Required for actions (100 max by default)
- **Max Energy**: Can be upgraded
- **Harvest Amount**: Amount harvested per action
- **Planting Speed**: Speed multiplier for planting

### Resource System
- **Wheat**: Primary currency for upgrades
- Stored in global resources pool
- Used for entity upgrades (speed, energy, harvest amount)

---

## 🔧 Development Notes

### Adding New Built-in Functions
Register in `BuiltInFunctionRegistry`:
```typescript
{
  name: 'new_function',
  description: 'Description',
  category: 'utility',
  parameters: [...],
  execute: async (context, ...params) => {
    // Implementation
    return { success: true, message: 'Done' };
  }
}
```

### File Structure
```
src/
├── components/          # React UI components
│   ├── ProgrammingInterface.tsx  # Monaco editor wrapper
│   ├── GameInterface.tsx         # Main game UI
│   └── StatusModal.tsx          # Entity/grid info modal
├── game/
│   ├── scenes/         # Phaser game scenes
│   │   └── ProgrammingGame.ts   # Main game scene
│   └── systems/        # Game systems
│       ├── CodeExecutor.ts      # Code interpreter
│       ├── BuiltInFunctions.ts  # Function registry
│       ├── GridSystem.ts        # Grid management
│       └── TaskManager.ts       # Task/progress system
├── stores/
│   └── gameStore.ts    # Zustand state management
└── types/
    └── game.ts         # TypeScript type definitions
```

---

## 📄 License

MIT License

---

**Happy Coding!** 🚀

