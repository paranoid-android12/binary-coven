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
  camera?: {
    x: number;
    y: number;
  };
  mainImage?: string;
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
      },
      'Well': {
        key: 'Well',
        name: 'Well',
        tileSize: 16,
        columns: 16,
        rows: 16
      }
    },
    activeTileset: 'Ground_Tileset',
    selectedLayer: 1
  });

  // Upgrade modal state
  const [upgradeModalState, setUpgradeModalState] = useState({
    isOpen: false
  });

  // Global modal state management - tracks if ANY modal is open
  const [globalModalState, setGlobalModalState] = useState({
    isAnyModalOpen: false,
    openModals: new Set<string>()
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

  // Modal management functions
  const openModal = useCallback((modalId: string) => {
    setGlobalModalState(prev => {
      const newOpenModals = new Set(prev.openModals);
      newOpenModals.add(modalId);
      return {
        isAnyModalOpen: true,
        openModals: newOpenModals
      };
    });
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setGlobalModalState(prev => {
      const newOpenModals = new Set(prev.openModals);
      newOpenModals.delete(modalId);
      return {
        isAnyModalOpen: newOpenModals.size > 0,
        openModals: newOpenModals
      };
    });
  }, []);

  // Handle entity/grid clicks from Phaser
  useEffect(() => {
    const handleEntityClick = (entity: Entity) => {
      // Block if any modal is currently open
      if (globalModalState.isAnyModalOpen) {
        console.log('Entity click blocked - modal is open');
        return;
      }
      
      setModalState({
        isOpen: true,
        entity,
        grid: undefined,
        position: { x: 100, y: 100 }
      });
      openModal('status');
    };

    const handleGridClick = (grid: GridTile) => {
      // Block if any modal is currently open
      if (globalModalState.isAnyModalOpen) {
        console.log('Grid click blocked - modal is open');
        return;
      }
      
      setModalState({
        isOpen: true,
        entity: undefined,
        grid,
        position: { x: 100, y: 100 }
      });
      openModal('status');
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
      // Block if any modal is currently open
      if (globalModalState.isAnyModalOpen) {
        console.log('Upgrade modal blocked - another modal is open');
        return;
      }
      
      setUpgradeModalState(prev => ({ ...prev, isOpen: true }));
      openModal('upgrade');
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
    EventBus.on('request-upgrade-modal', handleUpgradeModalRequest);

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
      EventBus.removeListener('request-upgrade-modal');
    };
  }, [globalModalState.isAnyModalOpen, openModal]);

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
    closeModal('status');
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
    // Block if any modal is currently open
    if (globalModalState.isAnyModalOpen) {
      console.log('Dialogue blocked - another modal is open');
      return;
    }
    
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
      
      // Handle camera panning for first dialogue if specified
      if (dialogues[0]?.camera) {
        const scene = phaserRef.current?.scene as ProgrammingGame;
        if (scene && scene.panCameraTo) {
          console.log(`[DIALOGUE] Panning camera to (${dialogues[0].camera.x}, ${dialogues[0].camera.y})`);
          scene.panCameraTo(dialogues[0].camera.x, dialogues[0].camera.y, 1000);
        }
      }
      
      openModal('dialogue');
      console.log(`[DIALOGUE] Started dialogue: ${dialogueFile} with ${dialogues.length} entries`);
    } catch (error) {
      console.error('[DIALOGUE] Failed to load dialogue:', error);
      setDialogueState(prev => ({ ...prev, isLoading: false }));
    }
  }, [globalModalState.isAnyModalOpen, openModal]);

  const advanceDialogue = useCallback(() => {
    setDialogueState(prev => {
      if (!prev.isActive || prev.currentIndex >= prev.dialogues.length - 1) {
        // End dialogue
        closeModal('dialogue');
        // Re-lock camera to qubit after dialogue ends
        const scene = phaserRef.current?.scene as ProgrammingGame;
        if (scene && scene.lockCameraToQubit) {
          scene.lockCameraToQubit();
        }
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
      const nextDialogue = prev.dialogues[nextIndex];
      
      // Handle camera panning if specified
      if (nextDialogue?.camera) {
        const scene = phaserRef.current?.scene as ProgrammingGame;
        if (scene && scene.panCameraTo) {
          console.log(`[DIALOGUE] Panning camera to (${nextDialogue.camera.x}, ${nextDialogue.camera.y})`);
          scene.panCameraTo(nextDialogue.camera.x, nextDialogue.camera.y, 1000);
        }
      }
      
      console.log(`[DIALOGUE] Advanced to dialogue ${nextIndex + 1}/${prev.dialogues.length}`);
      return {
        ...prev,
        currentIndex: nextIndex
      };
    });
  }, [closeModal]);

  const closeDialogue = useCallback(() => {
    setDialogueState({
      isActive: false,
      dialogues: [],
      currentIndex: 0,
      isLoading: false
    });
    closeModal('dialogue');
    // Re-lock camera to qubit when dialogue is closed manually
    const scene = phaserRef.current?.scene as ProgrammingGame;
    if (scene && scene.lockCameraToQubit) {
      scene.lockCameraToQubit();
    }
    console.log('[DIALOGUE] Dialogue closed manually');
  }, [closeModal]);

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
        <div style={{ zIndex: modalState.isOpen ? 3000 : -1 }}>
          <StatusModal
            isOpen={modalState.isOpen}
            onClose={handleCloseModal}
            entity={modalState.entity}
            grid={modalState.grid}
            position={modalState.position}
            onPositionChange={handleModalPositionChange}
          />
        </div>
      )}

      {/* Modal Blocking Overlay - Covers game area when any modal is open */}
      {showProgrammingInterface && globalModalState.isAnyModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          zIndex: 2000,
          pointerEvents: 'auto', // Block all clicks to the game
          cursor: 'not-allowed'
        }} />
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
            onClick={() => {
              if (!globalModalState.isAnyModalOpen) {
                setUpgradeModalState(prev => ({ ...prev, isOpen: true }));
                openModal('upgrade');
              }
            }}
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
          zIndex: 3500,
          pointerEvents: 'auto'
        }}>
          {/* Main Image Overlay (optional) */}
          {dialogueState.dialogues[dialogueState.currentIndex]?.mainImage && (
            <div
              style={{
                position: 'absolute',
                top: '15%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '50%',
                maxWidth: '720px',
                aspectRatio: '16 / 9',
                backgroundImage: `url(/assets/${dialogueState.dialogues[dialogueState.currentIndex].mainImage})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
                pointerEvents: 'none',
                zIndex: 3550
              }}
            />
          )}

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
              backgroundImage: 'url(/assets/dialogue.png)', // Using title.png as dialogue background
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
                  left: '40px',
                  top: '15px',
                  width: '220px',
                  height: '220px',
                  backgroundImage: `url(/assets/${dialogueState.dialogues[dialogueState.currentIndex].sprite})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  imageRendering: 'pixelated'
                }} />
              )}
              
              {/* Dialogue Content, has to follow width of dialogue box */}
              {dialogueState.dialogues[dialogueState.currentIndex] && (
                <div style={{
                  marginLeft: '260px',
                  color: '#ffffff',
                  fontFamily: 'BoldPixels',
                  flex: 1,
                  paddingRight: '70px'
                }}>
                  {/* Speaker Name */}
                  <div style={{
                    fontSize: '25px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: '#1c0a18',
                    fontFamily: 'BoldPixels'
                  }}>
                    {dialogueState.dialogues[dialogueState.currentIndex].name}
                  </div>
                  
                  {/* Dialogue Text */}
                  <div style={{
                    fontSize: '20px',
                    lineHeight: '1.4',
                    color: '#1c0a18',
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
                fontSize: '12px',
                color: '#1c0a18',
              }}>
                {dialogueState.currentIndex + 1} / {dialogueState.dialogues.length}
              </div>
              
              {/* Continue Indicator */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '14px',
                color: '#1c0a18',
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

      {/* Upgrade Modal System - Always on top when active */}
      {upgradeModalState.isOpen && showProgrammingInterface && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          pointerEvents: 'auto'
        }}>
          <div style={{
            position: 'relative',
            width: '600px',
            maxWidth: '90vw',
            height: '500px',
            maxHeight: '90vh',
            pointerEvents: 'auto'
          }}>
            {/* Modal Background - Using title.png as fallback, can be replaced with sprite */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url(/title.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              border: '4px solid #f5a623',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
            }} />
            
            {/* Modal Content */}
            <div style={{
              position: 'relative',
              padding: '20px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Title */}
              <h2 style={{
                color: '#f5a623',
                fontSize: '32px',
                fontFamily: 'BoldPixels',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                margin: '10px 0 20px 0',
                textAlign: 'center'
              }}>
                UPGRADES
              </h2>

              {/* Current Wheat Display */}
              <div style={{
                color: '#ffffff',
                fontSize: '18px',
                fontFamily: 'BoldPixels',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                marginBottom: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '8px 16px',
                borderRadius: '8px'
              }}>
                Available Wheat: {globalResources.wheat || 0}
              </div>

              {/* Upgrades List */}
              <div style={{
                flex: 1,
                width: '100%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '300px'
              }}>
                {activeEntity && (() => {
                  const upgrades = [
                    {
                      name: 'Movement Speed +0.5',
                      description: 'Increase walking speed',
                      cost: 15,
                      current: activeEntity.stats.walkingSpeed,
                      apply: () => {
                        const store = useGameStore.getState();
                        store.updateEntity(activeEntity.id, {
                          stats: { ...activeEntity.stats, walkingSpeed: activeEntity.stats.walkingSpeed + 0.5 }
                        });
                        store.updateResources({ wheat: (globalResources.wheat || 0) - 15 });
                      }
                    },
                    {
                      name: 'Max Energy +20',
                      description: 'Increase maximum energy capacity',
                      cost: 10,
                      current: activeEntity.stats.maxEnergy,
                      apply: () => {
                        const store = useGameStore.getState();
                        const newMaxEnergy = activeEntity.stats.maxEnergy + 20;
                        store.updateEntity(activeEntity.id, {
                          stats: { 
                            ...activeEntity.stats, 
                            maxEnergy: newMaxEnergy,
                            energy: Math.min(activeEntity.stats.energy + 20, newMaxEnergy)
                          }
                        });
                        store.updateResources({ wheat: (globalResources.wheat || 0) - 10 });
                      }
                    },
                    {
                      name: 'Harvest Amount +2',
                      description: 'Get more wheat per harvest',
                      cost: 25,
                      current: activeEntity.stats.harvestAmount || 1,
                      apply: () => {
                        const store = useGameStore.getState();
                        store.updateEntity(activeEntity.id, {
                          stats: { ...activeEntity.stats, harvestAmount: (activeEntity.stats.harvestAmount || 1) + 2 }
                        });
                        store.updateResources({ wheat: (globalResources.wheat || 0) - 25 });
                      }
                    },
                    {
                      name: 'Planting Speed +25%',
                      description: 'Reduce planting time',
                      cost: 20,
                      current: `${Math.round((1 - (activeEntity.stats.plantingSpeedMultiplier || 1)) * 100)}% faster`,
                      apply: () => {
                        const store = useGameStore.getState();
                        const currentMultiplier = activeEntity.stats.plantingSpeedMultiplier || 1;
                        store.updateEntity(activeEntity.id, {
                          stats: { ...activeEntity.stats, plantingSpeedMultiplier: Math.max(0.1, currentMultiplier - 0.25) }
                        });
                        store.updateResources({ wheat: (globalResources.wheat || 0) - 20 });
                      }
                    }
                  ];

                  return upgrades.map((upgrade, index) => {
                    const canAfford = (globalResources.wheat || 0) >= upgrade.cost;
                    
                    return (
                      <div key={index} style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: `2px solid ${canAfford ? '#16c60c' : '#666666'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            color: '#ffffff',
                            fontSize: '16px',
                            fontFamily: 'BoldPixels',
                            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                            marginBottom: '4px'
                          }}>
                            {upgrade.name}
                          </div>
                          <div style={{
                            color: '#cccccc',
                            fontSize: '12px',
                            fontFamily: 'BoldPixels',
                            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                          }}>
                            Current: {upgrade.current}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <div style={{
                            color: '#f5a623',
                            fontSize: '14px',
                            fontFamily: 'BoldPixels',
                            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
                          }}>
                            Cost: {upgrade.cost} Wheat
                          </div>
                          
                          {/* Buy Button - Can be replaced with SpriteButton */}
                          <div
                            style={{
                              padding: '8px 16px',
                              backgroundColor: canAfford ? '#16c60c' : '#444444',
                              color: canAfford ? '#ffffff' : '#888888',
                              border: '2px solid ' + (canAfford ? '#16c60c' : '#666666'),
                              borderRadius: '4px',
                              cursor: canAfford ? 'pointer' : 'not-allowed',
                              fontSize: '14px',
                              fontFamily: 'BoldPixels',
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                              userSelect: 'none',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => {
                              if (canAfford) {
                                upgrade.apply();
                                console.log(`[UPGRADES] Applied upgrade: ${upgrade.name}`);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (canAfford) {
                                e.currentTarget.style.backgroundColor = '#14a508';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (canAfford) {
                                e.currentTarget.style.backgroundColor = '#16c60c';
                              }
                            }}
                          >
                            BUY
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Close Button - Can be replaced with SpriteButton */}
              <div
                style={{
                  marginTop: '20px',
                  padding: '12px 24px',
                  backgroundColor: '#666666',
                  color: '#ffffff',
                  border: '2px solid #888888',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setUpgradeModalState(prev => ({ ...prev, isOpen: false }));
                  closeModal('upgrade');
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#777777';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#666666';
                }}
              >
                CLOSE
              </div>
            </div>
          </div>
        </div>
      )}

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