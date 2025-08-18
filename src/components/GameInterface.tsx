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

  const handleRunCode = () => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastRunCodeCall.current < 500) { // 500ms debounce
      console.log('Ignoring rapid handleRunCode call');
      return;
    }
    lastRunCodeCall.current = now;

    const scene = phaserRef.current?.scene as ProgrammingGame;
    
    console.log(scene);
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
  };

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
          {/* <MapEditorUI
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
          /> */}
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
              onClick={() => console.log('Upgrades button clicked - now handled in ProgrammingGame')}
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


    </div>
  );
};

export default GameInterface; 