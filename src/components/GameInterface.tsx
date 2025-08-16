import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PhaserGame, IRefPhaserGame } from '../PhaserGame';
import StatusModal from './StatusModal';
import { useGameStore } from '../stores/gameStore';
import { ProgrammingGame } from '../game/scenes/ProgrammingGame';
import { BuiltInFunctionRegistry } from '../game/systems/BuiltInFunctions';
import { EventBus } from '../game/EventBus';
import { Entity, GridTile } from '../types/game';
import { MapEditorUI } from './MapEditorUI';
import { SpriteEnergyDisplay } from './SpriteEnergyDisplay';
import ImageSpriteEnergyDisplay from './ImageSpriteEnergyDisplay';

// Custom hook for draggable functionality
const useDraggable = (initialPosition: { x: number; y: number }) => {
  const [position, setPosition] = useState(initialPosition);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - 250)),
        y: Math.max(0, Math.min(newY, window.innerHeight - 200))
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return { position, elementRef, handleMouseDown };
};

export const GameInterface: React.FC = () => {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const lastRunCodeCall = useRef<number>(0);
  
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
  
  // Camera lock state
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  
  // Map editor state
  const [mapEditorState, setMapEditorState] = useState({
    isActive: false,
    tilesets: {
      'Ground_Tileset': {
        key: 'Ground_Tileset',
        name: 'Ground Tiles',
        tileSize: 16,
        columns: 16,
        rows: 16
      },
      'Fence_Wood': {
        key: 'Fence_Wood',
        name: 'Fence Wood',
        tileSize: 16,
        columns: 16,
        rows: 16
      }
    },
    activeTileset: 'Ground_Tileset',
    selectedLayer: 1
  });
  
  // Game store state
  const {
    entities,
    activeEntityId,
    globalResources,
    isPaused
  } = useGameStore();

  const [isCodeRunning, setIsCodeRunning] = useState(false);
  
  // Draggable UI elements  
  const resourcesPanel = useDraggable({ x: window.innerWidth - 220, y: 20 });
  
  // Static sprite-based energy display position
  const spriteEnergyPosition = { x: 20, y: 20 };

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

    // Handle camera lock status changes
    const handleCameraLockChanged = (isLocked: boolean) => {
      setIsCameraLocked(isLocked);
    };

    // Handle scene ready event
    const handleSceneReady = (scene: any) => {
      console.log('Scene ready, camera should be locked to qubit');
      setIsCameraLocked(true);
    };

    // Handle tileset updates from map editor
    const handleTilesetUpdated = (data: { activeTileset: string, tilesets: any }) => {
      setMapEditorState(prev => ({
        ...prev,
        activeTileset: data.activeTileset,
        tilesets: data.tilesets
      }));
    };

    EventBus.on('entity-clicked', handleEntityClick);
    EventBus.on('grid-clicked', handleGridClick);
    EventBus.on('code-execution-started', handleExecutionStarted);
    EventBus.on('code-execution-completed', handleExecutionCompleted);
    EventBus.on('code-execution-failed', handleExecutionFailed);
    EventBus.on('code-execution-stopped', handleExecutionStopped);
    EventBus.on('camera-locked-to-qubit', handleCameraLockChanged);
    EventBus.on('current-scene-ready', handleSceneReady);
    EventBus.on('map-editor-tileset-updated', handleTilesetUpdated);

    return () => {
      EventBus.removeListener('entity-clicked');
      EventBus.removeListener('grid-clicked');
      EventBus.removeListener('code-execution-started');
      EventBus.removeListener('code-execution-completed');
      EventBus.removeListener('code-execution-failed');
      EventBus.removeListener('code-execution-stopped');
      EventBus.removeListener('camera-locked-to-qubit');
      EventBus.removeListener('current-scene-ready');
      EventBus.removeListener('map-editor-tileset-updated');
    };
  }, []);

  // Initialize game state on first load
  useEffect(() => {
    const store = useGameStore.getState();
    
    // Only initialize if there are no entities (first load)
    if (store.entities.size === 0) {
      console.log('Initializing game state...');
      
      // Create default code window
      const mainWindowId = store.addCodeWindow({
        name: 'main',
        code: '# Main function - execution starts here\ndef main():\n    # Your code here\n    plant("wheat")\n    pass',
        isMain: true,
        isActive: true,
        position: { x: 50, y: 50 },
        size: { width: 400, height: 300 }
      });
      
      store.setMainWindow(mainWindowId);
      
      // Create default qubit entity
      const qubitId = store.addEntity({
        name: 'Qubit',
        type: 'qubit',
        position: { x: 12, y: 8 },
        stats: {
          walkingSpeed: 4.0,
          energy: 100,
          maxEnergy: 100
        },
        inventory: {
          items: [],
          capacity: 10
        },
        isActive: true,
        taskState: {
          isBlocked: false,
          currentTask: undefined,
          progress: undefined
        }
      });
      
      store.setActiveEntity(qubitId);
      console.log('Game state initialized with qubit entity:', qubitId);
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleCloseModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalPositionChange = (position: { x: number; y: number }) => {
    setModalState(prev => ({ ...prev, position }));
  };

  const handleRunCode = useCallback(() => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastRunCodeCall.current < 500) { // 500ms debounce
      console.log('Ignoring rapid handleRunCode call');
      return;
    }
    lastRunCodeCall.current = now;

    const scene = phaserRef.current?.scene as ProgrammingGame;
    
    if (isCodeRunning) {
      console.log('Stopping execution');
      // Stop execution via the scene
      if (scene && scene.stopCodeExecution) {
        scene.stopCodeExecution();
      }
    } else {
      console.log('Starting execution', activeEntityId);
      // Start execution via the scene
      if (scene && scene.startCodeExecution) {
        scene.startCodeExecution();
      }
    }
  }, [isCodeRunning, activeEntityId]);

  const handleResetGame = () => {
    if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
      const store = useGameStore.getState();
      store.reset();
      
      // Create default entities and code windows
      const mainWindowId = store.addCodeWindow({
        name: 'main',
        code: '# Main function - execution starts here\ndef main():\n    # Your code here\n    plant("wheat")\n    pass',
        isMain: true,
        isActive: true,
        position: { x: 50, y: 50 },
        size: { width: 400, height: 300 }
      });
      
      store.setMainWindow(mainWindowId);
      
      // Create default qubit entity
      const qubitId = store.addEntity({
        name: 'Qubit',
        type: 'qubit',
        position: { x: 12, y: 8 },
        stats: {
          walkingSpeed: 4.0,
          energy: 100,
          maxEnergy: 100
        },
        inventory: {
          items: [],
          capacity: 10
        },
        isActive: true,
        taskState: {
          isBlocked: false,
          currentTask: undefined,
          progress: undefined
        }
      });
      
      store.setActiveEntity(qubitId);
      setIsCodeRunning(false);
    }
  };

  const handleLockCamera = () => {
    const scene = phaserRef.current?.scene as ProgrammingGame;
    if (scene && typeof scene.lockCameraToQubit === 'function') {
      scene.lockCameraToQubit();
    }
  };

  const currentActiveScene = (scene: Phaser.Scene) => {
    console.log('Current scene:', scene.scene.key);
  };

  const activeEntity = entities.get(activeEntityId);

  // New state for function guide
  const [showFunctionGuide, setShowFunctionGuide] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [errorMessages, setErrorMessages] = useState<Array<{id: string, message: string, timestamp: number}>>([]);

  // Handle error messages
  useEffect(() => {
    const handleExecutionError = (error: string) => {
      const newError = {
        id: Date.now().toString(),
        message: error,
        timestamp: Date.now()
      };
      
      setErrorMessages(prev => [...prev, newError]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setErrorMessages(prev => prev.filter(err => err.id !== newError.id));
      }, 5000);
    };

    EventBus.on('show-execution-error', handleExecutionError);
    
    return () => {
      EventBus.removeListener('show-execution-error');
    };
  }, []);

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
          
          {/* Map Editor UI Overlay */}
          <MapEditorUI
            tilesets={mapEditorState.tilesets}
            activeTileset={mapEditorState.activeTileset}
            selectedLayer={mapEditorState.selectedLayer}
            onTileSelect={(tile) => {
              EventBus.emit('tile-selected', tile);
            }}
            onSave={() => {
              EventBus.emit('save-map');
            }}
            onLoad={() => {
              EventBus.emit('load-map');
            }}
            onToggleEditor={() => {
              setMapEditorState(prev => ({
                ...prev,
                isActive: !prev.isActive
              }));
              EventBus.emit('toggle-map-editor');
            }}
            isActive={mapEditorState.isActive}
          />
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
                    <span>Wheat:</span>
                    <span>{globalResources.wheat || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span> Energy:</span>
                    <span>{globalResources.energy || 0}</span>
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
                    onClick={handleLockCamera}
                    disabled={isCameraLocked}
                    style={{
                      backgroundColor: isCameraLocked ? '#666666' : '#007acc',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: isCameraLocked ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      width: '100%',
                      opacity: isCameraLocked ? 0.6 : 1
                    }}
                  >
                    {isCameraLocked ? ' Camera Locked' : ' Lock to Qubit'}
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
                     Reset Game
                  </button>
                </div>
              </div>
              
              {/* Instructions */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>How to Play</h4>
                <div style={{ fontSize: '12px', lineHeight: '1.4', color: '#ccc' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Click on the blue qubit</strong> to open its programming interface
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Click on colored grids</strong> to view their status and functions
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Use the Run button</strong> to execute your code
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Write Python-like code</strong> to control the qubit
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Camera:</strong> WASD to explore the world (unlocks from qubit)
                  </div>
                  <div>
                    <strong>Arrow keys:</strong> Move qubit (when camera locked) OR explore (when unlocked)
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
                  <div style={{ marginTop: '8px', marginBottom: '4px', color: '#f5a623', fontWeight: 'bold' }}>
                    System:
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <code style={{ backgroundColor: '#1e1e1e', padding: '2px 4px', borderRadius: '2px' }}>
                      wait(seconds)
                    </code>
                    <div style={{ color: '#cccccc', fontSize: '11px', marginLeft: '8px' }}>
                      Wait for specified seconds
                    </div>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <code style={{ backgroundColor: '#1e1e1e', padding: '2px 4px', borderRadius: '2px' }}>
                      sleep(milliseconds)
                    </code>
                    <div style={{ color: '#cccccc', fontSize: '11px', marginLeft: '8px' }}>
                      Sleep for specified milliseconds
                    </div>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <code style={{ backgroundColor: '#1e1e1e', padding: '2px 4px', borderRadius: '2px' }}>
                      print(message)
                    </code>
                    <div style={{ color: '#cccccc', fontSize: '11px', marginLeft: '8px' }}>
                      Print message to console
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Functions */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>Farm Functions</h4>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Farmland:</strong>
                    <div style={{ marginLeft: '8px', color: '#cccccc' }}>
                      <div>plant(crop_type) - Plant crops</div>
                      <div>harvest() - Harvest grown crops</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Food Station:</strong>
                    <div style={{ marginLeft: '8px', color: '#cccccc' }}>
                      <div>eat() - Restore energy</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Silo:</strong>
                    <div style={{ marginLeft: '8px', color: '#cccccc' }}>
                      <div>store(item_type, amount) - Store crops</div>
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

      {/* Fixed UI System */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        {/* Top Left - Sprite-based Energy Display */}
        {activeEntity && (
          <SpriteEnergyDisplay
            entity={activeEntity}
            position={spriteEnergyPosition}
            backgroundSprite="Bars.png" // Path to your sprite
            energyBarConfig={{
              x: 20, // X position on your sprite where energy bar starts
              y: 50, // Y position on your sprite where energy bar starts
              maxWidth: 20, // Maximum width when full energy (e.g., 2x10 pixels)
              height: 2, // Height of energy bar (e.g., 2 pixels)
              color: '#00ff00' // Color overlay for the energy bar
            }}
            scale={4} // Scale the entire sprite 2x for better visibility
          />
        )}

        {/* Top Right - Image-based Energy Display */}
        {activeEntity && (
          <ImageSpriteEnergyDisplay
            entity={activeEntity}
            position={spriteEnergyPosition}
          />
        )}

        {/* Top Right - Resources & Controls */}
        <div 
          ref={resourcesPanel.elementRef}
          onMouseDown={resourcesPanel.handleMouseDown}
          style={{
            position: 'absolute',
            top: `${resourcesPanel.position.y}px`,
            left: `${resourcesPanel.position.x}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #007acc',
            borderRadius: '8px',
            padding: '12px',
            pointerEvents: 'auto',
            minWidth: '180px',
            cursor: 'move'
          }}>
          {/* Global Resources */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              Resources
            </div>
            <div style={{ fontSize: '12px', color: '#cccccc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span> Wheat:</span>
                <span>{globalResources.wheat || 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={handleRunCode}
              style={{
                backgroundColor: isCodeRunning ? '#e81123' : '#16c60c',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {isCodeRunning ? '⏹ Stop' : '▶ Run'}
            </button>
            
            <button
              onClick={() => setShowFunctionGuide(!showFunctionGuide)}
              style={{
                backgroundColor: '#007acc',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
               Guide
            </button>

            <button
              onClick={() => setShowUpgrades(!showUpgrades)}
              style={{
                backgroundColor: '#f5a623',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Upgrades
            </button>
          </div>
        </div>

        {/* Bottom Left - Error Messages */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          pointerEvents: 'auto',
          maxWidth: '400px'
        }}>
          {errorMessages.map(error => (
            <div
              key={error.id}
              style={{
                backgroundColor: 'rgba(200, 50, 50, 0.95)',
                border: '2px solid #ff4444',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                animation: 'slideInLeft 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}></span>
                <span>Execution Error:</span>
              </div>
              <div style={{ marginTop: '4px', fontWeight: 'normal', fontSize: '12px' }}>
                {error.message}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Function Guide Dropdown */}
      {showFunctionGuide && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid #007acc',
          borderRadius: '8px',
          padding: '16px',
          zIndex: 1001,
          maxWidth: '350px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#007acc' }}>Function Guide</h4>
          
          {/* Farm Functions */}
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#f5a623' }}>Farm Functions</h5>
            <div style={{ fontSize: '12px', color: '#cccccc', lineHeight: '1.4' }}>
              <div style={{ marginBottom: '6px' }}>
                <strong>Farmland:</strong> plant(crop_type), harvest()
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong>Food Station:</strong> eat()
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong>Silo:</strong> store(item_type, amount)
              </div>
            </div>
          </div>

          {/* Debug Functions */}
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#f5a623' }}>Debug & Utility</h5>
            <div style={{ fontSize: '12px', color: '#cccccc', lineHeight: '1.4' }}>
              <div style={{ marginBottom: '4px' }}>
                <code>debug_grid_info()</code> - Show position and nearby grids
              </div>
              <div style={{ marginBottom: '4px' }}>
                <code>debug_farmland_states()</code> - Show all farmland states and tasks
              </div>
              <div style={{ marginBottom: '4px' }}>
                <code>scanner(x, y)</code> - Scan grid at coordinates
              </div>
              <div style={{ marginBottom: '4px' }}>
                <code>get_position()</code> - Get current position
              </div>
            </div>
          </div>

          {/* Movement Functions */}
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#f5a623' }}>Movement</h5>
            <div style={{ fontSize: '12px', color: '#cccccc', lineHeight: '1.4' }}>
              {BuiltInFunctionRegistry.getFunctionsByCategory('movement').map(func => (
                <div key={func.name} style={{ marginBottom: '4px' }}>
                  <code>{func.name}()</code> - {func.description}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowFunctionGuide(false)}
            style={{
              backgroundColor: '#666666',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '8px'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Upgrades Modal */}
      {showUpgrades && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid #f5a623',
          borderRadius: '8px',
          padding: '20px',
          zIndex: 1001,
          minWidth: '400px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#f5a623' }}>Upgrades</h4>
          
          <div style={{ color: '#cccccc', fontSize: '14px', marginBottom: '16px' }}>
            <p>Use stored crops to upgrade your capabilities!</p>
            <p style={{ fontSize: '12px', fontStyle: 'italic' }}>
              Available Wheat: {globalResources.wheat || 0}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{
              padding: '12px',
              border: '1px solid #666666',
              borderRadius: '4px',
              marginBottom: '8px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Energy Capacity +20</div>
              <div style={{ fontSize: '12px', color: '#cccccc', marginBottom: '8px' }}>
                Cost: 10 Wheat
              </div>
              <button
                disabled={(globalResources.wheat || 0) < 10}
                style={{
                  backgroundColor: (globalResources.wheat || 0) >= 10 ? '#16c60c' : '#666666',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: (globalResources.wheat || 0) >= 10 ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Upgrade
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowUpgrades(false)}
            style={{
              backgroundColor: '#666666',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default GameInterface; 