import React, { useState, useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';

interface TilesetInfo {
  key: string;
  tileSize: number;
  columns: number;
  rows: number;
}

interface TileData {
  type: string;
  spriteKey: string;
  frame: number;
  spriteX: number;
  spriteY: number;
}

interface MapEditorUIProps {
  tilesetInfo: TilesetInfo;
  onTileSelect: (tile: TileData) => void;
  onSave: () => void;
  onLoad: () => void;
  onToggleEditor: () => void;
  isActive: boolean;
}

export const MapEditorUI: React.FC<MapEditorUIProps> = ({
  tilesetInfo,
  onTileSelect,
  onSave,
  onLoad,
  onToggleEditor,
  isActive
}) => {
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{x: number, y: number} | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [status, setStatus] = useState<string>('Ready');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Draggable functionality
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 10 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const TILE_SIZE = 16; // Each tile in the tileset is 16x16 pixels
  const DISPLAY_SCALE = 1; // Scale up the tileset display for better visibility
  
  // These will be calculated from the loaded image
  const [actualTilesetColumns, setActualTilesetColumns] = useState(16);
  const [actualTilesetRows, setActualTilesetRows] = useState(16);

  useEffect(() => {
    // Listen for map editor events
    const handleSaved = (event: any) => {
      setStatus(event.success ? 'Map saved successfully!' : 'Save failed');
      setTimeout(() => setStatus('Ready'), 3000);
    };

    const handleLoaded = (event: any) => {
      setStatus(event.success ? 'Map loaded successfully!' : `Load failed: ${event.error || 'Unknown error'}`);
      setTimeout(() => setStatus('Ready'), 3000);
    };

    EventBus.on('map-editor-saved', handleSaved);
    EventBus.on('map-editor-loaded', handleLoaded);

    return () => {
      EventBus.removeListener('map-editor-saved');
      EventBus.removeListener('map-editor-loaded');
    };
  }, []);

  useEffect(() => {
    // Load and draw the tileset image when component mounts
    if (isActive) {
      loadTilesetImage();
    }
  }, [isActive]);
  
  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('map-editor-header')) {
      isDragging.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - rect.width)),
        y: Math.max(0, Math.min(newY, window.innerHeight - rect.height))
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

  const loadTilesetImage = () => {
    const img = new Image();
    img.onload = () => {
      // Calculate actual tileset dimensions from the image
      const calculatedColumns = Math.floor(img.width / TILE_SIZE);
      const calculatedRows = Math.floor(img.height / TILE_SIZE);
      
      setActualTilesetColumns(calculatedColumns);
      setActualTilesetRows(calculatedRows);
      
      console.log(`Tileset loaded: ${img.width}x${img.height} pixels`);
      console.log(`Calculated grid: ${calculatedColumns}x${calculatedRows} tiles (${TILE_SIZE}x${TILE_SIZE} each)`);
      
      if (imageRef.current) {
        imageRef.current = img;
      }
      drawTileset(img);
      setStatus(`Tileset loaded: ${calculatedColumns}x${calculatedRows} tiles`);
    };
    img.onerror = () => {
      setStatus('ERROR: Failed to load Ground_Tileset.png');
      console.error('Failed to load Ground_Tileset.png');
    };
    img.src = '/Ground_Tileset.png'; // Assuming it's in the public folder
  };

  const drawTileset = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = actualTilesetColumns * TILE_SIZE * DISPLAY_SCALE;
    canvas.height = actualTilesetRows * TILE_SIZE * DISPLAY_SCALE;

    // Enable pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Draw the tileset scaled up
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      0, 0, canvas.width, canvas.height
    );

    // Draw grid lines for easier tile selection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= actualTilesetColumns; x++) {
      const pixelX = x * TILE_SIZE * DISPLAY_SCALE;
      ctx.beginPath();
      ctx.moveTo(pixelX, 0);
      ctx.lineTo(pixelX, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= actualTilesetRows; y++) {
      const pixelY = y * TILE_SIZE * DISPLAY_SCALE;
      ctx.beginPath();
      ctx.moveTo(0, pixelY);
      ctx.lineTo(canvas.width, pixelY);
      ctx.stroke();
    }

    // Draw selection highlight if a tile is selected
    if (selectedCoords) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        selectedCoords.x * TILE_SIZE * DISPLAY_SCALE,
        selectedCoords.y * TILE_SIZE * DISPLAY_SCALE,
        TILE_SIZE * DISPLAY_SCALE,
        TILE_SIZE * DISPLAY_SCALE
      );
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Calculate the scale factor between displayed canvas and actual canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get the actual coordinates on the canvas
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;

    // Calculate which tile was clicked (taking into account DISPLAY_SCALE)
    const tileX = Math.floor(canvasX / (TILE_SIZE * DISPLAY_SCALE));
    const tileY = Math.floor(canvasY / (TILE_SIZE * DISPLAY_SCALE));

    console.log('Click debug:', {
      clickX, clickY,
      canvasX, canvasY,
      scaleX, scaleY,
      tileX, tileY,
      canvasSize: { width: canvas.width, height: canvas.height },
      displaySize: { width: rect.width, height: rect.height },
      tileSize: TILE_SIZE,
      displayScale: DISPLAY_SCALE
    });

    // Validate coordinates
    if (tileX >= 0 && tileX < actualTilesetColumns && tileY >= 0 && tileY < actualTilesetRows) {
      const frame = tileY * actualTilesetColumns + tileX;
      
      const tileData: TileData = {
        type: `ground_tile`,
        spriteKey: 'Ground_Tileset',
        frame: frame,
        spriteX: tileX * TILE_SIZE,
        spriteY: tileY * TILE_SIZE
      };

      setSelectedTileIndex(frame);
      setSelectedCoords({ x: tileX, y: tileY });
      
      // Notify parent component
      onTileSelect(tileData);
      
      // Emit event for the map editor
      EventBus.emit('map-editor-tile-selected', tileData);
      
      // Redraw to show selection
      if (imageRef.current) {
        drawTileset(imageRef.current);
      }
      
      setStatus(`Tile selected: (${tileX}, ${tileY}) Frame: ${frame}`);
      
      if (debugMode) {
        console.log('Tile selected:', {
          coordinates: { x: tileX, y: tileY },
          frame,
          spriteX: tileX * TILE_SIZE,
          spriteY: tileY * TILE_SIZE,
          tileData
        });
      }
    } else {
      console.log('Click outside valid tile area:', { tileX, tileY, actualTilesetColumns, actualTilesetRows });
    }
  };

  const handleDebugMapEditor = () => {
    // Emit debug request to map editor
    EventBus.emit('map-editor-debug-request');
    
    // Log current UI state
    console.log('=== MAP EDITOR UI DEBUG ===');
    console.log('Selected tile index:', selectedTileIndex);
    console.log('Selected coordinates:', selectedCoords);
    console.log('Tileset info (passed):', tilesetInfo);
    console.log('Actual tileset dimensions:', { columns: actualTilesetColumns, rows: actualTilesetRows });
    console.log('Tile size:', TILE_SIZE);
    console.log('Display scale:', DISPLAY_SCALE);
    console.log('Is active:', isActive);
    console.log('Status:', status);
    console.log('===========================');
  };

  const clearSelection = () => {
    setSelectedTileIndex(null);
    setSelectedCoords(null);
    
    if (imageRef.current) {
      drawTileset(imageRef.current);
    }
    
    setStatus('Selection cleared');
  };

  if (!isActive) {
    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '250px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white',
        minWidth: '150px',
        zIndex: 1000
      }}>
        <button
          onClick={onToggleEditor}
          style={{
            backgroundColor: '#44ff44',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            fontSize: '14px'
          }}
        >
          🎨 Edit Map
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        width: '400px',
        minWidth: '400px',
        border: '2px solid #007acc',
        zIndex: 1000,
        cursor: 'move'
      }}>
      {/* Header */}
      <div 
        className="map-editor-header"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '10px',
          cursor: 'move'
        }}>
        <h3 style={{ margin: 0, color: '#007acc' }}>Map Editor</h3>
        <button
          onClick={onToggleEditor}
          style={{
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Status */}
      <div style={{
        backgroundColor: 'rgba(0, 123, 204, 0.2)',
        padding: '5px 8px',
        borderRadius: '4px',
        marginBottom: '10px',
        fontSize: '12px',
        border: '1px solid #007acc'
      }}>
        Status: {status}
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '5px', 
        marginBottom: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={onSave}
          style={{
            backgroundColor: '#4444ff',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          💾 Save
        </button>
        <button
          onClick={onLoad}
          style={{
            backgroundColor: '#ff8800',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          📁 Load
        </button>
        <button
          onClick={clearSelection}
          style={{
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Tileset Display */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '5px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Ground Tileset:</span>
          {selectedCoords && (
            <span style={{ 
              fontSize: '12px', 
              color: '#00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              Selected: ({selectedCoords.x}, {selectedCoords.y})
            </span>
          )}
        </div>
        
        <div style={{
          border: '2px solid #007acc',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#222'
        }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              cursor: 'crosshair',
              display: 'block',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        fontSize: '11px',
        color: '#ccc',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <strong>Instructions:</strong><br/>
        1. Click on a tile above to select it<br/>
        2. Click on the map grid to paint the selected tile<br/>
        3. Use Save/Load to manage your map designs
      </div>

      {/* Debug Section */}
      <div style={{ borderTop: '1px solid #444', paddingTop: '10px' }}>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button
            onClick={() => setDebugMode(!debugMode)}
            style={{
              backgroundColor: debugMode ? '#00ff00' : '#666',
              color: debugMode ? 'black' : 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            🐛 Debug
          </button>
          <button
            onClick={handleDebugMapEditor}
            style={{
              backgroundColor: '#ff6600',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            📊 Log Info
          </button>
        </div>
        
        {debugMode && selectedCoords && (
          <div style={{
            marginTop: '5px',
            fontSize: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '5px',
            borderRadius: '3px',
            fontFamily: 'monospace'
          }}>
            Frame: {selectedTileIndex}<br/>
            Coords: ({selectedCoords.x}, {selectedCoords.y})<br/>
            Sprite: ({selectedCoords.x * TILE_SIZE}, {selectedCoords.y * TILE_SIZE})
          </div>
        )}
      </div>
    </div>
  );
}; 