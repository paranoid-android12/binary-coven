import React, { useRef, useState, useEffect } from 'react';
import { PhaserGame, IRefPhaserGame } from '../PhaserGame';
import CodeWindow from './CodeWindow';
import { useGameStore } from '../stores/gameStore';
import { ProgrammingGame } from '../game/scenes/ProgrammingGame';
import { BuiltInFunctionRegistry } from '../game/systems/BuiltInFunctions';

export const GameInterface: React.FC = () => {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [activeWindowId, setActiveWindowId] = useState<string>('');
  
  // Game store state
  const {
    codeWindows,
    entities,
    activeEntityId,
    globalResources,
    isPaused,
    addCodeWindow,
    removeCodeWindow,
    setMainWindow,
    startExecution,
    stopExecution
  } = useGameStore();

  const [isCodeRunning, setIsCodeRunning] = useState(false);

  // Initialize Monaco editor language features
  useEffect(() => {
    // This would be where we set up custom language features for our Python-like language
    // For now, we'll use the standard Python language support
  }, []);

  const handleCreateNewWindow = () => {
    const windowName = prompt('Enter function name:');
    if (windowName && windowName.trim()) {
      const newWindowId = addCodeWindow({
        name: windowName.trim(),
        code: `# ${windowName} function\ndef ${windowName}():\n    # Your code here\n    pass`,
        isMain: false,
        isActive: true,
        position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
        size: { width: 400, height: 300 }
      });
      setActiveWindowId(newWindowId);
    }
  };

  const handleCloseWindow = (windowId: string) => {
    const window = codeWindows.get(windowId);
    if (window?.isMain) {
      alert('Cannot close the main function window');
      return;
    }
    removeCodeWindow(windowId);
    if (activeWindowId === windowId) {
      setActiveWindowId('');
    }
  };

  const handleRunCode = () => {
    console.log('handleRunCode called, isCodeRunning:', isCodeRunning);
    console.log('phaserRef.current:', phaserRef.current);
    console.log('activeEntityId:', activeEntityId);
    
    if (isCodeRunning) {
      // Stop execution
      setIsCodeRunning(false);
      stopExecution();
      
      const scene = phaserRef.current?.scene as ProgrammingGame;
      console.log('Stop - scene:', scene);
      if (scene && scene.stopCodeExecution) {
        scene.stopCodeExecution();
      }
    } else {
      // Start execution
      setIsCodeRunning(true);
      startExecution(activeEntityId);
      
      const scene = phaserRef.current?.scene as ProgrammingGame;
      console.log('Start - scene:', scene);
      console.log('Start - scene.startCodeExecution:', scene?.startCodeExecution);
      
      if (scene && scene.startCodeExecution) {
        console.log('Calling scene.startCodeExecution()');
        scene.startCodeExecution();
      } else {
        console.warn('Scene or startCodeExecution method not available');
      }
    }
  };

  const handleResetGame = () => {
    if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
      useGameStore.getState().resetGame();
      useGameStore.getState().initializeGame();
      setIsCodeRunning(false);
    }
  };

  const currentActiveScene = (scene: Phaser.Scene) => {
    console.log('Current scene:', scene.scene.key);
  };

  const activeEntity = entities.get(activeEntityId);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Top Toolbar */}
      <div style={{
        backgroundColor: '#2d2d30',
        color: 'white',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #3c3c3c',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Binary Coven - Block Programming Game
          </h1>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCreateNewWindow}
              style={{
                backgroundColor: '#007acc',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + New Function
            </button>
            
            <button
              onClick={handleRunCode}
              style={{
                backgroundColor: isCodeRunning ? '#e81123' : '#16c60c',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {isCodeRunning ? '⏹ Stop' : '▶ Run'}
            </button>
            
            <button
              onClick={handleResetGame}
              style={{
                backgroundColor: '#f5a623',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Resource Display */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
          <div>⚡ Energy: {activeEntity?.stats.energy || 0}/{activeEntity?.stats.maxEnergy || 0}</div>
          <div>₿ Bitcoin: {globalResources.bitcoin || 0}</div>
          <div>💰 Currency: {globalResources.currency || 0}</div>
          {isPaused && <div style={{ color: '#f5a623' }}>⏸ PAUSED</div>}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
        {/* Game Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <PhaserGame ref={phaserRef} currentActiveScene={currentActiveScene} />
          
          {/* Code Windows Overlay */}
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            pointerEvents: 'none',
            zIndex: 100
          }}>
            {Array.from(codeWindows.values()).map(window => (
              <div key={window.id} style={{ pointerEvents: 'auto' }}>
                <CodeWindow
                  window={window}
                  onClose={() => handleCloseWindow(window.id)}
                  onFocus={() => setActiveWindowId(window.id)}
                  isActive={activeWindowId === window.id}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{
          width: '300px',
          backgroundColor: '#252526',
          borderLeft: '1px solid #3c3c3c',
          color: 'white',
          padding: '16px',
          overflow: 'auto'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Game Info</h3>
          
          {/* Entity Info */}
          {activeEntity && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>Active Entity</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                <div><strong>Name:</strong> {activeEntity.name}</div>
                <div><strong>Type:</strong> {activeEntity.type}</div>
                <div><strong>Position:</strong> ({activeEntity.position.x}, {activeEntity.position.y})</div>
                <div><strong>Walking Speed:</strong> {activeEntity.stats.walkingSpeed}x</div>
                <div><strong>Inventory:</strong> {activeEntity.inventory.items.length}/{activeEntity.inventory.capacity}</div>
              </div>
            </div>
          )}

          {/* Available Functions */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>Built-in Functions</h4>
            <div style={{ fontSize: '12px' }}>
              {BuiltInFunctionRegistry.getFunctionsByCategory('movement').map(func => (
                <div key={func.name} style={{ marginBottom: '4px' }}>
                  <code style={{ backgroundColor: '#1e1e1e', padding: '2px 4px', borderRadius: '2px' }}>
                    {func.name}()
                  </code>
                  <div style={{ color: '#cccccc', fontSize: '11px', marginLeft: '8px' }}>
                    {func.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Functions */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>Grid Functions</h4>
            <div style={{ fontSize: '12px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Mining Terminal:</strong>
                <div style={{ marginLeft: '8px', color: '#cccccc' }}>
                  <div>mine_initiate() - Start mining</div>
                  <div>collect() - Collect bitcoins</div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Dynamo:</strong>
                <div style={{ marginLeft: '8px', color: '#cccccc' }}>
                  <div>crank() - Generate energy</div>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Wallet:</strong>
                <div style={{ marginLeft: '8px', color: '#cccccc' }}>
                  <div>store(amount) - Store bitcoins</div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Windows */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>Code Windows</h4>
            <div style={{ fontSize: '14px' }}>
              {Array.from(codeWindows.values()).map(window => (
                <div 
                  key={window.id}
                  style={{ 
                    marginBottom: '4px',
                    padding: '4px 8px',
                    backgroundColor: activeWindowId === window.id ? '#007acc' : '#1e1e1e',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveWindowId(window.id)}
                >
                  <span>{window.name}</span>
                  {window.isMain && <span style={{ color: '#f5a623' }}> (MAIN)</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameInterface; 