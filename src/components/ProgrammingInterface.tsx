import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useGameStore } from '../stores/gameStore';
import { Entity, CodeWindow } from '../types/game';
import { EventBus } from '../game/EventBus';

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

export const ProgrammingInterface: React.FC<ProgrammingInterfaceProps> = ({ entity }) => {
  const { codeWindows, addCodeWindow, updateCodeWindow, removeCodeWindow, setMainWindow } = useGameStore();
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  // Get all code windows as an array
  const functions = Array.from(codeWindows.values());
  const selectedFunction = selectedFunctionId ? codeWindows.get(selectedFunctionId) : functions.find(f => f.isMain);

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

      const newFunctionId = addCodeWindow({
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
    const func = codeWindows.get(functionId);
    if (func?.isMain) {
      alert('Cannot delete the main function!');
      return;
    }

    if (confirm(`Are you sure you want to delete the function "${func?.name}"?`)) {
      removeCodeWindow(functionId);
      
      // Select main function if we deleted the selected one
      if (selectedFunctionId === functionId) {
        const mainFunc = functions.find(f => f.isMain);
        setSelectedFunctionId(mainFunc?.id || '');
      }
    }
  };

  const handleSetAsMain = (functionId: string) => {
    setMainWindow(functionId);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFunction && value !== undefined) {
      updateCodeWindow(selectedFunction.id, { code: value });
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
      updateCodeWindow(selectedFunction.id, { code: preset.code });
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{selectedFunction.name}</span>
                {selectedFunction.isMain && (
                  <span style={{
                    backgroundColor: '#f5a623',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    MAIN FUNCTION
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Preset Templates Button */}
                <div className="preset-menu-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowPresetMenu(!showPresetMenu)}
                    style={{
                      backgroundColor: '#16c60c',
                      color: 'white',
                      border: 'none',
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
                    📋 Templates
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
    </div>
  );
};

export default ProgrammingInterface; 