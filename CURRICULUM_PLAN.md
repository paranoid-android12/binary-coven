# Binary Coven - 6×5 Curriculum Plan

## 📊 Current Status vs. Required

| Topic | Current Quests | Needed | Gap |
|-------|---------------|--------|-----|
| **1. Basic Commands & Sequences** | 4 | 5 | +1 |
| **2. Variables & Data Types** | 0 | 5 | +5 |
| **3. Conditionals** | 0 | 5 | +5 |
| **4. Loops** | 1 | 5 | +4 |
| **5. Functions** | 1 | 5 | +4 |
| **6. Lists/Arrays** | 0 | 5 | +5 |
| **TOTAL** | 6 | 30 | **+24** |

---

## 🎓 6 Core Topics

These topics cover a complete introduction to programming:

1. **Basic Commands & Sequences** - Introduction, movement, sequential execution
2. **Variables & Data Types** - Foundation of storing and manipulating data
3. **Conditionals** - Decision making and control flow
4. **Loops** - Repetition and iteration
5. **Functions** - Code organization and reusability
6. **Lists/Arrays** - Data structures and collections

---

## 🎯 Complete Curriculum Structure

### Topic 1: Basic Commands & Sequences
*Learn to give step-by-step instructions*

| Quest | Title | Concepts | Status |
|-------|-------|----------|--------|
| 1.1 | Welcome to the Farm | Manual movement (arrows) | ✅ EXISTS (`game_intro`) |
| 1.2 | First Harvest | Manual buttons, farming cycle | ✅ EXISTS (`first_harvest`) |
| 1.3 | Automating Movement | Code terminal, `def main()` | ✅ EXISTS (`auto_movement`) |
| 1.4 | Farming Scripts | `plant()`, `sleep()`, `harvest()` | ✅ EXISTS (`farming_scripts`) |
| 1.5 | Sequence Challenge | Combine all commands in order | 🆕 **TO CREATE** |

---

### Topic 2: Variables & Data Types
*Learn to store, update, and use data in your programs*

| Quest | Title | Concepts | Status |
|-------|-------|----------|--------|
| 2.1 | The Memory Stone | Variables, assignment (`=`) | 🆕 **TO CREATE** |
| 2.2 | Counting Crops | Number variables, integers | 🆕 **TO CREATE** |
| 2.3 | Naming Things | String variables, text data | 🆕 **TO CREATE** |
| 2.4 | True or False | Boolean variables, `True`/`False` | 🆕 **TO CREATE** |
| 2.5 | Variables Challenge | Combine all data types | 🆕 **TO CREATE** |

---

### Topic 3: Conditionals (Decisions)
*Make your program decide based on conditions*

| Quest | Title | Concepts | Status |
|-------|-------|----------|--------|
| 3.1 | The Crossroads | `if` statements, basic conditions | 🆕 **TO CREATE** |
| 3.2 | Either Or | `if/else` branches | 🆕 **TO CREATE** |
| 3.3 | Multiple Paths | `elif` chains | 🆕 **TO CREATE** |
| 3.4 | Complex Decisions | `and`, `or`, comparison operators | 🆕 **TO CREATE** |
| 3.5 | Conditionals Challenge | Smart decision making | 🆕 **TO CREATE** |

---

### Topic 4: Loops (Repetition)
*Repeat actions efficiently without writing redundant code*

| Quest | Title | Concepts | Status |
|-------|-------|----------|--------|
| 4.1 | The Field of Repetition | `for` loops, `range()` | ✅ EXISTS (`farming_loops`) |
| 4.2 | Loop the Farm | Move in patterns using loops | 🆕 **TO CREATE** |
| 4.3 | Mass Planting | Combine loops with actions | 🆕 **TO CREATE** |
| 4.4 | While You Wait | `while` loops, conditions | 🆕 **TO CREATE** |
| 4.5 | Loops Challenge | Complex automation with loops | 🆕 **TO CREATE** |

---

### Topic 5: Functions
*Create reusable blocks of code*

| Quest | Title | Concepts | Status |
|-------|-------|----------|--------|
| 5.1 | The Art of Functions | `def`, function calls | ✅ EXISTS (`functions_intro`) |
| 5.2 | Helper Functions | Create reusable movement functions | 🆕 **TO CREATE** |
| 5.3 | Functions with Parameters | `def func(param):`, arguments | 🆕 **TO CREATE** |
| 5.4 | Return Values | `return` statement, output | 🆕 **TO CREATE** |
| 5.5 | Functions Challenge | Build a function library | 🆕 **TO CREATE** |

