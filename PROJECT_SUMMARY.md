# Binary Coven - Project Summary

> **A Block-Based Programming Game for Learning to Code**

---

## 📖 Overview

Binary Coven is an innovative educational game where players control a robot called **"Qubit"** by writing actual Python-like code. Built with **PhaserJS**, **Next.js**, and **React**, it combines visual game mechanics with real programming concepts to teach coding fundamentals in an engaging way.

---

## 🎮 Game Concept

### Core Gameplay
- **Grid-Based World**: Navigate a tile-based environment
- **Code-Driven Control**: Write functions to control your robot
- **Resource Management**: Manage energy, Bitcoin, and currency systems
- **Quest System**: Complete missions to learn programming concepts progressively

### In-Game Activities
| Activity | Description |
|----------|-------------|
| ⛏️ Mining Bitcoins | Use mining terminals with `mine_initiate()` and `collect()` |
| ⚡ Energy Generation | Crank dynamos with `crank()` to generate power |
| 💾 Storage | Store resources in wallets using `store(amount)` |
| 🤖 Programming | Write multi-function programs that call each other |

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19 + Next.js 15 |
| **Game Engine** | Phaser.js 3 |
| **Code Editor** | Monaco Editor (VS Code) |
| **State Management** | Zustand |
| **Backend/Auth** | Supabase |
| **Styling** | Tailwind CSS 4 |
| **Language** | TypeScript |

---

## 📁 Project Structure

```
binary-coven/
├── src/
│   ├── components/          # React UI components
│   │   ├── CodeWindow.tsx       # Draggable code editor windows
│   │   ├── GameInterface.tsx    # Main game interface
│   │   ├── QuestModal.tsx       # Quest display UI
│   │   └── admin/               # Admin dashboard components
│   │
│   ├── game/
│   │   ├── scenes/              # Phaser game scenes
│   │   │   ├── Boot.ts              # Initial loading
│   │   │   ├── Preloader.ts         # Asset preloading
│   │   │   ├── MainMenu.ts          # Main menu
│   │   │   ├── Game.ts              # Core game scene
│   │   │   └── ProgrammingGame.ts   # Main programming game
│   │   │
│   │   └── systems/             # Game systems
│   │       ├── GridSystem.ts        # Grid management
│   │       ├── CodeExecutor.ts      # Code interpretation
│   │       ├── QuestManager.ts      # Quest lifecycle
│   │       ├── DialogueManager.ts   # NPC dialogues
│   │       ├── DroneManager.ts      # Drone entities
│   │       └── BuiltInFunctions.ts  # Built-in code functions
│   │
│   ├── stores/
│   │   └── gameStore.ts         # Zustand state management
│   │
│   ├── pages/
│   │   ├── index.tsx            # Student game interface
│   │   ├── student-login.tsx    # Student login page
│   │   ├── admin/               # Admin dashboard pages
│   │   └── api/                 # API routes
│   │
│   ├── services/
│   │   ├── gameStateService.ts  # Game state persistence
│   │   └── analyticsService.ts  # Progress analytics
│   │
│   └── types/                   # TypeScript definitions
│
├── public/
│   ├── quests/                  # Quest JSON files
│   ├── tilesets/                # Game tile assets
│   └── map/                     # Map data
│
├── supabase/                    # Database setup & migrations
└── docs/                        # Documentation
```

---

## 🎓 Learning Management System (LMS)

Binary Coven includes a full-featured LMS for educational use:

### Dual-View Architecture
| View | URL | Purpose |
|------|-----|---------|
| **Student** | `binarycoven.xxx` | Main game interface |
| **Admin** | `admin.binarycoven.xxx` | Teacher dashboard |

### LMS Features
- **Session Codes**: Teachers generate time-limited codes for students
- **Progress Tracking**: Quest completion, code execution history
- **Analytics**: Time spent per quest/objective
- **Persistent Saves**: Complete game state stored in database

---

## 🔧 Built-in Programming Functions

