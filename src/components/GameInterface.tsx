import React, { useRef, useState, useEffect } from 'react';
import { PhaserGame, IRefPhaserGame } from '../PhaserGame';
import StatusModal from './StatusModal';
import { useGameStore } from '../stores/gameStore';
import { ProgrammingGame } from '../game/scenes/ProgrammingGame';
import { BuiltInFunctionRegistry } from '../game/systems/BuiltInFunctions';
import { EventBus } from '../game/EventBus';
import { Entity, GridTile } from '../types/game';

export const GameInterface: React.FC = () => {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    entity?: Entity;
    grid?: GridTile;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    position: { x: 100, y: 100 }
  });
  
  // Panel collapse state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  
  // Game store state
  const {
    entities,
    activeEntityId,
    globalResources,
    isPaused,
    startExecution,
    stopExecution
  } = useGameStore();

  const [isCodeRunning, setIsCodeRunning] = useState(false);

  // Handle entity/grid clicks from Phaser
  useEffect(() => {
    const handleEntityClick = (entity: Entity) => {
      setModalState({
        isOpen: true,
        entity,
        grid: undefined,
        position: { x: 100, y: 100 }
      });
    };

    const handleGridClick = (grid: GridTile) => {
      setModalState({
        isOpen: true,
        entity: undefined,
        grid,
        position: { x: 100, y: 100 }
      });
    };

    // Handle code execution events
    const handleExecutionStarted = () => {
      console.log('Code execution started');
      setIsCodeRunning(true);
    };

    const handleExecutionCompleted = (result: any) => {
      console.log('Code execution completed:', result);
      setIsCodeRunning(false);
    };

    const handleExecutionFailed = (error: string) => {
      console.log('Code execution failed:', error);
      setIsCodeRunning(false);
    };

    const handleExecutionStopped = () => {
      console.log('Code execution stopped');
      setIsCodeRunning(false);
    };

    EventBus.on('entity-clicked', handleEntityClick);
    EventBus.on('grid-clicked', handleGridClick);
    EventBus.on('code-execution-started', handleExecutionStarted);
    EventBus.on('code-execution-completed', handleExecutionCompleted);
    EventBus.on('code-execution-failed', handleExecutionFailed);
    EventBus.on('code-execution-stopped', handleExecutionStopped);

    return () => {
      EventBus.removeListener('entity-clicked');
      EventBus.removeListener('grid-clicked');
      EventBus.removeListener('code-execution-started');
      EventBus.removeListener('code-execution-completed');
      EventBus.removeListener('code-execution-failed');
      EventBus.removeListener('code-execution-stopped');
    };
  }, []);

  const handleCloseModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalPositionChange = (position: { x: number; y: number }) => {
    setModalState(prev => ({ ...prev, position }));
  };

  const handleRunCode = () => {
    if (isCodeRunning) {
      console.log('Stopping execution');
      // Stop execution - the event listener will handle state change
      stopExecution();
      
      const scene = phaserRef.current?.scene as ProgrammingGame;
      if (scene && scene.stopCodeExecution) {
        scene.stopCodeExecution();
      }
    } else {
      console.log('Starting execution', activeEntityId);
      // Start execution - the event listener will handle state change
      startExecution(activeEntityId);
      
      const scene = phaserRef.current?.scene as ProgrammingGame;
      if (scene && scene.startCodeExecution) {
        scene.startCodeExecution();
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
      overflow: 'hidden'
    }}>
      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
        {/* Game Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <PhaserGame ref={phaserRef} currentActiveScene={currentActiveScene} />
        </div>

        {/* Collapsible Side Panel */}
        <div style={{
          width: isPanelCollapsed ? '40px' : '320px',
          backgroundColor: '#252526',
          borderLeft: '1px solid #3c3c3c',
          color: 'white',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Panel Header with Toggle */}
          <div style={{
            backgroundColor: '#2d2d30',
            padding: '8px',
            borderBottom: '1px solid #3c3c3c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '40px'
          }}>
            {!isPanelCollapsed && (
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                Binary Coven
              </h3>
            )}
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px 8px',
                borderRadius: '4px',
                marginLeft: 'auto'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              {isPanelCollapsed ? '◀' : '▶'}
            </button>
          </div>

          {/* Panel Content */}
          {!isPanelCollapsed && (
            <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
              {/* Resource Display */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#007acc' }}>Resources</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>⚡ Energy:</span>
                    <span>{activeEntity?.stats.energy || 0}/{activeEntity?.stats.maxEnergy || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>₿ Bitcoin:</span>
                    <span>{globalResources.bitcoin || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>💰 Currency:</span>
                    <span>{globalResources.currency || 0}</span>
                  </div>
                  {isPaused && (
                    <div style={{ color: '#f5a623', textAlign: 'center', marginTop: '8px' }}>
                      ⏸ PAUSED
                    </div>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#007acc' }}>Controls</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={handleRunCode}
                    style={{
                      backgroundColor: isCodeRunning ? '#e81123' : '#16c60c',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    {isCodeRunning ? '⏹ Stop Code' : '▶ Run Code'}
                  </button>
                  
                  <button
                    onClick={handleResetGame}
                    style={{
                      backgroundColor: '#f5a623',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      width: '100%'
                    }}
                  >
                    🔄 Reset Game
                  </button>
                </div>
              </div>
              
              {/* Instructions */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>How to Play</h4>
                <div style={{ fontSize: '12px', lineHeight: '1.4', color: '#ccc' }}>
                  <div style={{ marginBottom: '8px' }}>
                    🤖 <strong>Click on the blue qubit</strong> to open its programming interface
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    🏭 <strong>Click on colored grids</strong> to view their status and functions
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    ▶️ <strong>Use the Run button</strong> to execute your code
                  </div>
                  <div>
                    ⌨️ <strong>Write Python-like code</strong> to control the qubit
                  </div>
                </div>
              </div>
              
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
            </div>
          )}
        </div>
      </div>

      {/* Status Modal */}
      <StatusModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        entity={modalState.entity}
        grid={modalState.grid}
        position={modalState.position}
        onPositionChange={handleModalPositionChange}
      />
    </div>
  );
};

export default GameInterface; 