---

### Topic 6: Lists/Arrays
*Work with collections of data*

| Quest | Title | Concepts | Status |
|-------|-------|----------|--------|
| 6.1 | The Collection | Creating lists `[]`, basics | 🆕 **TO CREATE** |
| 6.2 | Finding Items | Indexing `list[0]`, accessing | 🆕 **TO CREATE** |
| 6.3 | Growing Lists | `append()`, modifying lists | 🆕 **TO CREATE** |
| 6.4 | Loop Through Lists | Iterating with `for item in list:` | 🆕 **TO CREATE** |
| 6.5 | Lists Challenge | Inventory management system | 🆕 **TO CREATE** |

---

## 📝 Detailed Quest Specifications

### Topic 1: Basic Commands & Sequences (5 quests)

#### Quest 1.1: Welcome to the Farm (EXISTS)
```
File: game_intro.json (EXISTS)
ID: game_intro
Prerequisites: [] (entry point)
Concepts: movement, manual_controls

Status: ✅ EXISTS - Teaches arrow key movement, introduces characters
```

#### Quest 1.2: First Harvest (EXISTS)
```
File: first_harvest.json (EXISTS)
ID: first_harvest
Prerequisites: [game_intro]
Concepts: planting, harvesting, manual_buttons

Status: ✅ EXISTS - Teaches Plant/Harvest buttons, farming cycle
```

#### Quest 1.3: Automating Movement (EXISTS)
```
File: auto_movement.json (EXISTS)
ID: auto_movement
Prerequisites: [first_harvest]
Concepts: programming, code_terminal, functions, movement_commands

Status: ✅ EXISTS - Teaches def main(), movement functions, indentation
```

#### Quest 1.4: Farming Scripts (EXISTS)
```
File: farming_scripts.json (EXISTS)
ID: farming_scripts
Prerequisites: [auto_movement]
Concepts: plant_function, harvest_function, sleep_function

Status: ✅ EXISTS - Teaches plant(), sleep(), harvest() functions
```

#### Quest 1.5: Sequence Challenge
```
File: sequence_challenge.json
ID: sequence_challenge
Prerequisites: [farming_scripts]
Concepts: sequential_execution, command_order, combining_commands

Objectives:
- Phase 1: Review all learned commands
- Phase 2: Navigate to specific coordinates
- Phase 3: Plant crops in exact positions (3 crops)
- Phase 4: Wait and harvest in correct order
- Phase 5: Complete full farming sequence
```

---

### Topic 2: Variables & Data Types (5 quests)

#### Quest 2.1: The Memory Stone
```
File: variables_intro.json
ID: variables_intro
Prerequisites: [] (entry point for Variables topic)
Concepts: variables, assignment, storing_values

Objectives:
- Phase 1: Learn what variables are (storing values)
- Phase 2: Create first variable: crop_count = 0
- Phase 3: Update variable: crop_count = crop_count + 1
- Phase 4: Use variable in print(): print(crop_count)
- Phase 5: Execute and see the result
```

#### Quest 2.2: Counting Crops
```
File: number_variables.json
ID: number_variables
Prerequisites: [variables_intro]
Concepts: integers, arithmetic, math_operations

Objectives:
- Phase 1: Create number variable: wheat = 10
- Phase 2: Arithmetic operations: total = wheat + 5
- Phase 3: Subtraction: remaining = total - 3
- Phase 4: Multiplication/Division concepts
- Phase 5: Calculate total harvest value
```

#### Quest 2.3: Naming Things
```
File: string_variables.json
ID: string_variables
Prerequisites: [number_variables]
Concepts: strings, text, quotes

Objectives:
- Phase 1: Create string variable: crop_type = "wheat"
- Phase 2: String with quotes (single vs double)
- Phase 3: Concatenation: message = "Growing " + crop_type
- Phase 4: Use strings in print()
- Phase 5: Combine strings and numbers
```

#### Quest 2.4: True or False
```
File: boolean_variables.json
ID: boolean_variables
Prerequisites: [string_variables]
Concepts: booleans, true_false, logic

Objectives:
- Phase 1: Boolean values: is_ready = True
- Phase 2: False values: is_empty = False
- Phase 3: Boolean from comparison: has_crops = crop_count > 0
- Phase 4: Use booleans in conditions (preview)
- Phase 5: Toggle boolean values
```

