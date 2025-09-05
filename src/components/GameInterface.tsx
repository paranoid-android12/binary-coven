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
import { SpriteButton } from './SpriteButton';

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

// Dialogue system types
interface DialogueEntry {
  name: string;
  content: string;
  sprite: string;
}

interface DialogueState {
  isActive: boolean;
  dialogues: DialogueEntry[];
  currentIndex: number;
  isLoading: boolean;
}

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
  
  // Camera lock state
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  
  // Current scene state
  const [currentScene, setCurrentScene] = useState<string | null>(null);
  
  // Dialogue system state
  const [dialogueState, setDialogueState] = useState<DialogueState>({
    isActive: false,
    dialogues: [],
    currentIndex: 0,
    isLoading: false
  });
  
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
  
  // Button positions (top-right corner)
  const playButtonPosition = { x: window.innerWidth - 180, y: 20 };
  const upgradeButtonPosition = { x: window.innerWidth - 115, y: 20 };

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
    
    // Handle upgrade modal requests
    const handleUpgradeModalRequest = () => {
      // Emit event to ProgrammingGame to open upgrade modal
      EventBus.emit('request-upgrade-modal');
    };

    // Handle tileset updates from map editor
    const handleTilesetUpdated = (data: { activeTileset: string, tilesets: any }) => {
      setMapEditorState(prev => ({
        ...prev,
        activeTileset: data.activeTileset,
        tilesets: data.tilesets
      }));
    };

    // Handle dialogue requests from EventBus
    const handleStartDialogue = (dialogueFile: string) => {
      startDialogue(dialogueFile);
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
    EventBus.on('start-dialogue', handleStartDialogue);

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
      EventBus.removeListener('start-dialogue');
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
        id: 'main',
        name: 'main',
        code: '# Main function - execution starts here\ndef main():\n    # Your code here\n    plant("wheat")\n    pass',
        isMain: true,
        isActive: true,
        position: { x: 50, y: 50 },
        size: { width: 400, height: 300 }
      });
      
      store.setMainWindow(mainWindowId);
      
      // Create default qubit entity with constant ID
      const qubitId = store.addEntity({
        id: 'qubit',
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

  const currentActiveScene = (scene: Phaser.Scene) => {
    console.log('Current scene:', scene.scene.key);
    setCurrentScene(scene.scene.key);
  };

  const activeEntity = entities.get(activeEntityId);
  
  // Check if we should show the programming interface
  const showProgrammingInterface = currentScene === 'ProgrammingGame';

  const [errorMessages, setErrorMessages] = useState<Array<{id: string, message: string, timestamp: number}>>([]);

  // Dialogue system functions
  const startDialogue = useCallback(async (dialogueFile: string) => {
    setDialogueState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/${dialogueFile}`);
      if (!response.ok) {
        throw new Error(`Failed to load dialogue file: ${dialogueFile}`);
      }
      
      const dialogues: DialogueEntry[] = await response.json();
      
      setDialogueState({
        isActive: true,
        dialogues,
        currentIndex: 0,
        isLoading: false
      });
      
      console.log(`[DIALOGUE] Started dialogue: ${dialogueFile} with ${dialogues.length} entries`);
    } catch (error) {
      console.error('[DIALOGUE] Failed to load dialogue:', error);
      setDialogueState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const advanceDialogue = useCallback(() => {
    setDialogueState(prev => {
      if (!prev.isActive || prev.currentIndex >= prev.dialogues.length - 1) {
        // End dialogue
        console.log('[DIALOGUE] Dialogue sequence completed');
        return {
          isActive: false,
          dialogues: [],
          currentIndex: 0,
          isLoading: false
        };
      }
      
      // Advance to next dialogue
      const nextIndex = prev.currentIndex + 1;
      console.log(`[DIALOGUE] Advanced to dialogue ${nextIndex + 1}/${prev.dialogues.length}`);
      return {
        ...prev,
        currentIndex: nextIndex
      };
    });
  }, []);

  const closeDialogue = useCallback(() => {
    setDialogueState({
      isActive: false,
      dialogues: [],
      currentIndex: 0,
      isLoading: false
    });
    console.log('[DIALOGUE] Dialogue closed manually');
  }, []);

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

  // Handle dialogue interaction events (keyboard and mouse)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (dialogueState.isActive && !dialogueState.isLoading) {
        event.preventDefault();
        advanceDialogue();
      }
    };

    const handleMouseClick = (event: MouseEvent) => {
      if (dialogueState.isActive && !dialogueState.isLoading) {
        // Check if click is inside dialogue box (we'll let it propagate to the dialogue component)
        const target = event.target as HTMLElement;
        if (target.closest('.dialogue-container')) {
          event.stopPropagation();
          advanceDialogue();
        }
      }
    };

    if (dialogueState.isActive) {
      document.addEventListener('keydown', handleKeyPress);
      document.addEventListener('click', handleMouseClick);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('click', handleMouseClick);
    };
  }, [dialogueState.isActive, dialogueState.isLoading, advanceDialogue]);

  // Expose startDialogue function globally for easy access
  useEffect(() => {
    // Attach to window object for global access
    (window as any).startDialogue = startDialogue;

    // Also make available through EventBus
    EventBus.emit('dialogue-system-ready', { startDialogue });

    return () => {
      // Cleanup
      delete (window as any).startDialogue;
    };
  }, [startDialogue]);

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

      </div>

      {/* Status Modal - Only show during ProgrammingGame */}
      {showProgrammingInterface && (
        <StatusModal
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
          entity={modalState.entity}
          grid={modalState.grid}
          position={modalState.position}
          onPositionChange={handleModalPositionChange}
        />
      )}

      {/* Fixed UI System - Only show during ProgrammingGame */}
      {showProgrammingInterface && (
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
          
          {/* Top Right - Game Control Buttons */}
          <SpriteButton
            position={playButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 176, y: 16, w: 16, h: 16 }}
            downFrame={{ x: 176, y: 32, w: 16, h: 16 }}
            scale={4}
            onClick={handleRunCode}
          />
          
          <SpriteButton
            position={upgradeButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 592, y: 256, w: 16, h: 16 }}
            downFrame={{ x: 592, y: 272, w: 16, h: 16 }}
            scale={4}
            onClick={() => EventBus.emit('request-upgrade-modal')}
          />

          {/* Top Right - Resources & Controls */}

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
      )}

      {/* Dialogue System Overlay - Always on top when active */}
      {dialogueState.isActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 2000,
          pointerEvents: 'auto'
        }}>
          <div 
            className="dialogue-container"
            style={{
              position: 'relative',
              width: '80%',
              maxWidth: '800px',
              marginBottom: '40px',
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
            onClick={advanceDialogue}
          >
            {/* Dialogue Background Sprite */}
            <div style={{
              position: 'relative',
              backgroundImage: 'url(/title.png)', // Using title.png as dialogue background
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              width: '100%',
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              padding: '20px'
            }}>
              {/* Speaker Sprite */}
              {dialogueState.dialogues[dialogueState.currentIndex] && (
                <div style={{
                  position: 'absolute',
                  left: '20px',
                  top: '20px',
                  width: '80px',
                  height: '80px',
                  backgroundImage: `url(/assets/${dialogueState.dialogues[dialogueState.currentIndex].sprite})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  imageRendering: 'pixelated'
                }} />
              )}
              
              {/* Dialogue Content */}
              {dialogueState.dialogues[dialogueState.currentIndex] && (
                <div style={{
                  marginLeft: '120px',
                  color: '#ffffff',
                  fontFamily: 'BoldPixels',
                  flex: 1
                }}>
                  {/* Speaker Name */}
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    fontFamily: 'BoldPixels'
                  }}>
                    {dialogueState.dialogues[dialogueState.currentIndex].name}
                  </div>
                  
                  {/* Dialogue Text */}
                  <div style={{
                    fontSize: '16px',
                    lineHeight: '1.4',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontFamily: 'BoldPixels'
                  }}>
                    {dialogueState.dialogues[dialogueState.currentIndex].content}
                  </div>
                </div>
              )}
              
              {/* Progress Indicator */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '20px',
                color: '#ffffff',
                fontSize: '12px',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                
              }}>
                {dialogueState.currentIndex + 1} / {dialogueState.dialogues.length}
              </div>
              
              {/* Continue Indicator */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#ffffff',
                fontSize: '14px',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                {dialogueState.currentIndex < dialogueState.dialogues.length - 1 
                  ? 'Click or press any key to continue...' 
                  : 'Click or press any key to close...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator for dialogue */}
      {dialogueState.isLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 2001,
          fontFamily: 'monospace',
          fontSize: '16px'
        }}>
          Loading dialogue...
        </div>
      )}
    </div>
  );
};

export default GameInterface; 