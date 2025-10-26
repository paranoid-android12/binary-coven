import { Lesson, LessonProgress, LessonChallenge, LearningPath, LessonDifficulty, ProgrammingConcept } from '../../types/game';
import { useGameStore } from '../../stores/gameStore';
import { EventBus } from '../EventBus';

// Lesson Manager - Handles educational progression and lesson state
export class LessonManager {
  private static instance: LessonManager;
  private lessons: Map<string, Lesson> = new Map();
  private learningPaths: Map<string, LearningPath> = new Map();
  private progress: Map<string, LessonProgress> = new Map();
  private activeLesson: Lesson | null = null;

  private constructor() {
    this.loadLessons();
    this.loadLearningPaths();
    this.loadProgress();
  }

  static getInstance(): LessonManager {
    if (!LessonManager.instance) {
      LessonManager.instance = new LessonManager();
    }
    return LessonManager.instance;
  }

  // Initialize the lesson system with built-in lessons
  private loadLessons() {
    const builtInLessons: Lesson[] = [
      {
        id: 'movement_basics',
        title: 'Movement Basics',
        description: 'Learn how to move your character using code',
        difficulty: LessonDifficulty.BEGINNER,
        estimatedTime: 10,
        prerequisites: [],
        objectives: [
          {
            id: 'obj_move_single',
            description: 'Move to a specific location using move_to()',
            concept: ProgrammingConcept.MOVEMENT,
            required: true,
            completed: false
          },
          {
            id: 'obj_understand_coordinates',
            description: 'Understand grid coordinates and positioning',
            concept: ProgrammingConcept.MOVEMENT,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_move_to_target',
            title: 'Move to Target',
            description: 'Move from (5,5) to (8,8) using a single move_to() call',
            startingCode: `# Move to the target position (8,8)
def main():
    # Use move_to(x, y) to move to the target
    move_to(8, 8)`,
            solutionHints: [
              'Use the move_to(x, y) function to move to specific coordinates',
              'The target is at position (8,8) - use move_to(8, 8)',
              'Remember: move_to() takes x and y coordinates as parameters'
            ],
            successCriteria: [
              'Player must reach position (8,8)',
              'Must use move_to() function',
              'Should complete in one move'
            ],
            challengeGridPositions: [
              { x: 8, y: 8 }
            ],
            requiredFunctions: ['move_to'],
            timeLimit: 30,
            maxAttempts: 3
          }
        ],
        introduction: 'Welcome to your first programming lesson! In this game, you control your character using code instead of just clicking. Let\'s start with the basics: moving to specific locations.',
        concepts: [ProgrammingConcept.MOVEMENT, ProgrammingConcept.FUNCTIONS],
        reward: {
          type: 'function',
          value: 'move_to',
          description: 'Unlocked move_to() function for precise movement'
        }
      },
      {
        id: 'sequential_movement',
        title: 'Sequential Movement',
        description: 'Learn to execute multiple movement commands in sequence',
        difficulty: LessonDifficulty.BEGINNER,
        estimatedTime: 15,
        prerequisites: ['movement_basics'],
        objectives: [
          {
            id: 'obj_sequential_moves',
            description: 'Execute multiple movement commands in order',
            concept: ProgrammingConcept.MOVEMENT,
            required: true,
            completed: false
          },
          {
            id: 'obj_understand_sequence',
            description: 'Understand that code executes line by line',
            concept: ProgrammingConcept.LOGIC,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_square_pattern',
            title: 'Square Pattern',
            description: 'Move in a square pattern: right, down, left, up',
            startingCode: `# Move in a square pattern
def main():
    # Move right to (6, 5)
    move_right()
    # Move down to (6, 6)
    move_down()
    # Move left to (5, 6)
    move_left()
    # Move up to (5, 5)
    move_up()`,
            solutionHints: [
              'Each move changes your position by exactly one grid space',
              'move_right() increases X coordinate, move_down() increases Y coordinate',
              'The pattern should form a complete square and return to start'
            ],
            successCriteria: [
              'Must execute exactly 4 movement commands',
              'Must return to starting position (5,5)',
              'Each move should be exactly one grid space'
            ],
            challengeGridPositions: [
              { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }
            ],
            requiredFunctions: ['move_right', 'move_down', 'move_left', 'move_up'],
            timeLimit: 60,
            maxAttempts: 5
          }
        ],
        introduction: 'Great job with basic movement! Now let\'s learn about sequential execution. Code runs line by line, from top to bottom. Each command happens one after another.',
        concepts: [ProgrammingConcept.MOVEMENT, ProgrammingConcept.LOGIC],
        reward: {
          type: 'function',
          value: 'directional_movement',
          description: 'Unlocked directional movement functions'
        }
      },
      {
        id: 'variables_and_data',
        title: 'Variables and Data',
        description: 'Learn to store and use information in variables',
        difficulty: LessonDifficulty.BEGINNER,
        estimatedTime: 20,
        prerequisites: ['sequential_movement'],
        objectives: [
          {
            id: 'obj_understand_variables',
            description: 'Understand what variables are and how to use them',
            concept: ProgrammingConcept.VARIABLES,
            required: true,
            completed: false
          },
          {
            id: 'obj_store_positions',
            description: 'Store position data in variables',
            concept: ProgrammingConcept.VARIABLES,
            required: true,
            completed: false
          },
          {
            id: 'obj_reuse_variables',
            description: 'Reuse variables in multiple places',
            concept: ProgrammingConcept.VARIABLES,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_variable_positions',
            title: 'Store and Move to Positions',
            description: 'Store target positions in variables and move to them',
            startingCode: `# Use variables to store positions and move to them
def main():
    # Define target positions using variables
    target1_x = 7
    target1_y = 7
    target2_x = 9
    target2_y = 7

    # Move to first target
    move_to(target1_x, target1_y)

    # Move to second target
    move_to(target2_x, target2_y)`,
            solutionHints: [
              'Variables store values that you can reuse throughout your code',
              'Use descriptive names like target1_x instead of just x',
              'You can use variables as parameters to functions like move_to()'
            ],
            successCriteria: [
              'Must define at least 2 position variables',
              'Must visit both target positions',
              'Variables should be reused in move_to() calls'
            ],
            challengeGridPositions: [
              { x: 7, y: 7 }, { x: 9, y: 7 }
            ],
            requiredFunctions: ['move_to'],
            timeLimit: 90,
            maxAttempts: 5
          }
        ],
        introduction: 'Variables are like containers that store information. You can put values in them and use them later in your code. This makes your programs more organized and reusable.',
        concepts: [ProgrammingConcept.VARIABLES, ProgrammingConcept.MOVEMENT],
        reward: {
          type: 'feature',
          value: 'variable_inspector',
          description: 'Unlocked variable inspector in the code editor'
        }
      },
      {
        id: 'loops_basics',
        title: 'Loops: Repeating Actions',
        description: 'Learn to repeat actions using loops',
        difficulty: LessonDifficulty.INTERMEDIATE,
        estimatedTime: 25,
        prerequisites: ['variables_and_data'],
        objectives: [
          {
            id: 'obj_understand_loops',
            description: 'Understand what loops are and why they\'re useful',
            concept: ProgrammingConcept.LOOPS,
            required: true,
            completed: false
          },
          {
            id: 'obj_for_loops',
            description: 'Use for loops to repeat actions a specific number of times',
            concept: ProgrammingConcept.LOOPS,
            required: true,
            completed: false
          },
          {
            id: 'obj_loop_variables',
            description: 'Use loop variables (like i) to control loop behavior',
            concept: ProgrammingConcept.LOOPS,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_loop_movement',
            title: 'Loop Movement Pattern',
            description: 'Use a loop to move right 5 times, then down 5 times',
            startingCode: `# Use a loop to repeat movement actions
def main():
    # Move right 5 times using a loop
    for i in range(5):
        move_right()

    # Move down 5 times using a loop
    for i in range(5):
        move_down()`,
            solutionHints: [
              'for i in range(n) repeats the code n times',
              'The variable i starts at 0 and increases by 1 each time',
              'You can use i in your loop if you need to count iterations'
            ],
            successCriteria: [
              'Must use for loops for both movement sequences',
              'Must move exactly 5 spaces right and 5 spaces down',
              'Should demonstrate understanding of loop structure'
            ],
            challengeGridPositions: [
              { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 },
              { x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 }, { x: 10, y: 9 }, { x: 10, y: 10 }
            ],
            requiredFunctions: ['move_right', 'move_down'],
            timeLimit: 120,
            maxAttempts: 7
          }
        ],
        introduction: 'Loops let you repeat the same actions multiple times without writing the same code over and over. This is one of the most powerful concepts in programming!',
        concepts: [ProgrammingConcept.LOOPS, ProgrammingConcept.MOVEMENT],
        reward: {
          type: 'function',
          value: 'range_function',
          description: 'Unlocked range() function for creating number sequences'
        }
      },
      {
        id: 'conditionals',
        title: 'Making Decisions with Conditionals',
        description: 'Learn to make decisions in your code using if statements',
        difficulty: LessonDifficulty.INTERMEDIATE,
        estimatedTime: 30,
        prerequisites: ['loops_basics'],
        objectives: [
          {
            id: 'obj_understand_conditionals',
            description: 'Understand what conditionals are and when to use them',
            concept: ProgrammingConcept.CONDITIONALS,
            required: true,
            completed: false
          },
          {
            id: 'obj_if_statements',
            description: 'Use if statements to make decisions',
            concept: ProgrammingConcept.CONDITIONALS,
            required: true,
            completed: false
          },
          {
            id: 'obj_comparison_operators',
            description: 'Use comparison operators (==, <, >, etc.)',
            concept: ProgrammingConcept.CONDITIONALS,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_conditional_movement',
            title: 'Smart Movement',
            description: 'Move right if energy is above 50, otherwise move to a rest area',
            startingCode: `# Make decisions based on your current state
def main():
    # Get current energy level
    energy_info = get_energy()

    # If energy is above 50, work (move right)
    if energy_info['energy'] > 50:
        move_right()
    else:
        # If energy is low, go to rest area at (5, 5)
        move_to(5, 5)`,
            solutionHints: [
              'Use get_energy() to check your current energy level',
              'if condition: runs the code only if condition is true',
              'else: runs when the if condition is false',
              'Compare numbers using >, <, ==, >=, <=, !='
            ],
            successCriteria: [
              'Must use get_energy() to check energy level',
              'Must use if statement to make decision',
              'Must handle both high and low energy cases'
            ],
            challengeGridPositions: [
              { x: 5, y: 5 }, { x: 6, y: 5 }
            ],
            requiredFunctions: ['get_energy', 'move_right', 'move_to'],
            timeLimit: 90,
            maxAttempts: 5
          }
        ],
        introduction: 'Programs need to make decisions! If statements let your code choose different actions based on conditions. This makes your programs smart and adaptable.',
        concepts: [ProgrammingConcept.CONDITIONALS, ProgrammingConcept.VARIABLES],
        reward: {
          type: 'function',
          value: 'get_energy',
          description: 'Unlocked energy checking functions'
        }
      },
      {
        id: 'farming_automation',
        title: 'Farming Automation',
        description: 'Combine all concepts to create an automated farming system',
        difficulty: LessonDifficulty.INTERMEDIATE,
        estimatedTime: 40,
        prerequisites: ['conditionals'],
        objectives: [
          {
            id: 'obj_combine_concepts',
            description: 'Combine loops, conditionals, and variables effectively',
            concept: ProgrammingConcept.LOGIC,
            required: true,
            completed: false
          },
          {
            id: 'obj_planting_logic',
            description: 'Check farmland before planting',
            concept: ProgrammingConcept.INTERACTION,
            required: true,
            completed: false
          },
          {
            id: 'obj_harvest_timing',
            description: 'Wait for crops to grow before harvesting',
            concept: ProgrammingConcept.CONDITIONALS,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_automated_farm',
            title: 'Automated Farm System',
            description: 'Create a system that plants, waits, and harvests automatically',
            startingCode: `# Create an automated farming system
def main():
    # Define farm plot positions
    farm_plots = [
        (8, 8), (9, 8), (10, 8),
        (8, 9), (9, 9), (10, 9)
    ]

    # Plant all plots
    for x, y in farm_plots:
        move_to(x, y)
        plant()

    # Wait for crops to grow (10 seconds)
    sleep(10000)

    # Harvest all plots that are ready
    for x, y in farm_plots:
        move_to(x, y)
        if can_harvest():
            harvest()`,
            solutionHints: [
              'Store farm positions in a list of tuples',
              'Use a loop to visit each farm plot',
              'Check if crops are ready before harvesting',
              'Use sleep() to wait for crops to grow'
            ],
            successCriteria: [
              'Must plant on all 6 farm plots',
              'Must wait for crops to grow',
              'Must harvest only when crops are ready',
              'Must use loops and conditionals effectively'
            ],
            challengeGridPositions: [
              { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 },
              { x: 8, y: 9 }, { x: 9, y: 9 }, { x: 10, y: 9 }
            ],
            requiredFunctions: ['move_to', 'plant', 'harvest', 'can_harvest', 'sleep'],
            timeLimit: 300,
            maxAttempts: 10
          }
        ],
        introduction: 'Now you\'re ready for a real challenge! Combine everything you\'ve learned to create an automated farming system. This will test your understanding of all the programming concepts we\'ve covered.',
        concepts: [ProgrammingConcept.LOOPS, ProgrammingConcept.CONDITIONALS, ProgrammingConcept.VARIABLES, ProgrammingConcept.INTERACTION],
        reward: {
          type: 'feature',
          value: 'advanced_editor',
          description: 'Unlocked advanced code editor features'
        }
      },
      {
        id: 'arrays_and_lists',
        title: 'Arrays and Lists',
        description: 'Learn to work with collections of data using arrays',
        difficulty: LessonDifficulty.INTERMEDIATE,
        estimatedTime: 35,
        prerequisites: ['farming_automation'],
        objectives: [
          {
            id: 'obj_understand_arrays',
            description: 'Understand what arrays are and how they store multiple values',
            concept: ProgrammingConcept.ARRAYS,
            required: true,
            completed: false
          },
          {
            id: 'obj_array_operations',
            description: 'Add, remove, and access items in arrays',
            concept: ProgrammingConcept.ARRAYS,
            required: true,
            completed: false
          },
          {
            id: 'obj_array_methods',
            description: 'Use array methods like append(), get(), and find()',
            concept: ProgrammingConcept.ARRAYS,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_inventory_management',
            title: 'Inventory Management',
            description: 'Create and manage an inventory list of harvested items',
            startingCode: `# Manage your farming inventory using arrays
def main():
    # Create an inventory list
    inventory = []

    # Add harvested items to inventory
    inventory.append('wheat')
    inventory.append('wheat')
    inventory.append('corn')

    # Check what we have
    print('Inventory:', inventory)
    print('Total items:', len(inventory))

    # Find specific items
    wheat_index = find(inventory, 'wheat')
    if wheat_index != -1:
        print('Found wheat at index:', wheat_index)

    # Get items by index
    first_item = get(inventory, 0)
    print('First item:', first_item)`,
            solutionHints: [
              'Use inventory = [] to create an empty list',
              'Add items with append(item) to put them at the end',
              'Access items with get(list, index) - remember indices start at 0!',
              'Find items with find(list, item) - returns -1 if not found'
            ],
            successCriteria: [
              'Must create an inventory list',
              'Must add at least 2 items using append()',
              'Must use get() to access an item by index',
              'Must use find() to locate an item'
            ],
            challengeGridPositions: [
              { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 }
            ],
            requiredFunctions: ['append', 'get', 'find', 'len'],
            timeLimit: 180,
            maxAttempts: 7
          }
        ],
        introduction: 'Arrays (also called lists) let you store multiple values in one variable. Think of them like a shopping list or inventory - you can add items, remove them, and find specific ones.',
        concepts: [ProgrammingConcept.ARRAYS, ProgrammingConcept.VARIABLES],
        reward: {
          type: 'function',
          value: 'array_functions',
          description: 'Unlocked array manipulation functions'
        }
      },
      {
        id: 'objects_and_dictionaries',
        title: 'Objects and Properties',
        description: 'Learn to work with structured data using objects',
        difficulty: LessonDifficulty.INTERMEDIATE,
        estimatedTime: 40,
        prerequisites: ['arrays_and_lists'],
        objectives: [
          {
            id: 'obj_understand_objects',
            description: 'Understand objects as collections of key-value pairs',
            concept: ProgrammingConcept.OBJECTS,
            required: true,
            completed: false
          },
          {
            id: 'obj_object_properties',
            description: 'Create and access object properties',
            concept: ProgrammingConcept.OBJECTS,
            required: true,
            completed: false
          },
          {
            id: 'obj_object_methods',
            description: 'Use object methods like get_property() and set_property()',
            concept: ProgrammingConcept.OBJECTS,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_farm_data_management',
            title: 'Farm Data Management',
            description: 'Create and manage farm plot data using objects',
            startingCode: `# Manage farm plot information using objects
def main():
    # Create farm plot objects
    plot1 = {'x': 8, 'y': 8, 'crop': 'wheat', 'status': 'growing'}
    plot2 = {'x': 9, 'y': 8, 'crop': 'corn', 'status': 'ready'}

    # Access plot information
    print('Plot 1 crop:', get_property(plot1, 'crop'))
    print('Plot 2 location:', get_property(plot2, 'x'), get_property(plot2, 'y'))

    # Update plot status
    set_property(plot1, 'status', 'ready')
    print('Plot 1 updated status:', get_property(plot1, 'status'))

    # Check all properties
    print('Plot 1 properties:', get_keys(plot1))
    print('Plot 2 properties:', get_keys(plot2))`,
            solutionHints: [
              'Objects use curly braces: {"key": "value", "key2": "value2"}',
              'Access properties with get_property(object, "key")',
              'Update properties with set_property(object, "key", "new_value")',
              'See all properties with get_keys(object)'
            ],
            successCriteria: [
              'Must create at least 2 object variables',
              'Must use get_property() to access object data',
              'Must use set_property() to modify object data',
              'Must use get_keys() to list object properties'
            ],
            challengeGridPositions: [
              { x: 8, y: 8 }, { x: 9, y: 8 }
            ],
            requiredFunctions: ['get_property', 'set_property', 'get_keys'],
            timeLimit: 200,
            maxAttempts: 8
          }
        ],
        introduction: 'Objects let you store related information together. Instead of separate variables, you can group data like a farm plot\'s location, crop type, and status all in one object.',
        concepts: [ProgrammingConcept.OBJECTS, ProgrammingConcept.VARIABLES],
        reward: {
          type: 'function',
          value: 'object_functions',
          description: 'Unlocked object manipulation functions'
        }
      },
      {
        id: 'advanced_control_flow',
        title: 'Advanced Control Flow',
        description: 'Master complex program flow with break and continue',
        difficulty: LessonDifficulty.ADVANCED,
        estimatedTime: 45,
        prerequisites: ['objects_and_dictionaries'],
        objectives: [
          {
            id: 'obj_understand_break',
            description: 'Use break to exit loops early',
            concept: ProgrammingConcept.LOOPS,
            required: true,
            completed: false
          },
          {
            id: 'obj_understand_continue',
            description: 'Use continue to skip loop iterations',
            concept: ProgrammingConcept.LOOPS,
            required: true,
            completed: false
          },
          {
            id: 'obj_complex_conditions',
            description: 'Combine multiple conditions in loops',
            concept: ProgrammingConcept.CONDITIONALS,
            required: true,
            completed: false
          }
        ],
        challenges: [
          {
            id: 'challenge_smart_harvesting',
            title: 'Smart Harvesting System',
            description: 'Create a smart system that only harvests ripe crops and skips empty plots',
            startingCode: `# Smart harvesting - only harvest ripe crops, skip empty plots
def main():
    # List of farm plot positions
    farm_plots = [
        (8, 8), (9, 8), (10, 8),
        (8, 9), (9, 9), (10, 9)
    ]

    # Track harvested crops
    harvested_count = 0

    # Check each plot
    for x, y in farm_plots:
        move_to(x, y)

        # Skip if no crop planted
        if not can_harvest():
            print('Skipping empty plot at', x, y)
            continue  # Skip to next plot

        # Only harvest if we have enough energy
        energy_info = get_energy()
        if energy_info['energy'] < 15:
            print('Low energy - stopping harvest')
            break  # Stop harvesting

        # Harvest the crop
        harvest()
        harvested_count += 1
        print('Harvested crop! Total:', harvested_count)

    print('Harvesting complete. Total harvested:', harvested_count)`,
            solutionHints: [
              'Use continue to skip empty plots and move to the next one',
              'Use break to stop the entire loop when energy is low',
              'Check can_harvest() before trying to harvest',
              'Track progress with a counter variable'
            ],
            successCriteria: [
              'Must use continue to skip empty plots',
              'Must use break to stop when energy is low',
              'Must check can_harvest() before harvesting',
              'Must track and report total harvested crops'
            ],
            challengeGridPositions: [
              { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 },
              { x: 8, y: 9 }, { x: 9, y: 9 }, { x: 10, y: 9 }
            ],
            requiredFunctions: ['move_to', 'can_harvest', 'harvest', 'get_energy', 'break', 'continue'],
            timeLimit: 300,
            maxAttempts: 10
          }
        ],
        introduction: 'Advanced control flow lets you make smart decisions in loops. Break exits immediately, while continue skips to the next iteration. This makes your programs much more efficient!',
        concepts: [ProgrammingConcept.LOOPS, ProgrammingConcept.CONDITIONALS, ProgrammingConcept.LOGIC],
        reward: {
          type: 'feature',
          value: 'advanced_control_flow',
          description: 'Unlocked advanced control flow functions and optimizations'
        }
      }
    ];

    // Register all lessons
    builtInLessons.forEach(lesson => {
      this.lessons.set(lesson.id, lesson);
    });

    console.log(`[LESSON-MANAGER] Loaded ${builtInLessons.length} lessons`);
  }

  private loadLearningPaths() {
    const builtInPaths: LearningPath[] = [
      {
        id: 'programming_fundamentals',
        title: 'Programming Fundamentals',
        description: 'Complete introduction to programming concepts through farming',
        lessons: [
          'movement_basics',
          'sequential_movement',
          'variables_and_data',
          'loops_basics',
          'conditionals',
          'farming_automation',
          'arrays_and_lists',
          'objects_and_dictionaries',
          'advanced_control_flow'
        ],
        targetAudience: 'Complete beginners to programming',
        totalEstimatedTime: 335, // 5.6 hours
        difficulty: LessonDifficulty.BEGINNER
      }
    ];

    builtInPaths.forEach(path => {
      this.learningPaths.set(path.id, path);
    });

    console.log(`[LESSON-MANAGER] Loaded ${builtInPaths.length} learning paths`);
  }

  private loadProgress() {
    // Load progress from localStorage
    try {
      const savedProgress = localStorage.getItem('binary-coven-lesson-progress');
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        this.progress = new Map(Object.entries(progressData));
        console.log(`[LESSON-MANAGER] Loaded progress for ${this.progress.size} lessons`);
      }
    } catch (error) {
      console.error('[LESSON-MANAGER] Failed to load lesson progress:', error);
    }
  }

  private saveProgress() {
    try {
      const progressData = Object.fromEntries(this.progress);
      localStorage.setItem('binary-coven-lesson-progress', JSON.stringify(progressData));
      console.log('[LESSON-MANAGER] Saved lesson progress');
    } catch (error) {
      console.error('[LESSON-MANAGER] Failed to save lesson progress:', error);
    }
  }

  // Public API methods
  getLesson(lessonId: string): Lesson | undefined {
    return this.lessons.get(lessonId);
  }

  getAllLessons(): Lesson[] {
    return Array.from(this.lessons.values());
  }

  getLearningPath(pathId: string): LearningPath | undefined {
    return this.learningPaths.get(pathId);
  }

  getAvailableLessons(): Lesson[] {
    const completedLessons = new Set(this.progress.values()
      .filter(p => p.completed)
      .map(p => p.lessonId));

    return Array.from(this.lessons.values()).filter(lesson => {
      // Check if all prerequisites are completed
      return lesson.prerequisites.every(prereq => completedLessons.has(prereq));
    });
  }

  startLesson(lessonId: string): boolean {
    const lesson = this.lessons.get(lessonId);
    if (!lesson) {
      console.error(`[LESSON-MANAGER] Lesson not found: ${lessonId}`);
      return false;
    }

    // Initialize progress if not exists
    if (!this.progress.has(lessonId)) {
      const progress: LessonProgress = {
        lessonId,
        startedAt: Date.now(),
        currentChallengeIndex: 0,
        challengeAttempts: new Map(),
        challengeCompletions: new Set(),
        hintsUsed: new Map(),
        totalExecutionTime: 0,
        codeQuality: 0,
        completed: false,
        score: 0
      };
      this.progress.set(lessonId, progress);
      this.saveProgress();
    }

    this.activeLesson = lesson;

    // Emit lesson started event
    EventBus.emit('lesson-started', {
      lessonId,
      lesson: lesson,
      progress: this.progress.get(lessonId)
    });

    console.log(`[LESSON-MANAGER] Started lesson: ${lesson.title}`);
    return true;
  }

  completeChallenge(challengeId: string, score: number, executionTime: number): void {
    if (!this.activeLesson) return;

    const progress = this.progress.get(this.activeLesson.id);
    if (!progress) return;

    // Mark challenge as completed
    progress.challengeCompletions.add(challengeId);
    progress.totalExecutionTime += executionTime;
    progress.currentChallengeIndex = Math.max(progress.currentChallengeIndex,
      this.activeLesson.challenges.findIndex(c => c.id === challengeId) + 1);

    // Update attempts count
    const attempts = progress.challengeAttempts.get(challengeId) || 0;
    progress.challengeAttempts.set(challengeId, attempts + 1);

    // Check if lesson is completed
    const allChallengesCompleted = this.activeLesson.challenges.every(
      c => progress.challengeCompletions.has(c.id)
    );

    if (allChallengesCompleted) {
      progress.completed = true;
      progress.completedAt = Date.now();
      progress.score = Math.round(
        (progress.challengeCompletions.size / progress.challengeAttempts.size) * 100
      );

      // Mark objectives as completed
      this.activeLesson.objectives.forEach(obj => obj.completed = true);

      EventBus.emit('lesson-completed', {
        lessonId: this.activeLesson.id,
        progress: progress,
        reward: this.activeLesson.reward
      });

      console.log(`[LESSON-MANAGER] Lesson completed: ${this.activeLesson.title}`);
    }

    this.saveProgress();

    EventBus.emit('challenge-completed', {
      challengeId,
      score,
      attempts: progress.challengeAttempts.get(challengeId)
    });
  }

  getLessonProgress(lessonId: string): LessonProgress | undefined {
    return this.progress.get(lessonId);
  }

  getActiveLesson(): Lesson | null {
    return this.activeLesson;
  }

  endLesson(): void {
    this.activeLesson = null;
    EventBus.emit('lesson-ended');
  }

  getNextLesson(): Lesson | null {
    if (!this.activeLesson) return null;

    const completedLessons = new Set(this.progress.values()
      .filter(p => p.completed)
      .map(p => p.lessonId));

    // Find next lesson in the same learning path
    const learningPath = Array.from(this.learningPaths.values())
      .find(path => path.lessons.includes(this.activeLesson!.id));

    if (learningPath) {
      const currentIndex = learningPath.lessons.indexOf(this.activeLesson!.id);
      const nextLessonId = learningPath.lessons[currentIndex + 1];

      if (nextLessonId && completedLessons.has(this.activeLesson!.id)) {
        return this.lessons.get(nextLessonId) || null;
      }
    }

    return null;
  }

  resetProgress(lessonId?: string): void {
    if (lessonId) {
      this.progress.delete(lessonId);
      console.log(`[LESSON-MANAGER] Reset progress for lesson: ${lessonId}`);
    } else {
      this.progress.clear();
      console.log('[LESSON-MANAGER] Reset all lesson progress');
    }
    this.saveProgress();
  }
}

export default LessonManager;