#### Quest 2.5: Variables Challenge
```
File: variables_challenge.json
ID: variables_challenge
Prerequisites: [boolean_variables]
Concepts: variables_mastery, all_types

Objectives:
- Phase 1: Create farming inventory with all types
- Phase 2: Track wheat count (number)
- Phase 3: Store crop name (string)
- Phase 4: Check if ready to harvest (boolean)
- Phase 5: Complete farming automation with variables
```

---

### Topic 3: Conditionals (5 quests)

#### Quest 3.1: The Crossroads
```
File: conditionals_intro.json
ID: conditionals_intro
Prerequisites: [] (entry point for Conditionals topic)
Concepts: if_statement, conditions, comparison

Objectives:
- Phase 1: Learn if statement syntax
- Phase 2: Write: if energy > 10:
- Phase 3: Add action inside if block (indented)
- Phase 4: Test with different energy values
- Phase 5: Execute conditional code
```

#### Quest 3.2: Either Or
```
File: if_else.json
ID: if_else
Prerequisites: [conditionals_intro]
Concepts: if_else, branching, two_paths

Objectives:
- Phase 1: Add else clause to if
- Phase 2: Write: else: (with action)
- Phase 3: Code runs one path or the other
- Phase 4: if crop_ready: harvest() else: wait()
- Phase 5: Test both branches
```

#### Quest 3.3: Multiple Paths
```
File: elif_chains.json
ID: elif_chains
Prerequisites: [if_else]
Concepts: elif, multiple_conditions, chains

Objectives:
- Phase 1: Learn elif keyword
- Phase 2: Chain: if/elif/else
- Phase 3: Check multiple crop types
- Phase 4: Handle 3+ different cases
- Phase 5: Create crop selection logic
```

#### Quest 3.4: Complex Decisions
```
File: complex_conditions.json
ID: complex_conditions
Prerequisites: [elif_chains]
Concepts: and_or, comparison_operators, compound

Objectives:
- Phase 1: Combine with 'and': if sunny and warm:
- Phase 2: Use 'or': if rain or cold:
- Phase 3: Comparison operators: ==, !=, <, >, <=, >=
- Phase 4: Compound conditions: if count >= 5 and ready:
- Phase 5: Build smart harvest decision
```

#### Quest 3.5: Conditionals Challenge
```
File: conditionals_challenge.json
ID: conditionals_challenge
Prerequisites: [complex_conditions]
Concepts: conditionals_mastery, decision_making

Objectives:
- Phase 1: Check energy before action
- Phase 2: Check inventory capacity
- Phase 3: Weather-based farming decisions
- Phase 4: Optimal crop selection logic
- Phase 5: Complete smart farming system
```

---

### Topic 4: Loops (5 quests)

#### Quest 4.1: The Field of Repetition
```
File: farming_loops.json (EXISTS)
ID: farming_loops
Prerequisites: [] (entry point for Loops topic)
Concepts: for_loop, range, iteration

Status: ✅ EXISTS - teaches for i in range(n):
```

#### Quest 4.2: Loop the Farm
```
File: loop_movement.json
ID: loop_movement
Prerequisites: [farming_loops]
Concepts: loop_patterns, movement_loops

Objectives:
- Phase 1: Move in a line using loop
- Phase 2: for i in range(4): move_right()
- Phase 3: Create a square pattern
- Phase 4: Move around field perimeter
- Phase 5: Execute movement loop
```

#### Quest 4.3: Mass Planting
```
File: loop_actions.json
ID: loop_actions
Prerequisites: [loop_movement]
Concepts: loops_with_actions, bulk_operations

Objectives:
- Phase 1: Plant multiple crops in a row
- Phase 2: Combine move + plant in loop
- Phase 3: Plant 5 wheat in a line
- Phase 4: Harvest all 5 with loop
- Phase 5: Complete row farming
```

#### Quest 4.4: While You Wait
```
File: while_loops.json
ID: while_loops
Prerequisites: [loop_actions]
Concepts: while_loop, condition_based

Objectives:
- Phase 1: Learn while loop syntax
- Phase 2: while energy > 0:
- Phase 3: Loop until condition is false
- Phase 4: while not crop_ready: wait()
- Phase 5: Create waiting loop
```

#### Quest 4.5: Loops Challenge
```
File: loops_challenge.json
ID: loops_challenge
Prerequisites: [while_loops]
Concepts: loops_mastery, automation

Objectives:
- Phase 1: Combine for and while loops
- Phase 2: Plant grid pattern with loops
- Phase 3: Wait for all crops to grow
- Phase 4: Harvest entire grid
- Phase 5: Full automation with loops
```

