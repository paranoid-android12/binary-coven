import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useGameStore } from '../stores/gameStore';
import { Entity, CodeWindow } from '../types/game';
import { EventBus } from '../game/EventBus';
import { BuiltInFunctionRegistry } from '../game/systems/BuiltInFunctions';

interface ProgrammingInterfaceProps {
  entity: Entity;
}

// Preset code templates
const PRESET_TEMPLATES = {
  'basic_movement': {
    name: 'Basic Movement',
    description: 'Simple movement pattern',
    code: `# Basic Movement Example
def main():
    # Move in a square pattern
    move_right()
    move_down()
    move_left()
    move_up()`
  },
  'farming_loop': {
    name: 'Plant & Harvest Loop',
    description: 'Basic farming cycle',
    code: `# Plant and Harvest Loop
def main():
    # Loop through 5 cycles of planting and harvesting
    for i in range(5):
        plant()
        # Wait for crops to grow
        sleep(5000)
        harvest()
        move_right()`
  },
  'movement_loop': {
    name: 'Movement Loop',
    description: 'Repeated movement pattern',
    code: `# Movement Loop Example
def main():
    # Move in a pattern 10 times
    for i in range(10):
        move_right()
        move_down()
        move_left()
        move_up()`
  },
  'energy_management': {
    name: 'Energy Management',
    description: 'Monitor and restore energy',
    code: `# Energy Management Example
def main():
    # Work until low energy, then rest
    while True:
        energy_info = get_energy()
        
        # If energy is low, go rest
        if energy_info['energy'] < 20:
            move_to(5, 5)  # Move to rest area
            sleep(3000)  # Rest for 3 seconds
        else:
            # Continue working
            move_to(10, 10)
            plant()
            sleep(5000)
            harvest()`
  },
  'smart_farming': {
    name: 'Smart Farming',
    description: 'Advanced farming with conditions',
    code: `# Smart Farming Example
def main():
    # Farm multiple plots intelligently
    farm_positions = [
        (8, 8), (9, 8), (10, 8),
        (8, 9), (9, 9), (10, 9)
    ]
    
    # Plant all plots
    for x, y in farm_positions:
        move_to(x, y)
        plant()
    
    # Wait for crops to grow
    sleep(10000)
    
    # Harvest all plots
    for x, y in farm_positions:
        move_to(x, y)
        # Check if ready before harvesting
        if can_harvest():
            harvest()`
  },
  'patrol_pattern': {
    name: 'Patrol Pattern',
    description: 'Regular patrol movement',
    code: `# Patrol Pattern Example
def main():
    # Define patrol points
    patrol_points = [
        (5, 5), (15, 5), (15, 15), (5, 15)
    ]
    
    # Patrol continuously
    while True:
        for x, y in patrol_points:
            move_to(x, y)
            sleep(1000)  # Pause at each point`
  }
};

// ---- Quick command reference ----
interface CommandItem {
  key: string;
  signature: string;   // shown to the user, e.g. "move_to(x, y)"
  description: string;
  snippet: string;     // copied to clipboard (usually === signature)
}
interface CommandGroup {
  label: string;
  items: CommandItem[];
}

