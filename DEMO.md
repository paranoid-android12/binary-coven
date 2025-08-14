#  Binary Coven Demo Guide

Welcome to Binary Coven! This guide will walk you through the new grid function system with progress tracking and task management.

##  Quick Start

1. **Start the game**: Run `npm run dev` and open `http://localhost:8080`
2. **Familiarize yourself**: You'll see:
   - A grid-based game world with colored squares
   - A blue square (your qubit robot)
   - Yellow, green, and purple squares (mining terminal, dynamo, wallet)
   - Progress bars appear above entities/grids during tasks
   - Visual indicators for busy states (orange tint for entities, yellow for grids)
3. **Open Programming Interface**: Click on the blue qubit to open its status modal
4. **Switch to Program Tab**: Click the "Program" tab to access the code editor

##  New Grid Function System

###  Mining Terminal Functions
- **`mine_initiate()`**: 
  - Entity blocks for 3 seconds (initiation)
  - Terminal then mines for 10 seconds independently
  - Costs 10 energy
  - Must be standing on the terminal
  
- **`collect()`**:
  - Collects ready bitcoins
  - Costs 5 energy
  - Only works when terminal shows "ready" status

###  Dynamo Functions
- **`crank()`**:
  - Entity blocks for 10 seconds
  - Restores energy to full
  - Costs 5 energy initially
  - Must be standing on the dynamo

###  Wallet Functions
- **`store(amount)`**:
  - Stores bitcoins as spendable currency
  - Costs 2 energy
  - Must be standing on the wallet
  - Example: `store(3)` stores 3 bitcoins

###  Scanner Function
- **`scanner(x, y)`**:
  - Scans any grid at coordinates
  - Returns detailed status information
  - Costs 2 energy
  - Works from any position

##  Demo 1: Basic Mining with Progress Tracking

1. **Open the qubit's programming interface**
2. **Replace the main function** with this code:

```python
def main():
    print("=== Mining Demo with Progress Tracking ===")
    
    # Check starting energy
    energy = get_energy()
    print(f"Starting energy: {energy}")
    
    # Go to dynamo first for energy
    print("Moving to dynamo...")
    move_to(6, 3)
    
    print("Cranking dynamo (watch the progress bar!)...")
    crank()  # This will block for 10 seconds with progress bar
    
    print("Energy restored! Moving to mining terminal...")
    move_to(3, 3)
    
    print("Initiating mining (3s initiation + 10s mining)...")
    mine_initiate()  # Blocks for 3s, then terminal mines for 10s
    
    print("Mining initiated! I can do other things now...")
    
    # While mining happens, let's scan the terminal
    print("Scanning mining terminal status...")
    scan_result = scanner(3, 3)
    print(f"Terminal status: {scan_result}")
    
    # Wait for mining to complete (check every few seconds)
    print("Waiting for mining to complete...")
    wait(8)  # Wait most of the mining time
    
    # Check status again
    scan_result = scanner(3, 3)
    print(f"Terminal status after waiting: {scan_result}")
    
    # Try to collect (might need to wait a bit more)
    wait(3)
    print("Attempting to collect bitcoins...")
    collect()
    
    print("Demo complete!")
```

3. **Run the code** and watch:
   - Progress bars appear above the qubit during cranking
   - Progress bars appear above the mining terminal during mining
   - Entity turns orange when busy, grids turn yellow when active
   - Scanner provides real-time status updates

##  Demo 2: Advanced Automation with Error Handling

```python
def check_energy():
    energy_data = get_energy()
    current_energy = energy_data['energy']
    if current_energy < 20:
        print("Low energy detected, going to dynamo...")
        move_to(6, 3)
        crank()
        print("Energy restored!")
        return True
    return False

def wait_for_mining_ready():
    print("Waiting for mining to be ready...")
    while True:
        status = scanner(3, 3)
        if status['status']['status'] == 'ready':
            print("Mining ready!")
            break
        elif status['status']['status'] == 'idle':
            print("Terminal is idle, need to start mining")
            break
        else:
            print(f"Mining status: {status['status']['status']}")
            wait(2)

def mine_bitcoin():
    print("=== Starting mining operation ===")
    
    # Ensure we have energy
    check_energy()
    
    # Go to mining terminal
    move_to(3, 3)
    
    # Check terminal status first
    status = scanner(3, 3)
    print(f"Terminal status: {status['status']['status']}")
    
    if status['status']['status'] == 'idle':
        print("Starting mining process...")
        mine_initiate()
        
        # Wait for mining to complete
        wait_for_mining_ready()
        
        # Collect the bitcoin
        collect()
        print("Bitcoin collected!")
    elif status['status']['status'] == 'ready':
        print("Bitcoin already ready, collecting...")
        collect()
    else:
        print("Terminal is busy, waiting...")
        wait_for_mining_ready()
        collect()

def store_bitcoins():
    print("=== Storing bitcoins ===")
    move_to(9, 3)
    
    # Check wallet status
    wallet_status = scanner(9, 3)
    print(f"Wallet currently stores: {wallet_status['status']['storedAmount']} bitcoins")
    
    # Store all available bitcoins
    store(1)  # Store 1 bitcoin
    print("Bitcoin stored as currency!")

def main():
    print("=== Advanced Mining Automation ===")
    
    # Mine 3 bitcoins
    for i in range(3):
        print(f"\n--- Mining cycle {i + 1} ---")
        mine_bitcoin()
        store_bitcoins()
        
        # Check our progress
        pos = get_position()
        energy = get_energy()
        print(f"Cycle {i + 1} complete. Position: {pos}, Energy: {energy}")
    
    print("\n=== All mining cycles complete! ===")
```

##  Demo 3: Scanner and Status Monitoring

```python
def scan_all_grids():
    print("=== Scanning all grids ===")
    
    # Define known grid positions
    grid_positions = [
        [8, 6, "Mining Terminal"],
        [12, 6, "Dynamo"],
        [16, 6, "Wallet"]
    ]
    
    for grid_pos in grid_positions:
        x, y, name = grid_pos[0], grid_pos[1], grid_pos[2]
        result = scanner(x, y)
        print(f"{name} at ({x}, {y}): {result['status']}")
        wait(1)

def main():
    print("=== Scanner Demo ===")
    scan_all_grids()
    print("Scanning complete!")
```

##  Key Features to Test

### Progress Tracking
- **Visual Progress Bars**: Watch progress bars appear above entities and grids
- **Modal Progress**: Open entity/grid status modals to see detailed progress
- **Real-time Updates**: Progress updates every 100ms

### Task Management
- **Entity Blocking**: Entities can't perform other actions while busy
- **Grid Blocking**: Some grids block during operations
- **Error Handling**: Clear error messages when trying to use busy entities/grids

### Scanner Functionality
- **Remote Monitoring**: Check grid status from anywhere
- **Detailed Information**: Get comprehensive status data
- **Real-time Status**: Scanner reflects current grid state

### Visual Indicators
- **Entity States**: Blue (normal), Orange (busy), Gray (low energy)
- **Grid States**: Normal color, Yellow (active), Green (ready)
- **Progress Bars**: Real-time progress visualization

##  Common Issues & Solutions

**"Entity is currently busy"**: Wait for current task to complete or check progress
**"Grid is currently busy"**: Another entity is using the grid, wait your turn
**"Not enough energy"**: Use the dynamo to restore energy
**"No bitcoins ready"**: Mining hasn't completed yet, use scanner to check status
**"Must be standing on grid"**: Move to the grid position before using its functions

##  Advanced Challenges

1. **Efficiency Challenge**: Mine 10 bitcoins using minimal energy
2. **Parallel Processing**: Use scanner to monitor multiple operations
3. **Error Recovery**: Handle all possible error conditions gracefully
4. **Resource Optimization**: Balance energy usage with bitcoin production
5. **Status Dashboard**: Create a comprehensive monitoring system

##  What's New

- **Progress Tracking**: Visual progress bars and real-time updates
- **Task Management**: Proper blocking and error handling
- **Scanner Function**: Remote grid status monitoring
- **Enhanced Visuals**: Better visual feedback for all states
- **Robust Error Handling**: Clear error messages and recovery

Happy coding with the new grid function system!  

##  Python Control Flow Features

Binary Coven now supports **full Python-like control flow** with proper indentation-based syntax!

###  New Built-in Functions
- **`range(start, stop, step)`**: Generate number sequences (like Python)
- **`len(iterable)`**: Get length of strings, arrays, etc.
- **`abs(number)`**: Get absolute value
- **`min(values...)`**: Get minimum value
- **`max(values...)`**: Get maximum value
- **`sum(iterable)`**: Sum all numbers in an array

###  If/Else Statements

```python
def main():
    print("=== If/Else Demo ===")
    
    energy = get_energy()
    print(f"Current energy: {energy}")
    
    if energy > 50:
        print("Energy is high!")
        move_right()
    elif energy > 20:
        print("Energy is medium, being careful...")
        wait(1)
        move_right()
    else:
        print("Energy is low, need to recharge!")
        move_to(12, 6)  # Go to dynamo
        crank()
        print("Recharged!")
    
    print("Demo complete!")
```

###  For Loops

```python
def main():
    print("=== For Loop Demo ===")
    
    # Basic range loop
    print("Counting to 5:")
    for i in range(5):
        print(f"Count: {i}")
        wait(0.5)
    
    # Loop with start/stop
    print("Moving in a pattern:")
    for step in range(1, 4):
        print(f"Step {step}")
        for direction in range(step):
            move_right()
            wait(0.3)
        for direction in range(step):
            move_left()
            wait(0.3)
    
    # Loop over a list
    positions = [[8, 6], [12, 6], [16, 6]]
    for pos in positions:
        x = pos[0]
        y = pos[1]
        print(f"Moving to ({x}, {y})")
        move_to(x, y)
        wait(1)
    
    print("For loop demo complete!")
```

###  While Loops

```python
def main():
    print("=== While Loop Demo ===")
    
    # Mine until we have enough bitcoins
    bitcoin_goal = 3
    bitcoins_collected = 0
    
    while bitcoins_collected < bitcoin_goal:
        print(f"Bitcoins: {bitcoins_collected}/{bitcoin_goal}")
        
        # Check energy first
        energy = get_energy()
        if energy < 20:
            print("Low energy, recharging...")
            move_to(12, 6)
            crank()
        
        # Go mine
        move_to(8, 6)
        mine_initiate()
        
        # Wait for mining to complete
        mining_done = False
        while not mining_done:
            status = scanner(8, 6)
            if status['status']['status'] == 'ready':
                mining_done = True
                print("Mining complete!")
            else:
                print("Still mining...")
                wait(2)
        
        # Collect the bitcoin
        collect()
        bitcoins_collected = bitcoins_collected + 1
        print(f"Collected bitcoin #{bitcoins_collected}")
    
    print(f"Goal achieved! Collected {bitcoins_collected} bitcoins!")
```

###  Advanced Control Flow with Functions

```python
def move_in_square(size):
    """Move in a square pattern of given size"""
    directions = ['right', 'down', 'left', 'up']
    
    for direction in directions:
        print(f"Moving {direction} for {size} steps")
        
        for step in range(size):
            if direction == 'right':
                move_right()
            elif direction == 'down':
                move_down()
            elif direction == 'left':
                move_left()
            elif direction == 'up':
                move_up()
            
            wait(0.2)

def find_nearest_grid():
    """Find the nearest grid using scanner"""
    current_pos = get_position()
    x = current_pos['x']
    y = current_pos['y']
    
    # Search in expanding square pattern
    for radius in range(1, 10):
        print(f"Searching radius {radius}")
        
        # Check all positions at this radius
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                # Only check the perimeter of the square
                if abs(dx) == radius or abs(dy) == radius:
                    scan_x = x + dx
                    scan_y = y + dy
                    
                    # Skip negative coordinates
                    if scan_x >= 0 and scan_y >= 0:
                        result = scanner(scan_x, scan_y)
                        if not result.get('empty', False):
                            print(f"Found grid: {result['name']} at ({scan_x}, {scan_y})")
                            return [scan_x, scan_y]
    
    print("No grids found!")
    return None

def smart_mining_loop():
    """Intelligent mining with dynamic decision making"""
    total_energy_used = 0
    cycles_completed = 0
    
    while cycles_completed < 5:
        print(f"\n=== Mining Cycle {cycles_completed + 1} ===")
        
        # Check our status
        energy = get_energy()
        pos = get_position()
        
        print(f"Energy: {energy}, Position: ({pos['x']}, {pos['y']})")
        
        # Dynamic energy management
        energy_threshold = 30 if cycles_completed < 2 else 20
        
        if energy < energy_threshold:
            print("Energy management needed...")
            nearest_dynamo = find_nearest_grid()
            
            if nearest_dynamo:
                print(f"Going to dynamo at {nearest_dynamo}")
                move_to(nearest_dynamo[0], nearest_dynamo[1])
                crank()
                energy_used = 5
            else:
                print("No dynamo found, continuing with low energy...")
                energy_used = 0
        else:
            energy_used = 0
        
        # Find and use mining terminal
        print("Looking for mining terminal...")
        mining_terminal = None
        
        # Try known positions first
        known_terminals = [[8, 6], [3, 3], [15, 8]]
        for terminal_pos in known_terminals:
            result = scanner(terminal_pos[0], terminal_pos[1])
            if result.get('type') == 'mining_terminal':
                mining_terminal = terminal_pos
                break
        
        if not mining_terminal:
            mining_terminal = find_nearest_grid()
        
        if mining_terminal:
            print(f"Mining at {mining_terminal}")
            move_to(mining_terminal[0], mining_terminal[1])
            
            # Check if we can mine
            status = scanner(mining_terminal[0], mining_terminal[1])
            if status['status']['status'] == 'idle':
                mine_initiate()
                energy_used = energy_used + 10
                
                # Wait for completion
                wait(13)  # 3s initiation + 10s mining
                collect()
                energy_used = energy_used + 5
                
                cycles_completed = cycles_completed + 1
                total_energy_used = total_energy_used + energy_used
                
                print(f"Cycle complete! Total energy used: {total_energy_used}")
            else:
                print("Terminal busy, waiting...")
                wait(5)
        else:
            print("No mining terminal found!")
            break
    
    print(f"\n=== Smart Mining Complete ===")
    print(f"Cycles completed: {cycles_completed}")
    print(f"Total energy used: {total_energy_used}")
    print(f"Average energy per cycle: {total_energy_used / max(cycles_completed, 1)}")

def main():
    print("=== Advanced Control Flow Demo ===")
    
    # Demonstrate all control flow features
    print("1. Moving in a square pattern...")
    move_in_square(3)
    
    print("\n2. Finding nearest grid...")
    nearest = find_nearest_grid()
    if nearest:
        print(f"Moving to nearest grid at {nearest}")
        move_to(nearest[0], nearest[1])
    
    print("\n3. Starting smart mining loop...")
    smart_mining_loop()
    
    print("\n=== Demo Complete! ===")
```

###  Complex Example: Automated Base Builder

```python
def scan_area(center_x, center_y, radius):
    """Scan an area and return empty positions"""
    empty_positions = []
    
    for x in range(center_x - radius, center_x + radius + 1):
        for y in range(center_y - radius, center_y + radius + 1):
            if x >= 0 and y >= 0:  # Valid coordinates
                result = scanner(x, y)
                if result.get('empty', False):
                    empty_positions.append([x, y])
    
    return empty_positions

def build_grid_pattern():
    """Build a systematic exploration pattern"""
    start_pos = get_position()
    center_x = start_pos['x']
    center_y = start_pos['y']
    
    print(f"Building exploration grid around ({center_x}, {center_y})")
    
    # Scan the area
    empty_spots = scan_area(center_x, center_y, 5)
    print(f"Found {len(empty_spots)} empty positions")
    
    # Visit positions in a specific pattern
    visited_count = 0
    max_visits = min(10, len(empty_spots))
    
    for i in range(max_visits):
        if i < len(empty_spots):
            pos = empty_spots[i]
            x, y = pos[0], pos[1]
            
            print(f"Visiting position {i + 1}: ({x}, {y})")
            move_to(x, y)
            
            # Do something at each position
            energy = get_energy()
            if energy < 30:
                print("Low energy break!")
                break
            
            wait(0.5)
            visited_count = visited_count + 1
    
    print(f"Grid pattern complete! Visited {visited_count} positions")

def main():
    print("=== Automated Base Builder ===")
    build_grid_pattern()
    print("Base building simulation complete!")
```

###  Pro Tips for Control Flow

1. **Indentation Matters**: Use 4 spaces for each level (like Python)
2. **Break and Continue**: Use in loops for flow control
3. **Nested Loops**: Supported with proper indentation
4. **Function Calls in Expressions**: `for i in range(5):` works!
5. **Variable Scope**: Variables are scoped to their function
6. **Error Handling**: Syntax errors will show helpful messages

###  Common Gotchas

```python
def main():
    #  GOOD: Proper indentation
    for i in range(3):
        print(f"Step {i}")
        if i == 1:
            print("Middle step!")
    
    #  BAD: Missing colon
    # for i in range(3)
    #     print(i)
    
    #  GOOD: Using range properly
    for x in range(5, 10, 2):  # 5, 7, 9
        move_right()
    
    #  GOOD: Nested conditions
    energy = get_energy()
    if energy > 50:
        if energy > 80:
            print("Full energy!")
        else:
            print("Good energy")
    else:
        print("Low energy")
```

##  Demo 3: Original Scanner Demo

```python
def scan_all_grids():
    print("=== Scanning all grids ===")
    
    # Define known grid positions
    grid_positions = [
        [8, 6, "Mining Terminal"],
        [12, 6, "Dynamo"],
        [16, 6, "Wallet"]
    ]
    
    for grid_pos in grid_positions:
        x, y, name = grid_pos[0], grid_pos[1], grid_pos[2]
        result = scanner(x, y)
        print(f"{name} at ({x}, {y}): {result['status']}")
        wait(1)

def main():
    print("=== Scanner Demo ===")
    scan_all_grids()
    print("Scanning complete!")
```

##  Conclusion

Binary Coven now features a **complete Python-like programming environment** with:

 **Full Control Flow**: if/elif/else, while loops, for loops  
 **Proper Indentation**: 4-space Python-style blocks  
 **Rich Built-ins**: range(), len(), abs(), min(), max(), sum()  
 **Expression Evaluation**: Comparisons, logical operators, arithmetic  
 **Variable Scope**: Function-local variables  
 **Error Handling**: Clear syntax error messages  
 **Break/Continue**: Full loop control support  

Start simple with the basic demos, then work your way up to the complex automation examples. The sky's the limit for what you can program your qubits to do!  