---

### Topic 5: Functions (5 quests)

#### Quest 5.1: The Art of Functions
```
File: functions_intro.json (EXISTS)
ID: functions_intro
Prerequisites: [] (entry point for Functions topic)
Concepts: def, function_definition, calling

Status: ✅ EXISTS - teaches def, function body, calling
```

#### Quest 5.2: Helper Functions
```
File: helper_functions.json
ID: helper_functions
Prerequisites: [functions_intro]
Concepts: reusability, organization

Objectives:
- Phase 1: Create def go_to_field():
- Phase 2: Add movement commands inside
- Phase 3: Create def go_home():
- Phase 4: Call both functions in main()
- Phase 5: Reuse functions multiple times
```

#### Quest 5.3: Functions with Parameters
```
File: function_parameters.json
ID: function_parameters
Prerequisites: [helper_functions]
Concepts: parameters, arguments, input

Objectives:
- Phase 1: Learn parameters: def move_steps(n):
- Phase 2: Use parameter inside: for i in range(n):
- Phase 3: Call with argument: move_steps(5)
- Phase 4: Create def plant_crops(count):
- Phase 5: Flexible farming with parameters
```

#### Quest 5.4: Return Values
```
File: return_values.json
ID: return_values
Prerequisites: [function_parameters]
Concepts: return, output, function_result

Objectives:
- Phase 1: Learn return statement
- Phase 2: def count_crops(): return total
- Phase 3: Store returned value: crops = count_crops()
- Phase 4: Use return in decisions
- Phase 5: Build utility functions with return
```

#### Quest 5.5: Functions Challenge
```
File: functions_challenge.json
ID: functions_challenge
Prerequisites: [return_values]
Concepts: functions_mastery, library

Objectives:
- Phase 1: Build farming function library
- Phase 2: Create 5+ reusable functions
- Phase 3: Functions calling other functions
- Phase 4: Parameters and return values combined
- Phase 5: Complete modular farming system
```

---

### Topic 6: Lists/Arrays (5 quests)

#### Quest 6.1: The Collection
```
File: lists_intro.json
ID: lists_intro
Prerequisites: [] (entry point for Lists topic)
Concepts: lists, arrays, collections

Objectives:
- Phase 1: Learn list syntax: crops = []
- Phase 2: Create list with items: crops = ["wheat", "corn"]
- Phase 3: Check list length: len(crops)
- Phase 4: Print the list
- Phase 5: Understand collections concept
```

#### Quest 6.2: Finding Items
```
File: list_indexing.json
ID: list_indexing
Prerequisites: [lists_intro]
Concepts: indexing, accessing, zero_based

Objectives:
- Phase 1: Access first item: crops[0]
- Phase 2: Access other items: crops[1], crops[2]
- Phase 3: Zero-based indexing concept
- Phase 4: Negative indexing: crops[-1]
- Phase 5: Get specific items from inventory
```

#### Quest 6.3: Growing Lists
```
File: list_modification.json
ID: list_modification
Prerequisites: [list_indexing]
Concepts: append, modify, dynamic

Objectives:
- Phase 1: Add items: crops.append("rice")
- Phase 2: Remove items: crops.remove("wheat")
- Phase 3: Modify items: crops[0] = "barley"
- Phase 4: Check if item exists: "wheat" in crops
- Phase 5: Manage dynamic inventory
```

#### Quest 6.4: Loop Through Lists
```
File: list_iteration.json
ID: list_iteration
Prerequisites: [list_modification]
Concepts: iteration, for_in, processing

Objectives:
- Phase 1: Iterate: for crop in crops:
- Phase 2: Process each item in loop
- Phase 3: Plant each crop type from list
- Phase 4: Count specific items in list
- Phase 5: Process entire inventory
```

#### Quest 6.5: Lists Challenge
```
File: lists_challenge.json
ID: lists_challenge
Prerequisites: [list_iteration]
Concepts: lists_mastery, inventory_system

Objectives:
- Phase 1: Create complete inventory system
- Phase 2: Add harvested crops to list
- Phase 3: Track quantities with list
- Phase 4: Search and filter inventory
- Phase 5: Build full inventory management
```

---

## 🗓️ Implementation Priority

