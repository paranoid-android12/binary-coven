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
import { GlossaryModal } from './GlossaryModal';
import { QuestModal } from './QuestModal';
import { ErrorDisplay } from './ErrorDisplay';
import DialogueManager from '../game/systems/DialogueManager';
import { useUser, isStudentUser } from '../contexts/UserContext';
import LoginModal from './LoginModal';

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
  const { user, logout } = useUser();

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

  // Dialogue system state (managed by DialogueManager)
  const [dialogueState, setDialogueState] = useState(DialogueManager.getState().dialogue);
  const [tutorialState, setTutorialState] = useState(DialogueManager.getState().tutorial);

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

  // Glossary modal state
  const [glossaryModalState, setGlossaryModalState] = useState({
    isOpen: false
  });

  // Quest modal state
  const [questModalState, setQuestModalState] = useState({
    isOpen: false
  });

  // Reset confirmation modal state
  const [resetConfirmModalState, setResetConfirmModalState] = useState({
    isOpen: false
  });

  // Login modal state
  const [loginModalState, setLoginModalState] = useState({
    isOpen: false
  });

  // Game menu modal state
  const [gameMenuModalState, setGameMenuModalState] = useState({
    isOpen: false
  });

  // Drone state
  const [activeDroneId, setActiveDroneId] = useState<string | undefined>(undefined);
  const [droneExecutionStates, setDroneExecutionStates] = useState<Map<string, boolean>>(new Map());

  // Challenge Grid state
  const [isOnChallengeGrid, setIsOnChallengeGrid] = useState(false);
  const [showChallengeBlockedMessage, setShowChallengeBlockedMessage] = useState(false);

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

  // Override modal state when dialogue is hidden for tutorial
  const shouldBlockModalInteractions = useCallback(() => {
    const shouldHide = DialogueManager.shouldHideDialogue();

    // If dialogue is active but hidden for tutorial requirements, don't block anything
    if (dialogueState.isActive && shouldHide) {
      console.log('[TUTORIAL] Dialogue hidden - allowing all interactions');
      return false; // Allow all interactions during tutorial requirements
    }

    // If dialogue is visible and active, block interactions
    if (dialogueState.isActive && !shouldHide) {
      console.log('[TUTORIAL] Dialogue visible - blocking interactions');
      return true; // Block interactions during visible dialogue
    }

    // For non-dialogue modals, check if any are open
    const nonDialogueModalsOpen = Array.from(globalModalState.openModals).some(modal => modal !== 'dialogue');
    if (nonDialogueModalsOpen) {
      console.log('[TUTORIAL] Non-dialogue modal open - blocking interactions');
    }
    return nonDialogueModalsOpen;
  }, [dialogueState, globalModalState.openModals]);
  
  // Draggable UI elements  
  const resourcesPanel = useDraggable({ x: window.innerWidth - 220, y: 20 });
  
  // Static sprite-based energy display position
  const spriteEnergyPosition = { x: 20, y: 20 };
  
  // Button positions (top-right corner)
  const playButtonPosition = { x: window.innerWidth - 180, y: 20 };
  const upgradeButtonPosition = { x: window.innerWidth - 115, y: 20 };

  // Drone button position (below main play button)
  const dronePlayButtonPosition = { x: window.innerWidth - 180, y: 90 };

  // Menu button position (to the right of energy bar)
  const menuButtonPosition = { x: 30, y: 80 };
  const glossaryButtonPosition = { x: 220, y: 40 };
  const quickProgramButtonPosition = { x: 320, y: 40 };
  const questButtonPosition = { x: 270, y: 40 }; // Centered between glossary and programming terminal

  // Plant/Harvest button positions (lower-right corner)
  const plantButtonPosition = { x: window.innerWidth - 180, y: window.innerHeight - 140 };
  const harvestButtonPosition = { x: window.innerWidth - 115, y: window.innerHeight - 140 };

  // Grid coordinate position (lower-left corner)
  const gridCoordinatePosition = { x: 20, y: window.innerHeight - 60 };

  // Wheat counter position (top-middle)
  const wheatCounterPosition = { x: window.innerWidth / 2 - 80, y: 20 };

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
      // Block if any modal is currently open (but allow during tutorial requirements)
      if (shouldBlockModalInteractions()) {
        console.log('Entity click blocked - modal is open');
        return;
      }
      
      console.log('[TUTORIAL] Entity click allowed - opening modal');
      setModalState({
        isOpen: true,
        entity,
        grid: undefined,
        position: { x: 100, y: 100 }
      });
      openModal('status');
    };

    const handleGridClick = (grid: GridTile) => {
      // Block if any modal is currently open (but allow during tutorial requirements)
      if (shouldBlockModalInteractions()) {
        console.log('Grid click blocked - modal is open');
        return;
      }
      
      console.log('[TUTORIAL] Grid click allowed - opening modal');
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

    // Handle drone click events
    const handleDroneClick = (drone: Entity) => {
      // Block if any modal is currently open
      if (shouldBlockModalInteractions()) {
        console.log('Drone click blocked - modal is open');
        return;
      }
      
      console.log('[DRONE] Drone clicked:', drone.name);
      // Open the entity modal for the drone (which will show programming interface)
      setModalState({
        isOpen: true,
        entity: drone,
        grid: undefined,
        position: { x: 100, y: 100 }
      });
      setActiveDroneId(drone.id);
      openModal('status');
    };

    // Handle drone execution events
    const handleDroneExecutionStarted = (data: { droneId: string }) => {
      console.log('[DRONE] Execution started:', data.droneId);
      setDroneExecutionStates(prev => {
        const next = new Map(prev);
        next.set(data.droneId, true);
        return next;
      });
    };

    const handleDroneExecutionCompleted = (data: { droneId: string; result: any }) => {
      console.log('[DRONE] Execution completed:', data.droneId, data.result);
      setDroneExecutionStates(prev => {
        const next = new Map(prev);
        next.set(data.droneId, false);
        return next;
      });
    };

    const handleDroneExecutionFailed = (data: { droneId: string; error: string }) => {
      console.log('[DRONE] Execution failed:', data.droneId, data.error);
      setDroneExecutionStates(prev => {
        const next = new Map(prev);
        next.set(data.droneId, false);
        return next;
      });
    };

    const handleDroneExecutionStopped = (data: { droneId: string }) => {
      console.log('[DRONE] Execution stopped:', data.droneId);
      setDroneExecutionStates(prev => {
        const next = new Map(prev);
        next.set(data.droneId, false);
        return next;
      });
    };

    // Handle Challenge Grid events
    const handleChallengeMovementBlocked = () => {
      console.log('[CHALLENGE] Movement blocked - showing message');
      setShowChallengeBlockedMessage(true);
      // Auto-hide after 2 seconds
      setTimeout(() => {
        setShowChallengeBlockedMessage(false);
      }, 2000);
    };

    // Handle login modal events
    const handleShowLoginModal = () => {
      console.log('[LOGIN] Checking authentication status');

      // If already authenticated, go straight to the game
      if (user && isStudentUser(user)) {
        console.log('[LOGIN] User already authenticated, starting game');
        EventBus.emit('login-success');
        return;
      }

      // Otherwise, show login modal
      console.log('[LOGIN] User not authenticated, showing login modal');
      setLoginModalState({ isOpen: true });
    };

    EventBus.on('entity-clicked', handleEntityClick);
    EventBus.on('grid-clicked', handleGridClick);
    EventBus.on('drone-clicked', handleDroneClick);
    EventBus.on('drone-execution-started', handleDroneExecutionStarted);
    EventBus.on('drone-execution-completed', handleDroneExecutionCompleted);
    EventBus.on('drone-execution-failed', handleDroneExecutionFailed);
    EventBus.on('drone-execution-stopped', handleDroneExecutionStopped);
    EventBus.on('code-execution-started', handleExecutionStarted);
    EventBus.on('code-execution-completed', handleExecutionCompleted);
    EventBus.on('code-execution-failed', handleExecutionFailed);
    EventBus.on('code-execution-stopped', handleExecutionStopped);
    EventBus.on('camera-locked-to-qubit', handleCameraLockChanged);
    EventBus.on('current-scene-ready', handleSceneReady);
    EventBus.on('map-editor-tileset-updated', handleTilesetUpdated);
    EventBus.on('request-upgrade-modal', handleUpgradeModalRequest);
    EventBus.on('challenge-movement-blocked', handleChallengeMovementBlocked);
    EventBus.on('show-login-modal', handleShowLoginModal);

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
      EventBus.removeListener('request-upgrade-modal');

      // Drone event cleanup
      EventBus.removeListener('drone-clicked');
      EventBus.removeListener('drone-execution-started');
      EventBus.removeListener('drone-execution-completed');
      EventBus.removeListener('drone-execution-failed');
      EventBus.removeListener('drone-execution-stopped');
      EventBus.removeListener('challenge-movement-blocked');
      EventBus.removeListener('show-login-modal');
    };
  }, [globalModalState.isAnyModalOpen, openModal, dialogueState, shouldBlockModalInteractions, user]);

  // Initialize DialogueManager
  useEffect(() => {
    // Register state change callback
    DialogueManager.onStateChange((dialogueState, tutorialState) => {
      setDialogueState(dialogueState);
      setTutorialState(tutorialState);

      // Update modal state when dialogue opens/closes
      if (dialogueState.isActive && !globalModalState.openModals.has('dialogue')) {
        openModal('dialogue');
      } else if (!dialogueState.isActive && globalModalState.openModals.has('dialogue')) {
        closeModal('dialogue');
      }
    });

    // Set Phaser scene reference when scene is ready
    const handleSceneReady = (scene: ProgrammingGame) => {
      DialogueManager.setPhaserScene(scene);
    };

    EventBus.on('current-scene-ready', handleSceneReady);

    return () => {
      EventBus.removeListener('current-scene-ready', handleSceneReady);
    };
  }, [openModal, closeModal, globalModalState.openModals]);

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
        code: '# Main function - execution starts here\ndef main():\n    # Your code here\n    pass',
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

  // Initialize quest system (runs when scene is ready)
  useEffect(() => {
    const store = useGameStore.getState();

    const initializeQuests = async () => {
      try {
        // Load all quest files
        await store.loadQuests([
          'quests/game_intro.json',
          'quests/first_harvest.json',
          'quests/auto_movement.json',
          'quests/farming_scripts.json',
          'quests/full_automation.json',
          'quests/alpha_drone_intro.json',
          'quests/drone_farming_quest.json'
        ]);
        console.log('[Quest System] Quests loaded');

        // Only auto-start tutorial if we're on the ProgrammingGame scene
        if (currentScene !== 'ProgrammingGame') {
          console.log('[Quest System] Not on ProgrammingGame scene yet, skipping auto-start');
          return;
        }

        // Check if player has seen tutorial
        const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');

        if (!hasSeenTutorial) {
          // Auto-start tutorial for new players
          console.log('[Quest System] New player detected - auto-starting tutorial');

          // Small delay to ensure game is fully initialized
          setTimeout(() => {
            const success = store.startQuest('game_intro');

            if (success) {
              // Set flag to prevent auto-start on subsequent loads
              localStorage.setItem('hasSeenTutorial', 'true');
              console.log('[Quest System] Tutorial started successfully');
            } else {
              console.warn('[Quest System] Failed to start tutorial');
            }
          }, 500);
        } else {
          console.log('[Quest System] Returning player - skipping auto-start');
        }
      } catch (error) {
        console.error('[Quest System] Failed to initialize quests:', error);
      }
    };

    // Initialize quests asynchronously only when on ProgrammingGame scene
    if (currentScene === 'ProgrammingGame') {
      initializeQuests();
    }
  }, [currentScene]); // Depends on currentScene

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

    // Emit tutorial event for play button click
    EventBus.emit('tutorial-play-clicked');

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

  const handleRunDroneCode = (droneId: string) => {
    const scene = phaserRef.current?.scene as any;

    if (!scene) {
      console.warn('No scene available for drone execution');
      return;
    }

    const isDroneRunning = droneExecutionStates.get(droneId) || false;

    if (isDroneRunning) {
      console.log('Stopping drone execution', droneId);
      if (scene.stopDroneExecution) {
        scene.stopDroneExecution(droneId);
      }
    } else {
      console.log('Starting drone execution', droneId);
      if (scene.startDroneExecution) {
        scene.startDroneExecution(droneId);
      }
    }
  };

  const handlePlantButton = async () => {
    console.log('[PLANT BUTTON] Clicked');
    const store = useGameStore.getState();
    const qubitEntity = store.entities.get('qubit');

    if (!qubitEntity) {
      console.warn('[PLANT BUTTON] Qubit entity not found');
      return;
    }

    // Check if qubit is blocked (code is running)
    if (qubitEntity.taskState.isBlocked) {
      console.log('[PLANT BUTTON] Cannot plant - entity is busy');
      return;
    }

    // Get current grid
    const currentGrid = store.getGridAt(qubitEntity.position);
    if (!currentGrid || currentGrid.type !== 'farmland') {
      console.log('[PLANT BUTTON] Not on farmland');
      return;
    }

    // Execute plant function
    const scene = phaserRef.current?.scene as ProgrammingGame;
    if (scene && scene.gridSystem) {
      try {
        const result = await scene.gridSystem.executeGridFunction(
          currentGrid.id,
          'plant',
          qubitEntity,
          ['wheat']
        );
        console.log('[PLANT BUTTON] Plant result:', result);
        // Emit event for quest tracking
        EventBus.emit('action-plant-clicked', {});
      } catch (error) {
        console.error('[PLANT BUTTON] Error:', error);
      }
    }
  };

  const handleHarvestButton = async () => {
    console.log('[HARVEST BUTTON] Clicked');
    const store = useGameStore.getState();
    const qubitEntity = store.entities.get('qubit');

    if (!qubitEntity) {
      console.warn('[HARVEST BUTTON] Qubit entity not found');
      return;
    }

    // Check if qubit is blocked (code is running)
    if (qubitEntity.taskState.isBlocked) {
      console.log('[HARVEST BUTTON] Cannot harvest - entity is busy');
      return;
    }

    // Get current grid
    const currentGrid = store.getGridAt(qubitEntity.position);
    if (!currentGrid || currentGrid.type !== 'farmland') {
      console.log('[HARVEST BUTTON] Not on farmland');
      return;
    }

    // Execute harvest function
    const scene = phaserRef.current?.scene as ProgrammingGame;
    if (scene && scene.gridSystem) {
      try {
        const result = await scene.gridSystem.executeGridFunction(
          currentGrid.id,
          'harvest',
          qubitEntity,
          []
        );
        console.log('[HARVEST BUTTON] Harvest result:', result);
        // Emit event for quest tracking
        EventBus.emit('action-harvest-clicked', {});
      } catch (error) {
        console.error('[HARVEST BUTTON] Error:', error);
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
      // Check shouldHide in real-time, not just when useEffect runs
      const shouldHide = DialogueManager.shouldHideDialogue();
      if (dialogueState.isActive && !dialogueState.isLoading && !shouldHide) {
        event.preventDefault();
        DialogueManager.advanceDialogue();
      }
    };

    const handleMouseClick = (event: MouseEvent) => {
      // Check shouldHide in real-time, not just when useEffect runs
      const shouldHide = DialogueManager.shouldHideDialogue();
      if (dialogueState.isActive && !dialogueState.isLoading && !shouldHide) {
        // Check if click is inside dialogue box (we'll let it propagate to the dialogue component)
        const target = event.target as HTMLElement;
        if (target.closest('.dialogue-container')) {
          event.stopPropagation();
          DialogueManager.advanceDialogue();
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
  }, [dialogueState.isActive, dialogueState.isLoading]);

  // Track Challenge Grid status
  useEffect(() => {
    const updateChallengeGridStatus = () => {
      const store = useGameStore.getState();
      const activeEntity = store.entities.get(store.activeEntityId);
      if (activeEntity) {
        const onChallengeGrid = store.isPlayerOnChallengeGrid();
        setIsOnChallengeGrid(onChallengeGrid);
      }
    };

    // Check immediately
    updateChallengeGridStatus();

    // Check on entity position changes
    const intervalId = setInterval(updateChallengeGridStatus, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeEntityId, entities]);

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

          {/* User Info Panel - Top Left */}
          {user && isStudentUser(user) && (
            <div style={{
              left: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '2px solid #0ec3c9',
              borderRadius: '8px',
              padding: '10px 15px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              zIndex: 1000,
              fontFamily: 'BoldPixels',
              pointerEvents: 'auto',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#0ec3c9',
                  textShadow: '0 0 5px rgba(14, 195, 201, 0.5)',
                }}>
                  {user.username}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}>
                  Student
                </div>
              </div>

              <button
                onClick={() => logout()}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: '#ff6b6b',
                  border: '1px solid #ff6b6b',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff6b6b';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#ff6b6b';
                }}
              >
                LOGOUT
              </button>
            </div>
          )}

          {/* Save/Load/Reset Control Panel - Top Left (below user info) */}
          {/* {user && isStudentUser(user) && showProgrammingInterface && (
            <div style={{
              position: 'absolute',
              top: '80px', // Below user info panel
              left: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '2px solid #16c60c',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 1000,
              fontFamily: 'BoldPixels',
              pointerEvents: 'auto',
            }}>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '4px',
              }}>
                GAME PROGRESS
              </div>

              <button
                onClick={() => EventBus.emit('save-game-state')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: '#16c60c',
                  border: '1px solid #16c60c',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#16c60c';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#16c60c';
                }}
              >
                SAVE GAME
              </button>

              <button
                onClick={() => EventBus.emit('load-game-state')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: '#0ec3c9',
                  border: '1px solid #0ec3c9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0ec3c9';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#0ec3c9';
                }}
              >
                LOAD GAME
              </button>

              <button
                onClick={() => setResetConfirmModalState({ isOpen: true })}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: '#ff6600',
                  border: '1px solid #ff6600',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff6600';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#ff6600';
                }}
              >
                RESET
              </button>
            </div>
          )} */}
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

      {/* Modal Blocking Overlay - Covers game area when any modal is open */}
      {showProgrammingInterface && shouldBlockModalInteractions() && (
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

          {/* Menu Button - To the right of energy bar */}
          <SpriteButton
            position={menuButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 688, y: 256, w: 16, h: 16 }}
            downFrame={{ x: 688, y: 272, w: 16, h: 16 }}
            scale={3}
            onClick={() => {
              if (!globalModalState.isAnyModalOpen) {
                setGameMenuModalState({ isOpen: true });
                openModal('game-menu');
              }
            }}
          />

          {/* Glossary Button */}
          <SpriteButton
            position={glossaryButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 320, y: 496, w: 16, h: 16 }}
            downFrame={{ x: 320, y: 512, w: 16, h: 16 }}
            scale={3}
            onClick={() => {
              if (!globalModalState.isAnyModalOpen) {
                setGlossaryModalState({ isOpen: true });
                openModal('glossary');
              }
            }}
          />

          {/* Quick Programming Button */}
          <SpriteButton
            position={quickProgramButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 432, y: 496, w: 16, h: 16 }}
            downFrame={{ x: 432, y: 512, w: 16, h: 16 }}
            scale={3}
            onClick={() => {
              if (!globalModalState.isAnyModalOpen) {
                const qubitEntity = entities.get('qubit');
                if (qubitEntity) {
                  setModalState({
                    isOpen: true,
                    entity: qubitEntity,
                    grid: undefined,
                    position: { x: 100, y: 100 }
                  });
                  openModal('status');
                  // Set a flag to open programming tab
                  setTimeout(() => {
                    EventBus.emit('open-programming-tab');
                  }, 100);
                }
              }
            }}
          />

          {/* Quest Log Button */}
          <SpriteButton
            position={questButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 384, y: 496, w: 16, h: 16 }}
            downFrame={{ x: 384, y: 512, w: 16, h: 16 }}
            scale={3}
            onClick={() => {
              if (!globalModalState.isAnyModalOpen) {
                setQuestModalState({ isOpen: true });
                openModal('quest');
              }
            }}
          />

          {/* Plant Button (lower-right corner) */}
          <SpriteButton
            position={plantButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 480, y: 496, w: 16, h: 16 }}
            downFrame={{ x: 480, y: 512, w: 16, h: 16 }}
            scale={5}
            onClick={() => {
              if (!isCodeRunning && activeEntity && !activeEntity.taskState.isBlocked) {
                handlePlantButton();
              }
            }}
          />

          {/* Harvest Button (lower-right corner) */}
          <SpriteButton
            position={harvestButtonPosition}
            backgroundSprite="button.png"
            upFrame={{ x: 528, y: 496, w: 16, h: 16 }}
            downFrame={{ x: 528, y: 512, w: 16, h: 16 }}
            scale={5}
            onClick={() => {
              if (!isCodeRunning && activeEntity && !activeEntity.taskState.isBlocked) {
                handleHarvestButton();
              }
            }}
          />

          {/* Grid Coordinate Indicator (lower-left) */}
          {activeEntity && (
            <div style={{
              position: 'absolute',
              left: gridCoordinatePosition.x,
              top: gridCoordinatePosition.y,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              border: '2px solid #4A90E2',
              borderRadius: '8px',
              padding: '8px 12px',
              fontFamily: 'BoldPixels',
              fontSize: '16px',
              color: 'white',
              pointerEvents: 'auto'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#4A90E2',
                marginBottom: '4px'
              }}>
                Grid Position
              </div>
              <div style={{
                fontSize: '18px',
                color: '#ffffff'
              }}>
                ({Math.floor(activeEntity.visualPosition?.x ?? activeEntity.position.x)}, {Math.floor(activeEntity.visualPosition?.y ?? activeEntity.position.y)})
              </div>
            </div>
          )}

          {/* Wheat Counter (top-middle) */}
          <div style={{
            position: 'absolute',
            left: wheatCounterPosition.x,
            top: wheatCounterPosition.y,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '3px solid #FFD700',
            borderRadius: '10px',
            padding: '10px 20px',
            fontFamily: 'BoldPixels',
            fontSize: '18px',
            color: 'white',
            pointerEvents: 'auto',
            minWidth: '160px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <span style={{
                fontSize: '24px',
                color: '#FFD700'
              }}>🌾</span>
              <span style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#FFD700'
              }}>
                {globalResources.wheat || 0}
              </span>
            </div>
          </div>

          {/* Drone Control Panel - Below main play button */}
          {(() => {
            // Get all drones
            const allDrones = Array.from(entities.values()).filter(e => e.isDrone);
            
            // Show the first drone (or selected drone)
            const displayDrone = activeDroneId 
              ? entities.get(activeDroneId) 
              : allDrones[0];
            
            if (displayDrone && displayDrone.isDrone) {
              const isDroneRunning = droneExecutionStates.get(displayDrone.id) || false;
              
              return (
                <div style={{
                  position: 'absolute',
                  top: '90px',
                  right: '20px',
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px'
                }}>
                  {/* Drone Status Display */}
                  <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    border: '2px solid #4A90E2',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    minWidth: '200px',
                    fontFamily: 'BoldPixels',
                    fontSize: '14px',
                    color: 'white'
                  }}>
                    {/* Drone Name */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#4A90E2',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{displayDrone.name}</span>
                    </div>
                    
                    {/* Drone Position */}
                    <div style={{
                      fontSize: '12px',
                      color: '#cccccc',
                      marginBottom: '4px'
                    }}>
                      Position: ({displayDrone.position.x}, {displayDrone.position.y})
                    </div>
                    
                    {/* Drone Energy */}
                    <div style={{
                      fontSize: '12px',
                      color: '#cccccc',
                      marginBottom: '4px'
                    }}>
                      Energy: {displayDrone.stats.energy}/{displayDrone.stats.maxEnergy}
                    </div>
                    
                    {/* Execution Status */}
                    {isDroneRunning && (
                      <div style={{
                        fontSize: '11px',
                        color: '#FFD700',
                        marginTop: '6px',
                        padding: '3px 6px',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        borderRadius: '4px',
                        border: '1px solid #FFD700'
                      }}>
                        ⚡ Executing...
                      </div>
                    )}
                  </div>
                  
                  {/* Drone Play Button */}
                  <div >
                    <SpriteButton
                      position={{ x: 180, y: 10 }}
                      backgroundSprite="button.png"
                      upFrame={{ x: 176, y: 16, w: 16, h: 16 }}
                      downFrame={{ x: 176, y: 32, w: 16, h: 16 }}
                      scale={2.5}
                      onClick={() => handleRunDroneCode(displayDrone.id)}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Challenge Grid Indicator - Top Center */}
          {isOnChallengeGrid && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 100, 100, 0.95)',
              border: '3px solid #FF0000',
              borderRadius: '12px',
              padding: '12px 24px',
              color: '#FFFFFF',
              fontSize: '18px',
              fontFamily: 'BoldPixels',
              zIndex: 2500,
              pointerEvents: 'none',
              boxShadow: '0 4px 16px rgba(255, 0, 0, 0.5)',
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                justifyContent: 'center'
              }}>
                <span style={{ fontWeight: 'bold' }}>CHALLENGE GRID - Code Only Mode</span>
              </div>
              <div style={{ 
                fontSize: '14px', 
                textAlign: 'center', 
                marginTop: '4px',
                color: '#FFEEEE'
              }}>
                Arrow keys disabled • Use code to move • No energy cost
              </div>
            </div>
          )}

          {/* Challenge Movement Blocked Message */}
          {showChallengeBlockedMessage && (
            <div style={{
              position: 'absolute',
              top: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 150, 0, 0.95)',
              border: '2px solid #FF8800',
              borderRadius: '8px',
              padding: '10px 20px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontFamily: 'BoldPixels',
              zIndex: 2500,
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(255, 136, 0, 0.5)',
              animation: 'slideInDown 0.3s ease-out'
            }}>
              🚫 Manual movement blocked! Use code to move on Challenge Grid
            </div>
          )}

          {/* Tutorial Task Indicator - Bottom Right */}
          {dialogueState.isActive && DialogueManager.shouldHideDialogue() && (() => {
            const currentDialogue = dialogueState.dialogues[dialogueState.currentIndex];
            if (currentDialogue?.objectives && currentDialogue.objectives.length > 0) {
              return (
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '2px solid #FFD700',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#FFD700',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels',
                  maxWidth: '300px',
                  zIndex: 2000,
                  pointerEvents: 'none'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontWeight: 'bold' }}>Current Task:</span>
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.3' }}>
                    {currentDialogue.objectives[0].description}
                  </div>
                  {/* Progress indicator for movement tutorial */}
                  {currentDialogue.objectives[0].type === 'movement' && currentDialogue.objectives[0].directions && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {currentDialogue.objectives[0].directions!.map(dir => (
                        <span 
                          key={dir}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: tutorialState.movementDirections.has(dir) ? 'rgba(0, 200, 0, 0.3)' : 'rgba(100, 100, 100, 0.3)',
                            border: `1px solid ${tutorialState.movementDirections.has(dir) ? '#00CC00' : '#666666'}`,
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}
                        >
                          {dir.toUpperCase()} {tutorialState.movementDirections.has(dir) ? '✓' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Progress indicator for challenge completion */}
                  {currentDialogue.objectives[0].type === 'challenge_completion' && currentDialogue.objectives[0].challengePositions && (() => {
                    const store = useGameStore.getState();
                    const total = currentDialogue.objectives[0].challengePositions.length;
                    const completed = currentDialogue.objectives[0].challengePositions.filter(pos => {
                      const grid = store.getGridAt(pos);
                      return grid?.type === 'farmland' && 
                             grid.state?.status === 'ready' && 
                             grid.state?.isGrown === true &&
                             grid.state?.plantType === 'wheat';
                    }).length;
                    
                    return (
                      <div style={{ 
                        marginTop: '8px', 
                        fontSize: '12px'
                      }}>
                        <div style={{
                          padding: '4px 8px',
                          backgroundColor: completed === total ? 'rgba(0, 200, 0, 0.3)' : 'rgba(100, 100, 100, 0.3)',
                          border: `1px solid ${completed === total ? '#00CC00' : '#666666'}`,
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          Progress: {completed} / {total} wheat plants grown {completed === total ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            }
            return null;
          })()}

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

      {/* Dialogue System Overlay - Always on top when active and not hidden for tutorial */}
      {dialogueState.isActive && !DialogueManager.shouldHideDialogue() && (
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
            onClick={() => DialogueManager.advanceDialogue()}
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
                  
                  {/* Tutorial Requirement Indicator */}
                  {(() => {
                    const currentDialogue = dialogueState.dialogues[dialogueState.currentIndex];
                    if (currentDialogue?.objectives && currentDialogue.objectives.length > 0) {
                      const isComplete = DialogueManager.isRequirementMet(currentDialogue.objectives[0]);
                      return (
                        <div style={{
                          marginTop: '8px',
                          padding: '6px 10px',
                          backgroundColor: isComplete ? 'rgba(0, 150, 0, 0.2)' : 'rgba(150, 150, 0, 0.2)',
                          border: `2px solid ${isComplete ? '#00AA00' : '#AAAA00'}`,
                          borderRadius: '6px',
                          fontSize: '16px',
                          fontFamily: 'BoldPixels',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>
                              {isComplete ? '✓' : '⏳'}
                            </span>
                            <span>
                              {currentDialogue.objectives[0].description}
                              {!isComplete && ' (In Progress...)'}
                            </span>
                          </div>

                          {/* Challenge completion progress */}
                          {currentDialogue.objectives[0].type === 'challenge_completion' &&
                           currentDialogue.objectives[0].challengePositions && (() => {
                            const store = useGameStore.getState();
                            const total = currentDialogue.objectives[0].challengePositions.length;
                            const completed = currentDialogue.objectives[0].challengePositions.filter(pos => {
                              const grid = store.getGridAt(pos);
                              return grid?.type === 'farmland' &&
                                     grid.state?.status === 'ready' &&
                                     grid.state?.isGrown === true &&
                                     grid.state?.plantType === 'wheat';
                            }).length;
                            
                            return (
                              <div style={{
                                padding: '4px 8px',
                                backgroundColor: completed === total ? 'rgba(0, 200, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                                border: `1px solid ${completed === total ? '#00CC00' : '#666666'}`,
                                borderRadius: '4px',
                                fontSize: '13px'
                              }}>
                                🌾 Progress: {completed} / {total} wheat plants grown
                              </div>
                            );
                          })()}
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                animation: (dialogueState.dialogues[dialogueState.currentIndex]?.objectives &&
                          dialogueState.dialogues[dialogueState.currentIndex].objectives!.length > 0 &&
                          !DialogueManager.isRequirementMet(dialogueState.dialogues[dialogueState.currentIndex].objectives![0]))
                          ? 'none' : 'pulse 1.5s ease-in-out infinite'
              }}>
                {(() => {
                  const currentDialogue = dialogueState.dialogues[dialogueState.currentIndex];
                  if (currentDialogue?.objectives && currentDialogue.objectives.length > 0 &&
                      !DialogueManager.isRequirementMet(currentDialogue.objectives[0])) {
                    return `Complete task: ${currentDialogue.objectives[0].description}`;
                  }
                  return dialogueState.currentIndex < dialogueState.dialogues.length - 1
                    ? 'Click or press any key to continue...'
                    : 'Click or press any key to close...';
                })()}
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

      {/* Glossary Modal */}
      {glossaryModalState.isOpen && (
        <GlossaryModal
          isOpen={glossaryModalState.isOpen}
          onClose={() => {
            setGlossaryModalState({ isOpen: false });
            closeModal('glossary');
          }}
        />
      )}

      {/* Quest Modal */}
      {questModalState.isOpen && (
        <QuestModal
          isOpen={questModalState.isOpen}
          onClose={() => {
            setQuestModalState({ isOpen: false });
            closeModal('quest');
          }}
        />
      )}

      {/* Educational Error Display */}
      <ErrorDisplay />

      {/* Reset Confirmation Modal */}
      {resetConfirmModalState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '3px solid #ff6600',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            boxShadow: '0 0 30px rgba(255, 102, 0, 0.5)',
          }}>
            <div style={{
              fontSize: '24px',
              color: '#ff6600',
              fontFamily: 'BoldPixels',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              RESET PROGRESS?
            </div>

            <div style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.87)',
              fontFamily: 'BoldPixels',
              marginBottom: '30px',
              lineHeight: '1.6',
            }}>
              This will permanently delete all your progress, including:
              <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                <li>All quest completions</li>
                <li>Code windows and entity positions</li>
                <li>Resources and upgrades</li>
                <li>Map progress</li>
              </ul>
              This action cannot be undone!
            </div>

            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
            }}>
              <button
                onClick={() => setResetConfirmModalState({ isOpen: false })}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#16c60c',
                  border: '2px solid #16c60c',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#16c60c';
                  e.currentTarget.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#16c60c';
                }}
              >
                CANCEL
              </button>

              <button
                onClick={() => {
                  setResetConfirmModalState({ isOpen: false });
                  EventBus.emit('reset-game-state');
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#ff0000',
                  border: '2px solid #ff0000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff0000';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#ff0000';
                }}
              >
                YES, RESET
              </button>
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

      {/* Login Modal - Shows when user clicks Start on main menu */}
      <LoginModal
        isVisible={loginModalState.isOpen}
        onLoginSuccess={() => {
          console.log('[LOGIN] Login successful');
          setLoginModalState({ isOpen: false });
          // Transition to the game scene
          EventBus.emit('login-success');
        }}
        onClose={() => {
          setLoginModalState({ isOpen: false });
        }}
      />

      {/* Game Menu Modal */}
      {gameMenuModalState.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 5000,
          pointerEvents: 'auto'
        }}>
          <div style={{
            backgroundColor: '#d8a888',
            border: '10px solid #210714',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 0 30px rgba(33, 7, 20, 0.5)',
          }}>
            <div style={{
              fontSize: '28px',
              color: '#210714',
              fontFamily: 'BoldPixels',
              marginBottom: '25px',
              textAlign: 'center',
            }}>
              GAME MENU
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* Save Button */}
              <button
                onClick={() => {
                  EventBus.emit('save-game-state');
                  setGameMenuModalState({ isOpen: false });
                  closeModal('game-menu');
                }}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#210714',
                  border: '2px solid #210714',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#210714';
                  e.currentTarget.style.color = '#d8a888';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#210714';
                }}
              >
                SAVE GAME
              </button>

              {/* Load Button */}
              <button
                onClick={() => {
                  EventBus.emit('load-game-state');
                  setGameMenuModalState({ isOpen: false });
                  closeModal('game-menu');
                }}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#210714',
                  border: '2px solid #210714',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#210714';
                  e.currentTarget.style.color = '#d8a888';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#210714';
                }}
              >
                LOAD GAME
              </button>

              {/* Logout Button */}
              <button
                onClick={() => {
                  // Clear localStorage
                  localStorage.clear();
                  // Clear cookies
                  document.cookie.split(";").forEach((c) => {
                    document.cookie = c
                      .replace(/^ +/, "")
                      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                  });
                  // Logout user
                  logout();
                  setGameMenuModalState({ isOpen: false });
                  closeModal('game-menu');
                }}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#ff0000',
                  border: '2px solid #ff0000',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                  marginTop: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff0000';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#ff0000';
                }}
              >
                LOGOUT
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  setGameMenuModalState({ isOpen: false });
                  closeModal('game-menu');
                }}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: '#666666',
                  border: '2px solid #666666',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: 'BoldPixels',
                  transition: 'all 0.3s',
                  marginTop: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#666666';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666666';
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameInterface; 