import React, { useRef, useEffect, useState } from 'react';
import { Entity, GridTile } from '../types/game';
import ProgrammingInterface from './ProgrammingInterface';
import ProgressBar from './ProgressBar';
import TaskManager from '../game/systems/TaskManager';
import { useGameStore } from '../stores/gameStore';
import { EventBus } from '../game/EventBus';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity?: Entity;
  grid?: GridTile;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  entity,
  grid,
  position,
  onPositionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const isResizing = useRef(false);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 600, height: 500 });
  const [activeTab, setActiveTab] = useState<'profile' | 'program'>('profile');
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const taskManager = TaskManager.getInstance();
  
  // Reset tab to 'profile' when modal opens or entity/grid changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('profile');
    }
  }, [isOpen, entity?.id, grid?.id]);

  // Listen for open programming tab event
  useEffect(() => {
    const handleOpenProgrammingTab = () => {
      if (isOpen && entity) {
        setActiveTab('program');
      }
    };

    EventBus.on('open-programming-tab', handleOpenProgrammingTab);
    
    return () => {
      EventBus.removeListener('open-programming-tab');
    };
  }, [isOpen, entity]);
  
  // Get fresh data from game store to ensure real-time updates
  const { entities, grids } = useGameStore();
  const currentEntity = entity ? entities.get(entity.id) : undefined;
  const currentGrid = grid ? grids.get(grid.id) : undefined;

  // Update progress periodically
  useEffect(() => {
    if (!isOpen) return;
    console.log("Current Entity:", currentEntity);
    const updateProgress = () => {
      if (currentEntity?.taskState.progress?.isActive) {
        const entityProgress = taskManager.getEntityProgress(currentEntity.id);
        setProgress(entityProgress);
      } else if (currentGrid?.taskState.progress?.isActive) {
        const gridProgress = taskManager.getGridProgress(currentGrid.id);
        setProgress(gridProgress);
      } else {
        setProgress(0);
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [isOpen, currentEntity, currentGrid, taskManager]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('modal-header')) {
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
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      onPositionChange({ 
        x: Math.max(0, Math.min(newX, window.innerWidth - size.width)), 
        y: Math.max(0, Math.min(newY, window.innerHeight - size.height)) 
      });
    } else if (isResizing.current) {
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;
      
      const newWidth = Math.max(400, Math.min(resizeStartSize.current.width + deltaX, window.innerWidth - position.x));
      const newHeight = Math.max(300, Math.min(resizeStartSize.current.height + deltaY, window.innerHeight - position.y));
      
      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { width: size.width, height: size.height };
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isOpen) return null;

  const title = currentEntity ? currentEntity.name : currentGrid?.name || 'Unknown';
  const isEntity = !!currentEntity;
  const hasActiveTask = currentEntity?.taskState.progress?.isActive || currentGrid?.taskState.progress?.isActive;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'BoldPixels'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: `${size.width}px`,
          height: `${size.height}px`,
          backgroundColor: '#2d2d30',
          border: '1px solid #3c3c3c',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            backgroundColor: '#007acc',
            color: 'white',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'move',
            userSelect: 'none'
          }}
          onMouseDown={handleMouseDown}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{title}</span>
            <span style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '18px'
            }}>
              {isEntity ? currentEntity.type : currentGrid?.type}
            </span>
            {hasActiveTask && (
              <span style={{
                backgroundColor: '#f5a623',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                BUSY
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* Progress Bar (if active task) */}
        {hasActiveTask && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#252526',
            borderBottom: '1px solid #3c3c3c'
          }}>
            <ProgressBar
              progress={progress}
              description={currentEntity?.taskState.progress?.description || currentGrid?.taskState.progress?.description}
              color="#f5a623"
              height={16}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: '#252526',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          fontFamily: 'BoldPixels'

        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              backgroundColor: activeTab === 'profile' ? '#007acc' : 'transparent',
              color: activeTab === 'profile' ? 'white' : '#cccccc',
              border: 'none',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: activeTab === 'profile' ? 'bold' : 'normal',
              fontFamily: 'BoldPixels'

            }}
          >
            Profile
          </button>
          {isEntity && (
            <button
              onClick={() => {
                setActiveTab('program');
                // Emit tutorial event for terminal opening
                EventBus.emit('tutorial-terminal-opened');
              }}
              style={{
                backgroundColor: activeTab === 'program' ? '#007acc' : 'transparent',
                color: activeTab === 'program' ? 'white' : '#cccccc',
                border: 'none',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '18px',
                fontFamily: 'BoldPixels',
                fontWeight: activeTab === 'program' ? 'bold' : 'normal'
              }}
            >
              Program
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'profile' && (
            <ProfileTab entity={currentEntity} grid={currentGrid} />
          )}
          {activeTab === 'program' && isEntity && (
            <ProgramTab entity={currentEntity!} />
          )}
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '20px',
            height: '20px',
            cursor: 'nwse-resize',
            backgroundColor: 'transparent',
            zIndex: 10
          }}
        >
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '12px',
            height: '12px',
            borderRight: '2px solid #007acc',
            borderBottom: '2px solid #007acc',
            pointerEvents: 'none'
          }} />
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab: React.FC<{ entity?: Entity; grid?: GridTile }> = ({ entity, grid }) => {
  if (entity) {
    console.log("Entity:", entity);
    return (
      <div style={{ padding: '20px', color: 'white', height: '100%', overflow: 'auto', fontFamily: 'BoldPixels' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#007acc', fontFamily: 'BoldPixels', fontSize: '26px' }}>Entity Information</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Basic Info */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#f5a623', fontSize: '24px' }}>Basic Info</h4>
            <div style={{ fontSize: '20px', lineHeight: '1.6' }}>
              <div><strong>Name:</strong> {entity.name}</div>
              <div><strong>Type:</strong> {entity.type}</div>
              <div><strong>Position:</strong> ({entity.position.x}, {entity.position.y})</div>
              <div><strong>Status:</strong> {entity.isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#f5a623', fontSize: '24px' }}>Stats</h4>
            <div style={{ fontSize: '20px', lineHeight: '1.6' }}>
              <div><strong>Energy:</strong> {entity.stats.energy}/{entity.stats.maxEnergy}</div>
              <div><strong>Walking Speed:</strong> {entity.stats.walkingSpeed}x</div>
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#444',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(entity.stats.energy / entity.stats.maxEnergy) * 100}%`,
                    height: '100%',
                    backgroundColor: entity.stats.energy > 50 ? '#7ed321' : entity.stats.energy > 20 ? '#f5a623' : '#e81123',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available */}

        {/* Inventory */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f5a623' }}>Inventory ({entity.inventory.items.length}/{entity.inventory.capacity})</h4>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            padding: '12px',
            minHeight: '100px'
          }}>
            {entity.inventory.items.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No items</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                {entity.inventory.items.map((item, index) => (
                  <div key={index} style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3c3c3c',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ color: '#888' }}>x{item.quantity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (grid) {
    return (
      <div style={{ padding: '20px', color: 'white', height: '100%', overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#007acc' }}>Grid Information</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Basic Info */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#f5a623' }}>Basic Info</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>Name:</strong> {grid.name}</div>
              <div><strong>Type:</strong> {grid.type}</div>
              <div><strong>Position:</strong> ({grid.position.x}, {grid.position.y})</div>
              <div><strong>Status:</strong> {grid.isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </div>

          {/* Properties */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#f5a623' }}>Properties</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {Object.entries(grid.properties).map(([key, value]) => (
                <div key={key}><strong>{key}:</strong> {String(value)}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f5a623' }}>Description</h4>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            padding: '12px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            {grid.description}
          </div>
        </div>

        {/* Available Functions */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f5a623' }}>Available Functions</h4>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            padding: '12px'
          }}>
            {grid.functions.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No functions available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {grid.functions.map((func, index) => (
                  <div key={index} style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3c3c3c',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#007acc' }}>{func.name}()</div>
                    <div style={{ fontSize: '12px', color: '#ccc', marginTop: '4px' }}>
                      {func.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current State */}
        {Object.keys(grid.state).length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#f5a623' }}>Current State</h4>
            <div style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #3c3c3c',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '14px'
            }}>
              {Object.entries(grid.state).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '4px' }}>
                  <strong>{key}:</strong> {String(value)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// Program Tab Component
const ProgramTab: React.FC<{ entity: Entity }> = ({ entity }) => {
  return (
    <div style={{ height: '100%' }}>
      <ProgrammingInterface entity={entity} />
    </div>
  );
};

export default StatusModal; 