// Common Python constructs — not built-in functions, but the things learners
// type most often. Snippets include a trailing indent so they're ready to fill in.
const SYNTAX_SNIPPETS: CommandGroup = {
  label: 'Python Syntax',
  items: [
    { key: 'syntax-for', signature: 'for i in range(n):', description: 'Repeat something n times', snippet: 'for i in range(5):\n    ' },
    { key: 'syntax-while', signature: 'while condition:', description: 'Loop while a condition holds', snippet: 'while True:\n    ' },
    { key: 'syntax-if', signature: 'if condition:', description: 'Run code only when true', snippet: 'if condition:\n    ' },
    { key: 'syntax-ifelse', signature: 'if / else:', description: 'Choose between two paths', snippet: 'if condition:\n    \nelse:\n    ' },
    { key: 'syntax-def', signature: 'def name():', description: 'Define your own function', snippet: 'def my_function():\n    ' },
    { key: 'syntax-var', signature: 'x = value', description: 'Store a value in a variable', snippet: 'x = 0' },
    { key: 'syntax-list', signature: 'items = [...]', description: 'Make a list of values', snippet: 'items = [1, 2, 3]' },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  movement: 'Movement',
  interaction: 'Interaction',
  system: 'System',
  utility: 'Utility',
  arrays: 'Lists',
  objects: 'Objects',
  control_flow: 'Control Flow',
};
const CATEGORY_ORDER = ['movement', 'interaction', 'system', 'utility', 'arrays', 'objects', 'control_flow'];

// Build the reference straight from the live built-in registry so it always
// matches what the interpreter actually supports. Internal debug_* helpers are hidden.
const buildCommandGroups = (): CommandGroup[] => {
  const byCategory = new Map<string, CommandItem[]>();

  BuiltInFunctionRegistry.getAllFunctions()
    .filter((func) => !func.name.startsWith('debug_'))
    .forEach((func) => {
      const params = func.parameters.map((p) => p.name).join(', ');
      const signature = `${func.name}(${params})`;
      const item: CommandItem = {
        key: func.name,
        signature,
        description: func.description,
        snippet: signature,
      };
      if (!byCategory.has(func.category)) byCategory.set(func.category, []);
      byCategory.get(func.category)!.push(item);
    });

  const groups = CATEGORY_ORDER
    .filter((cat) => byCategory.has(cat))
    .map((cat) => ({ label: CATEGORY_LABELS[cat] ?? cat, items: byCategory.get(cat)! }));

  return [SYNTAX_SNIPPETS, ...groups];
};

export const ProgrammingInterface: React.FC<ProgrammingInterfaceProps> = ({ entity }) => {
  const { 
    codeWindows, 
    addCodeWindow, 
    updateCodeWindow, 
    removeCodeWindow, 
    setMainWindow,
    getDroneCodeWindows,
    updateDroneCodeWindow,
    addDroneCodeWindow,
    removeDroneCodeWindow
  } = useGameStore();
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Quick-reference command list, built once from the live registry
  const commandGroups = React.useMemo(() => buildCommandGroups(), []);

  const filteredCommandGroups = React.useMemo(() => {
    const q = commandSearch.trim().toLowerCase();
    if (!q) return commandGroups;
    return commandGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.signature.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [commandGroups, commandSearch]);

  const handleCopyCommand = async (item: CommandItem) => {
    try {
      await navigator.clipboard.writeText(item.snippet);
      setCopiedCommand(item.key);
      setTimeout(() => setCopiedCommand((current) => (current === item.key ? null : current)), 1200);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); fail silently
    }
  };

  // Check if entity is a drone
  const isDrone = entity.isDrone === true;

  // Get appropriate code windows (drone's own or player's)
  // Note: entity.codeWindows may be a plain object after JSON deserialization (save/load),
  // so we need to ensure it's always a Map before using Map methods.
  const entityCodeWindows = React.useMemo(() => {
    if (isDrone && entity.codeWindows) {
      if (entity.codeWindows instanceof Map) {
        return entity.codeWindows;
      }
      // Convert plain object back to Map (happens after save/load cycle)
      const map = new Map<string, CodeWindow>();
      const obj = entity.codeWindows as any;
      if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          map.set(key, value as CodeWindow);
        });
      }
      return map;
    }
    return codeWindows;
  }, [isDrone, entity.codeWindows, codeWindows]);

  // Get all code windows as an array
  const functions = Array.from(entityCodeWindows.values());
  const selectedFunction = selectedFunctionId ? entityCodeWindows.get(selectedFunctionId) : functions.find(f => f.isMain);

  // Auto-select main function if nothing is selected
  React.useEffect(() => {
    if (!selectedFunctionId && functions.length > 0) {
      const mainFunc = functions.find(f => f.isMain);
      if (mainFunc) {
        setSelectedFunctionId(mainFunc.id);
      }
    }
  }, [functions, selectedFunctionId]);

  // Close preset menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPresetMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.preset-menu-container')) {
          setShowPresetMenu(false);
        }
      }
    };

    if (showPresetMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPresetMenu]);

  const handleCreateFunction = () => {
    const functionName = prompt('Enter function name:');
    if (functionName && functionName.trim()) {
      const name = functionName.trim();
      
      // Check if function already exists
      const exists = functions.some(f => f.name === name);
      if (exists) {
        alert('A function with this name already exists!');
        return;
      }

      const newFunctionId = isDrone
        ? addDroneCodeWindow(entity.id, {
            name,
            code: `# ${name} function\ndef ${name}():\n    # Your code here\n    pass`,
            isMain: false,
            isActive: true,
            position: { x: 50, y: 50 },
            size: { width: 400, height: 300 }
          })
        : addCodeWindow({
            name,
            code: `# ${name} function\ndef ${name}():\n    # Your code here\n    pass`,
            isMain: false,
            isActive: true,
            position: { x: 50, y: 50 },
            size: { width: 400, height: 300 }
          });
      
      setSelectedFunctionId(newFunctionId);
    }
  };

  const handleDeleteFunction = (functionId: string) => {
    const func = entityCodeWindows.get(functionId);
    if (func?.isMain) {
      alert('Cannot delete the main function!');
      return;
    }

    if (confirm(`Are you sure you want to delete the function "${func?.name}"?`)) {
      if (isDrone) {
        removeDroneCodeWindow(entity.id, functionId);
      } else {
        removeCodeWindow(functionId);
      }
      
      // Select main function if we deleted the selected one
      if (selectedFunctionId === functionId) {
        const mainFunc = functions.find(f => f.isMain);
        setSelectedFunctionId(mainFunc?.id || '');
      }
    }
  };

  const handleSetAsMain = (functionId: string) => {
    // Main window switching only for player, not drones
    if (!isDrone) {
      setMainWindow(functionId);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFunction && value !== undefined) {
      if (isDrone) {
        updateDroneCodeWindow(entity.id, selectedFunction.id, { code: value });
      } else {
        updateCodeWindow(selectedFunction.id, { code: value });
      }
      // Emit tutorial event for code content changes
      EventBus.emit('tutorial-code-changed', { content: value });
    }
  };

  const handleLoadPreset = (presetKey: string) => {
    const preset = PRESET_TEMPLATES[presetKey as keyof typeof PRESET_TEMPLATES];
    if (selectedFunction && preset) {
      if (selectedFunction.code.trim() !== '' && 
          selectedFunction.code !== '# Main function - execution starts here\ndef main():\n    # Your code here\n    pass') {
        if (!confirm('This will replace your current code. Continue?')) {
          setShowPresetMenu(false);
          return;
        }
      }
      if (isDrone) {
        updateDroneCodeWindow(entity.id, selectedFunction.id, { code: preset.code });
      } else {
        updateCodeWindow(selectedFunction.id, { code: preset.code });
      }
      setShowPresetMenu(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100%', 
      backgroundColor: '#1e1e1e',
      color: 'white'
    }}>
      {/* Left Sidebar - Function List */}
      <div style={{
        width: '250px',
        backgroundColor: '#252526',
        borderRight: '1px solid #3c3c3c',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#007acc' }}>Functions</h4>
          <button
            onClick={handleCreateFunction}
            style={{
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Create new function"
          >
            +
          </button>
        </div>

        {/* Function List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {functions.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              color: '#888', 
              fontSize: '12px',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              No functions available
            </div>
          ) : (
            functions.map((func) => (
              <div
                key={func.id}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  backgroundColor: selectedFunctionId === func.id ? '#007acc' : 'transparent',
                  borderBottom: '1px solid #3c3c3c',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '14px'
                }}
                onClick={() => setSelectedFunctionId(func.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{func.name}</span>
                  {func.isMain && (
                    <span style={{
                      backgroundColor: '#f5a623',
                      color: 'white',
                      padding: '1px 4px',
                      borderRadius: '2px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      MAIN
                    </span>
                  )}
                </div>
                
                {/* Function Actions */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {!func.isMain && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAsMain(func.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px'
                      }}
                      title="Set as main function"
                    >
                      ⭐
                    </button>
                  )}
                  {!func.isMain && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFunction(func.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e81123',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px'
                      }}
                      title="Delete function"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #3c3c3c',
          fontSize: '12px',
          color: '#888'
        }}>
          {functions.length} function{functions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Right Side - Code Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedFunction ? (
          <>
            {/* Editor Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #3c3c3c',
              backgroundColor: '#2d2d30',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Preset Templates Button */}
                <div className="preset-menu-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowPresetMenu(!showPresetMenu)}
                    style={{
                      backgroundColor: '#1e1e1e',
                      color: 'white',
                      border: '#7e7e7e',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Load preset code templates"
                  >
                    Templates
                  </button>
                  
                  {/* Preset Dropdown Menu */}
                  {showPresetMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#2d2d30',
                      border: '1px solid #3c3c3c',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      zIndex: 1000,
                      minWidth: '250px',
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
                      <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #3c3c3c',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#16c60c'
                      }}>
                        Select a Template
                      </div>
                      {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
                        <div
                          key={key}
                          onClick={() => handleLoadPreset(key)}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid #3c3c3c',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#3c3c3c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{
                            fontWeight: 'bold',
                            fontSize: '13px',
                            marginBottom: '4px',
                            color: '#16c60c'
                          }}>
                            {template.name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#888',
                            lineHeight: '1.3'
                          }}>
                            {template.description}
                          </div>
                        </div>
                      ))}
                      <div
                        onClick={() => setShowPresetMenu(false)}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          fontSize: '12px',
                          color: '#888',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#3c3c3c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Cancel
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  Python-like syntax
                </div>
              </div>

              {/* Quick command reference toggle */}
              <button
                onClick={() => setShowCommands((v) => !v)}
                style={{
                  backgroundColor: showCommands ? '#007acc' : '#1e1e1e',
                  color: 'white',
                  border: '1px solid #3c3c3c',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
                title="Quick reference of commands you can copy"
              >
                📋 Commands
              </button>
            </div>

            {/* Monaco Editor */}
            <div style={{ flex: 1 }}>
              <Editor
                height="100%"
                defaultLanguage="python"
                value={selectedFunction.code}
                onChange={handleCodeChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 18,
                  letterSpacing: 1,
                  fontFamily: 'BoldPixels',
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  selectOnLineNumbers: true,
                  automaticLayout: true,
                  wordWrap: 'on',
                  contextmenu: true,
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3,
                  glyphMargin: false
                }}
              />
            </div>

            {/* Editor Footer */}
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid #3c3c3c',
              backgroundColor: '#2d2d30',
              fontSize: '12px',
              color: '#888',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>
                Lines: {selectedFunction.code.split('\n').length}
              </span>
              <span>
                {selectedFunction.isMain ? 'Entry point function' : 'User-defined function'}
              </span>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#888',
            fontSize: '16px'
          }}>
            <div style={{ marginBottom: '16px', fontSize: '48px' }}></div>
            <div>No function selected</div>
            <div style={{ fontSize: '14px', marginTop: '8px' }}>
              Select a function from the left panel to edit its code
            </div>
          </div>
        )}
      </div>

      {/* Quick Reference Panel - copyable commands */}
      {showCommands && (
        <div style={{
          width: '290px',
          flexShrink: 0,
          backgroundColor: '#252526',
          borderLeft: '1px solid #3c3c3c',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #3c3c3c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#007acc' }}>Quick Reference</h4>
            <button
              onClick={() => setShowCommands(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
                padding: '2px'
              }}
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #3c3c3c' }}>
            <input
              type="text"
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
              placeholder="Search commands..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#1e1e1e',
                color: 'white',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Command list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {filteredCommandGroups.length === 0 ? (
              <div style={{ padding: '16px', color: '#888', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                No commands match "{commandSearch}"
              </div>
            ) : (
              filteredCommandGroups.map((group) => (
                <div key={group.label} style={{ marginBottom: '4px' }}>
                  <div style={{
                    padding: '8px 16px 4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    color: '#16c60c'
                  }}>
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const isCopied = copiedCommand === item.key;
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleCopyCommand(item)}
                        style={{
                          padding: '6px 16px',
                          cursor: 'pointer',
                          borderLeft: '2px solid transparent',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2d2d30'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title="Click to copy"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <code style={{
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontSize: '12px',
                            color: '#9cdcfe',
                            wordBreak: 'break-word'
                          }}>
                            {item.signature}
                          </code>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: isCopied ? '#16c60c' : '#666',
                            flexShrink: 0
                          }}>
                            {isCopied ? '✓ Copied' : 'copy'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', lineHeight: 1.3 }}>
                          {item.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid #3c3c3c',
            fontSize: '11px',
            color: '#888'
          }}>
            Click any command to copy it
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgrammingInterface;