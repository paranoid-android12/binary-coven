# 🎮 Binary Coven Demo Guide

Welcome to Binary Coven! This guide will walk you through the new grid function system with progress tracking and task management.

## 🚀 Quick Start

1. **Start the game**: Run `npm run dev` and open `http://localhost:8080`
2. **Familiarize yourself**: You'll see:
   - A grid-based game world with colored squares
   - A blue square (your qubit robot)
   - Yellow, green, and purple squares (mining terminal, dynamo, wallet)
   - Progress bars appear above entities/grids during tasks
   - Visual indicators for busy states (orange tint for entities, yellow for grids)
3. **Open Programming Interface**: Click on the blue qubit to open its status modal
4. **Switch to Program Tab**: Click the "Program" tab to access the code editor

## 📝 New Grid Function System

### 🏭 Mining Terminal Functions
- **`mine_initiate()`**: 
  - Entity blocks for 3 seconds (initiation)
  - Terminal then mines for 10 seconds independently
  - Costs 10 energy
  - Must be standing on the terminal
  
- **`collect()`**:
  - Collects ready bitcoins
  - Costs 5 energy
  - Only works when terminal shows "ready" status

### ⚡ Dynamo Functions
- **`crank()`**:
  - Entity blocks for 10 seconds
  - Restores energy to full
  - Costs 5 energy initially
  - Must be standing on the dynamo

### 💰 Wallet Functions
- **`store(amount)`**:
  - Stores bitcoins as spendable currency
  - Costs 2 energy
  - Must be standing on the wallet
  - Example: `store(3)` stores 3 bitcoins

### 🔍 Scanner Function
- **`scanner(x, y)`**:
  - Scans any grid at coordinates
  - Returns detailed status information
  - Costs 2 energy
  - Works from any position

## 🎯 Demo 1: Basic Mining with Progress Tracking

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

## 🎯 Demo 2: Advanced Automation with Error Handling

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

## 🎯 Demo 3: Scanner and Status Monitoring

```python
def scan_all_grids():
    print("=== Scanning all grids ===")
    
    # Define grid positions
    grids = [
        (3, 3, "Mining Terminal"),
        (6, 3, "Dynamo"), 
        (9, 3, "Wallet")
    ]
    
    for x, y, name in grids:
        print(f"\nScanning {name} at ({x}, {y}):")
        status = scanner(x, y)
        
        if status['empty']:
            print(f"  No grid found at ({x}, {y})")
        else:
            print(f"  Type: {status['type']}")
            print(f"  Status: {status['status']}")
            print(f"  Available functions: {status['functions']}")

def monitor_mining():
    print("=== Real-time Mining Monitor ===")
    
    # Start mining
    move_to(3, 3)
    mine_initiate()
    
    # Monitor progress
    for i in range(15):  # Monitor for 15 seconds
        status = scanner(3, 3)
        print(f"Time {i}s - Status: {status['status']['status']}")
        
        if status['status']['bitcoinReady']:
            print("Bitcoin ready for collection!")
            break
            
        wait(1)
    
    # Collect when ready
    collect()

def main():
    print("=== Scanner Demo ===")
    
    # First, scan all grids to see their status
    scan_all_grids()
    
    # Then monitor a mining operation
    monitor_mining()
    
    print("Scanner demo complete!")
```

## 🎮 Key Features to Test

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

## 🐛 Common Issues & Solutions

**"Entity is currently busy"**: Wait for current task to complete or check progress
**"Grid is currently busy"**: Another entity is using the grid, wait your turn
**"Not enough energy"**: Use the dynamo to restore energy
**"No bitcoins ready"**: Mining hasn't completed yet, use scanner to check status
**"Must be standing on grid"**: Move to the grid position before using its functions

## 🎯 Advanced Challenges

1. **Efficiency Challenge**: Mine 10 bitcoins using minimal energy
2. **Parallel Processing**: Use scanner to monitor multiple operations
3. **Error Recovery**: Handle all possible error conditions gracefully
4. **Resource Optimization**: Balance energy usage with bitcoin production
5. **Status Dashboard**: Create a comprehensive monitoring system

## 🌟 What's New

- **Progress Tracking**: Visual progress bars and real-time updates
- **Task Management**: Proper blocking and error handling
- **Scanner Function**: Remote grid status monitoring
- **Enhanced Visuals**: Better visual feedback for all states
- **Robust Error Handling**: Clear error messages and recovery

Happy coding with the new grid function system! 🚀 