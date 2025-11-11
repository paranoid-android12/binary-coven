import React, { useState, useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';
import tilesetConfig from '../config/tilesets.json';

interface TilesetInfo {
  key: string;
  tileSize: number;
  columns: number;
  rows: number;
  name: string;
}

interface TilesetConfigItem {
  key: string;
  name: string;
  filename: string;
  path: string;
  tileSize: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
}

interface TileData {
  type: string;
  spriteKey: string;
  frame: number;
  spriteX: number;
  spriteY: number;
  layer: number;
}

interface MapEditorUIProps {
  tilesets: { [key: string]: TilesetInfo };
  activeTileset: string;
  selectedLayer: number;
  onTileSelect: (tile: TileData) => void;
  onSave: () => void;
  onLoad: () => void;
  onToggleEditor: () => void;
  isActive: boolean;
}

export const MapEditorUI: React.FC<MapEditorUIProps> = ({
  tilesets,
  activeTileset,
  selectedLayer,
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
  const [currentLayer, setCurrentLayer] = useState(selectedLayer);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Draggable functionality
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 10 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const TILE_SIZE = 16; // Each tile in the tileset is 16x16 pixels
  const DISPLAY_SCALE = 1.5; // Scale up the tileset display for better visibility
  
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

  // Initial load effect - only runs when component becomes active
  useEffect(() => {
      console.log('Map editor activated, loading initial tileset:', activeTileset);
      loadTilesetImage();
    
  }, [isActive]);

  // Tileset change effect - only runs when tileset changes (not on initial load)
  useEffect(() => {
    // Skip if not active or if this is the initial load
    if (!isActive || !activeTileset) return;
    
    console.log('Active tileset changed to:', activeTileset);
    
    // Clear selection when switching tilesets
    setSelectedTileIndex(null);
    setSelectedCoords(null);
    
    // Small delay to ensure state updates are processed
    const timeoutId = setTimeout(() => {
      loadTilesetImage();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [activeTileset]);

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
    // Find tileset in config to get the correct path
    const tilesetInfo = (tilesetConfig as TilesetConfigItem[]).find(ts => ts.key === activeTileset);

    // Use path from config if available, otherwise try default path
    const filepath = tilesetInfo ? tilesetInfo.path : `tilesets/${activeTileset}.png`;

    console.log(`Loading tileset: ${activeTileset} -> ${filepath}`);

    const img = new Image();
    img.onload = () => {
      console.log(`Tileset loaded: ${img.width}x${img.height} pixels`);

      // Calculate actual dimensions based on image size and 16px tile size
      const actualColumns = Math.floor(img.width / TILE_SIZE);
      const actualRows = Math.floor(img.height / TILE_SIZE);

      console.log(`Calculated tileset dimensions: ${actualColumns}x${actualRows} tiles`);

      // Set actual dimensions based on the loaded image
      setActualTilesetColumns(actualColumns);
      setActualTilesetRows(actualRows);

      // Store the image reference
      imageRef.current = img;

      // Use setTimeout to ensure state is updated before drawing
      setTimeout(() => {
        drawTileset(img, actualColumns, actualRows);
      }, 0);

      setStatus(`${tilesets[activeTileset]?.name || activeTileset} loaded: ${actualColumns}x${actualRows} tiles`);
    };

    img.onerror = (error) => {
      console.error(`Failed to load tileset: ${filepath}`, error);
      setStatus(`ERROR: Failed to load ${filepath}`);

      // Clear the canvas on error and show error message
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 400;
          canvas.height = 300;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#333';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#fff';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Failed to load ${filepath}`, canvas.width / 2, canvas.height / 2);
        }
      }
    };

    img.src = `/${filepath}`;
  };

  const drawTileset = (img: HTMLImageElement, columns?: number, rows?: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use passed dimensions or current state, with fallback to consistent values
    const useColumns = columns || actualTilesetColumns || 16;
    const useRows = rows || actualTilesetRows || 16;
    
    // Calculate consistent canvas size
    const canvasWidth = useColumns * TILE_SIZE * DISPLAY_SCALE;
    const canvasHeight = useRows * TILE_SIZE * DISPLAY_SCALE;
    
    console.log(`Drawing tileset: ${useColumns}x${useRows}, canvas: ${canvasWidth}x${canvasHeight}`);
    
    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Enable pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Clear canvas first
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw the tileset scaled to fit consistently
    // This ensures all tilesets display at the same scale regardless of actual image size
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      0, 0, canvasWidth, canvasHeight
    );

    // Draw grid lines for easier tile selection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = 0; x <= useColumns; x++) {
      const pixelX = x * TILE_SIZE * DISPLAY_SCALE;
      ctx.beginPath();
      ctx.moveTo(pixelX, 0);
      ctx.lineTo(pixelX, canvasHeight);
      ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= useRows; y++) {
      const pixelY = y * TILE_SIZE * DISPLAY_SCALE;
      ctx.beginPath();
      ctx.moveTo(0, pixelY);
      ctx.lineTo(canvasWidth, pixelY);
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
    if (!canvas || !imageRef.current) {
      console.warn('Canvas or image not ready for click handling');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Validate click coordinates
    if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) {
      console.warn('Click outside canvas bounds');
      return;
    }

    // Calculate the scale factor between displayed canvas and actual canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get the actual coordinates on the canvas
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;

    // Use consistent dimensions for coordinate calculation
    const useColumns = actualTilesetColumns || 16;
    const useRows = actualTilesetRows || 16;

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
      useColumns, useRows,
      tileSize: TILE_SIZE,
      displayScale: DISPLAY_SCALE
    });

    // Validate tile coordinates with defensive bounds checking
    if (tileX >= 0 && tileX < useColumns && tileY >= 0 && tileY < useRows) {
      const frame = tileY * useColumns + tileX;
      
      const tileData: TileData = {
        type: `ground_tile`,
        spriteKey: activeTileset,
        frame: frame,
        spriteX: tileX * TILE_SIZE,
        spriteY: tileY * TILE_SIZE,
        layer: currentLayer
      };

      setSelectedTileIndex(frame);
      setSelectedCoords({ x: tileX, y: tileY });
      
      // Notify parent component
      onTileSelect(tileData);
      
      // Emit event for the map editor
      EventBus.emit('map-editor-tile-selected', tileData);
      
      // Redraw to show selection (use defensive check)
      if (imageRef.current) {
        drawTileset(imageRef.current, useColumns, useRows);
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
      console.log('Click outside valid tile area:', { 
        tileX, tileY, 
        bounds: { columns: useColumns, rows: useRows }
      });
    }
  };

  const handleDebugMapEditor = () => {
    // Emit debug request to map editor
    EventBus.emit('map-editor-debug-request');
    
    // Log current UI state
    console.log('=== MAP EDITOR UI DEBUG ===');
    console.log('Selected tile index:', selectedTileIndex);
    console.log('Selected coordinates:', selectedCoords);
    console.log('Tilesets (passed):', tilesets);
    console.log('Active tileset:', activeTileset);
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
    
    // Redraw with consistent dimensions
    if (imageRef.current && canvasRef.current) {
      const useColumns = actualTilesetColumns || 16;
      const useRows = actualTilesetRows || 16;
      drawTileset(imageRef.current, useColumns, useRows);
    }
    
    setStatus('Selection cleared');
  };

  if (!isActive) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: '12px',
        borderRadius: '8px',
        color: 'white',
        minWidth: '150px',
        zIndex: 1001,
        border: '2px solid #44ff44'
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
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🗺️ Edit Map
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
        zIndex: 1001,
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
           Close
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

      {/* Tileset Tabs */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
          {Object.entries(tilesets).map(([key, tileset]) => (
            <button
              key={key}
              onClick={() => {
                EventBus.emit('map-editor-tileset-changed', key);
                setStatus(`Switched to ${tileset.name}`);
              }}
              style={{
                backgroundColor: activeTileset === key ? '#007acc' : '#444',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px',
                flex: 1
              }}
            >
              {tileset.name}
            </button>
          ))}
        </div>

        {/* Layer Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#ccc' }}>Layer:</span>
          <input
            type="number"
            value={currentLayer}
            onChange={(e) => {
              const layer = parseInt(e.target.value) || 1;
              setCurrentLayer(layer);
              EventBus.emit('map-editor-layer-changed', layer);
            }}
            min="1"
            max="10"
            style={{
              width: '50px',
              padding: '2px 6px',
              backgroundColor: '#333',
              border: '1px solid #007acc',
              borderRadius: '3px',
              color: 'white',
              fontSize: '12px'
            }}
          />
          <span style={{ fontSize: '11px', color: '#888' }}>
            Higher = Above
          </span>
        </div>
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
           Save
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
           Load
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
          ️ Clear
        </button>
        <button
          onClick={() => {
            EventBus.emit('map-editor-toggle-walls');
            setStatus('Wall visibility toggled');
          }}
          style={{
            backgroundColor: '#ffaa00',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ️ Walls
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
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{tilesets[activeTileset]?.name || activeTileset}:</span>
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
          {/* Show canvas for tile-based tilesets, instructions for grid-based ones */}
          {activeTileset === 'Farmland_Grid' ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#ccc'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
              <div style={{ fontSize: '12px' }}>Click on the map to place/remove farmland grids</div>
              <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                Brown squares with 50% opacity
              </div>
            </div>
          ) : activeTileset === 'Wall_Grid' ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#ccc'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}></div>
              <div style={{ fontSize: '12px' }}>Click on the map to place/remove wall grids</div>
              <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                Yellow squares (toggle visibility with Walls button)
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                cursor: 'crosshair',
                display: 'block',
                width: 'auto',
                height: 'auto'
              }}
            />
          )}
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
             Debug
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
             Log Info
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