### Phase 1: Complete Basic Commands (1 quest)
**Priority: HIGH** - Finish the existing track
```
Files to create:
- sequence_challenge.json
```

### Phase 2: Variables Track (5 quests) - Foundation
**Priority: HIGH** - Variables are the foundation of all programming
```
Files to create:
- variables_intro.json
- number_variables.json
- string_variables.json
- boolean_variables.json
- variables_challenge.json
```

### Phase 3: Conditionals Track (5 quests) - Logic
**Priority: HIGH** - Decision making is essential
```
Files to create:
- conditionals_intro.json
- if_else.json
- elif_chains.json
- complex_conditions.json
- conditionals_challenge.json
```

### Phase 4: Complete Loops Track (4 quests)
**Priority: MEDIUM** - 1 exists, need 4 more
```
Files to create:
- loop_movement.json
- loop_actions.json
- while_loops.json
- loops_challenge.json
```

### Phase 5: Complete Functions Track (4 quests)
**Priority: MEDIUM** - 1 exists, need 4 more
```
Files to create:
- helper_functions.json
- function_parameters.json
- return_values.json
- functions_challenge.json
```

### Phase 6: Lists Track (5 quests) - Data Structures
**Priority: MEDIUM** - Important for complete curriculum
```
Files to create:
- lists_intro.json
- list_indexing.json
- list_modification.json
- list_iteration.json
- lists_challenge.json
```

---

## 🔧 Session Configuration

Each session can be configured to focus on specific topics:

| Session Type | Topics Included | Quest IDs |
|--------------|-----------------|-----------|
| `topic_basics` | Basic Commands & Sequences | game_intro, first_harvest, auto_movement, farming_scripts, sequence_challenge |
| `topic_variables` | Variables & Data Types | variables_intro, number_variables, string_variables, boolean_variables, variables_challenge |
| `topic_conditionals` | Conditionals | conditionals_intro, if_else, elif_chains, complex_conditions, conditionals_challenge |
| `topic_loops` | Loops | farming_loops, loop_movement, loop_actions, while_loops, loops_challenge |
| `topic_functions` | Functions | functions_intro, helper_functions, function_parameters, return_values, functions_challenge |
| `topic_lists` | Lists/Arrays | lists_intro, list_indexing, list_modification, list_iteration, lists_challenge |
| `full_curriculum` | All Topics | All 30 quests |

---

## 📋 Quest JSON Template

```json
{
  "id": "quest_id",
  "title": "Quest Title",
  "description": "What the student will learn",
  "difficulty": "beginner",
  "category": "Topic Name",
  "estimatedTime": 10,
  "concepts": ["concept1", "concept2"],
  "prerequisites": ["previous_quest_id"],
  "phases": [
    {
      "id": "phase_1",
      "title": "Phase Title",
      "description": "Phase description",
      "preDialogues": [
        {
          "name": "Teacher NPC",
          "content": "Dialogue explaining the concept...",
          "sprite": "teacher-speaking.png"
        }
      ],
      "objectives": [
        {
          "type": "code_content",
          "content": "code_to_write",
          "description": "Human-readable instruction"
        }
      ],
      "postDialogues": [
        {
          "name": "Teacher NPC",
          "content": "Great job! Here's what you learned...",
          "sprite": "teacher-pleased.png"
        }
      ],
      "autoAdvance": true
    }
  ],
  "rewards": [
    {
      "type": "unlock_quest",
      "value": "next_quest_id",
      "description": "Unlock next quest"
    }
  ]
}
```

---

## ✅ Summary

| Metric | Count |
|--------|-------|
| **Existing usable quests** | 6 (basics: 4, loops: 1, functions: 1) |
| **New quests to create** | 24 |
| **Total target** | 30 |
| **Topics covered** | 6 (Basics, Variables, Conditionals, Loops, Functions, Lists) |
| **CS Fundamentals** | ✅ Complete 1st year coverage |

---

## 📊 Progress Tracker

| Topic | Quest 1 | Quest 2 | Quest 3 | Quest 4 | Quest 5 |
|-------|---------|---------|---------|---------|---------|
| Basic Commands | ✅ | ✅ | ✅ | ✅ | ⬜ |
| Variables | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Conditionals | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Loops | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Functions | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Lists | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Legend:** ✅ = Complete | 🔄 = In Progress | ⬜ = To Do
| Conditionals | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Loops | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Functions | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Lists | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Legend:** ✅ = Complete | 🔄 = In Progress | ⬜ = To Do
