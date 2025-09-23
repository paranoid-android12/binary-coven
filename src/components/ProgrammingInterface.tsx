import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useGameStore } from '../stores/gameStore';
import { Entity, CodeWindow } from '../types/game';
import { EventBus } from '../game/EventBus';

interface ProgrammingInterfaceProps {
  entity: Entity;
}

export const ProgrammingInterface: React.FC<ProgrammingInterfaceProps> = ({ entity }) => {
  const { codeWindows, addCodeWindow, updateCodeWindow, removeCodeWindow, setMainWindow } = useGameStore();
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('');

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
              <div style={{ fontSize: '12px', color: '#888' }}>
                Python-like syntax
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