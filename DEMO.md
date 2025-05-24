# 🎮 Binary Coven Demo Guide

Welcome to Binary Coven! This guide will walk you through the basic gameplay and show you how to write your first programs.

## 🚀 Quick Start

1. **Start the game**: Run `npm run dev` and open `http://localhost:8080`
2. **Familiarize yourself**: You'll see:
   - A grid-based game world with colored squares
   - A blue square (your qubit robot)
   - Yellow, green, and purple squares (mining terminal, dynamo, wallet)
   - A code window with the main function
   - A control panel on the right

## 📝 Your First Program

Try this simple program in the main function:

```python
# Main function - execution starts here
def main():
    print("Hello, Binary Coven!")
    
    # Check current position
    pos = get_position()
    print("Starting at position:", pos)
    
    # Move around a bit
    move_right()
    move_right()
    move_down()
    
    # Check energy
    energy = get_energy()
    print("Current energy:", energy)
```

**To run**: Click the green "▶ Run" button in the top toolbar.

## ⛏️ Bitcoin Mining Demo

This program demonstrates the full mining workflow:

```python
def main():
    print("Starting bitcoin mining demo!")
    
    # Go to dynamo first to get energy
    move_to(6, 3)
    print("At dynamo, cranking for energy...")
    crank()
    
    # Wait for energy generation
    wait(10)
    print("Energy generated!")
    
    # Now go mine bitcoins
    move_to(3, 3)
    print("At mining terminal, starting mining...")
    mine_initiate()
    
    # Wait for mining to complete
    wait(5)
    print("Mining complete, collecting...")
    collect()
    
    # Store the bitcoins
    move_to(9, 3)
    print("At wallet, storing bitcoins...")
    store(1)
    
    print("Demo complete! Check your currency in the top right.")
```

## 🔧 Advanced Example: Automation Loop

Create a new function by clicking "+ New Function" and name it "mining_loop":

```python
def mining_loop():
    for i in range(3):  # Mine 3 times
        # Generate energy
        move_to(6, 3)
        crank()
        wait(10)
        
        # Mine bitcoin
        move_to(3, 3) 
        mine_initiate()
        wait(5)
        collect()
        
        # Store bitcoin
        move_to(9, 3)
        store(1)
        
        print(f"Completed mining cycle {i + 1}")
    
    print("All mining cycles complete!")

def main():
    print("Starting automated mining operation...")
    mining_loop()
```

## 🎯 Tips & Tricks

### Energy Management
- Always check energy with `get_energy()` before operations
- Use the dynamo to generate energy when running low
- Different actions consume different amounts of energy

### Positioning
- Use `get_current_grid()` to see what you're standing on
- `move_to(x, y)` is more efficient than multiple single moves
- The grid coordinates start at (0, 0) in the top-left

### Debugging
- Use `print()` statements to debug your code
- Check the browser console for detailed output
- Watch the qubit move in real-time to verify your logic

### Function Organization
- Break complex tasks into smaller functions
- Use descriptive function names
- The main function is your entry point

## 🐛 Common Issues

**"Function not found"**: Make sure you've created the function in a separate code window
**"Not enough energy"**: Use the dynamo to generate more energy
**"Cannot move"**: Check if you're trying to move outside the grid bounds
**"No bitcoins ready"**: Make sure mining has completed (takes 5 seconds)

## 🎮 Game Controls

- **Arrow Keys**: Manual movement (for testing)
- **Drag**: Move code windows around
- **Resize**: Drag the blue corner to resize windows
- **Run/Stop**: Control code execution
- **Reset**: Start fresh with initial state

## 🌟 What's Next?

Try these challenges:
1. **Efficiency Challenge**: Mine 10 bitcoins using the least energy
2. **Automation Challenge**: Create a fully automated mining operation
3. **Resource Management**: Balance energy generation and consumption
4. **Exploration Challenge**: Visit all grid types in optimal order

Happy coding! 🚀 