### Movement
```python
move_up()           # Move one tile up
move_down()         # Move one tile down
move_left()         # Move one tile left
move_right()        # Move one tile right
move_to(x, y)       # Move to specific coordinates
```

### Utility
```python
get_position()      # Get current (x, y) coordinates
get_energy()        # Check energy levels
get_inventory()     # View inventory contents
get_current_grid()  # Get info about current tile
wait(seconds)       # Pause execution
print(message)      # Debug output
```

### Grid-Specific
```python
# Mining Terminal
mine_initiate()     # Start mining (5 sec, -10 energy)
collect()           # Collect mined bitcoins (-5 energy)

# Energy Dynamo
crank()             # Generate 10 energy (10 sec, -5 energy)

# Storage Wallet
store(amount)       # Store bitcoins as currency (-2 energy)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- **npm** or **yarn**

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd binary-coven

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# Navigate to http://localhost:8080
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 8080 |
| `npm run build` | Build for production |
| `npm run dev-nolog` | Dev server without logging |
| `npm run start` | Serve built dist folder |
| `npm run generate:tilesets` | Generate tileset configurations |

---

## 📜 Quest System

### Quest Architecture
```
┌─────────────────────────────────────────┐
│  UI Layer (React Components)             │
│  QuestModal.tsx - Quest list/details     │
└────────────────┬────────────────────────┘
                 │ (via GameStore)
┌────────────────▼────────────────────────┐
│  State Management (Zustand)              │
│  gameStore.ts - Central game state       │
└────────────────┬────────────────────────┘
                 │ (delegates to)
┌────────────────▼────────────────────────┐
│  Business Logic (Singletons)             │
│  QuestManager.ts - Quest lifecycle       │
│  DialogueManager.ts - Objective checking │
│  EventBus - Event broadcasting           │
└─────────────────────────────────────────┘
```

### Quest Features
- **Phase-based Progression**: Multi-step quests with phases
- **Objective Tracking**: Track completion of individual objectives
- **Prerequisites**: Unlock quests based on completed requirements
- **Rewards System**: Grant resources, functions, or unlock new quests

---

## 🔌 API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/student-login` | POST | Student registration/login |

### Game State
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/game-state` | GET/POST | Save/load game progress |

### Admin
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/sessions` | CRUD | Manage session codes |
| `/api/admin/students` | GET | View student progress |
| `/api/admin/analytics` | GET | View learning analytics |

---

## 🎯 Extensibility

### Adding New Grid Types
```typescript
GridTypeRegistry.registerGridType({
  type: 'new_machine',
  name: 'New Machine',
  description: 'A custom machine',
  defaultProperties: { /* ... */ },
  functions: [{
    name: 'custom_function',
    description: 'Does something custom',
    parameters: []
  }],
  spriteKey: 'new_machine_sprite',
  energyRequired: 15
});
```

### Adding New Built-in Functions
```typescript
BuiltInFunctionRegistry.registerFunction({
  name: 'new_function',
  description: 'A new built-in function',
  category: 'utility',
  parameters: [],
  execute: async (context) => {
    return { success: true, message: 'Function executed' };
  }
});
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | General overview |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Complete API documentation |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Admin dashboard guide |
| [QUEST_SYSTEM_TECHNICAL_GUIDE.md](QUEST_SYSTEM_TECHNICAL_GUIDE.md) | Quest system details |
| [LMS_IMPLEMENTATION_GUIDE.md](LMS_IMPLEMENTATION_GUIDE.md) | LMS implementation details |

---

## 🔮 Future Enhancements

- [ ] Advanced Python features (loops, conditionals, variables)
- [ ] Multiplayer support
- [ ] Level editor
- [ ] Achievement system
- [ ] Visual debugger with step-through execution
- [ ] Code sharing and import features
- [ ] Performance metrics and code efficiency scoring

---

## 📄 License

This project is licensed under the **MIT License**.

---

**Happy Coding! 🎮✨**
