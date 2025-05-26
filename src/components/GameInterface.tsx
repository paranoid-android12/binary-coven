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

    EventBus.on('entity-clicked', handleEntityClick);
    EventBus.on('grid-clicked', handleGridClick);

    return () => {
      EventBus.removeListener('entity-clicked');
      EventBus.removeListener('grid-clicked');
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
      // Stop execution
      setIsCodeRunning(false);
      stopExecution();
      
      const scene = phaserRef.current?.scene as ProgrammingGame;
      if (scene && scene.stopCodeExecution) {
        scene.stopCodeExecution();
      }
    } else {
      // Start execution
      console.log('Starting execution', activeEntityId);  
      setIsCodeRunning(true);
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