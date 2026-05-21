import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useGameStore } from '../stores/gameStore';
import { CodeWindow as CodeWindowType } from '../types/game';

interface CodeWindowProps {
  window: CodeWindowType;
  onClose: () => void;
  onFocus: () => void;
  isActive: boolean;
}

export const CodeWindow: React.FC<CodeWindowProps> = ({ 
  window, 
  onClose, 
  onFocus, 
  isActive 
}) => {
  const updateCodeWindow = useGameStore(state => state.updateCodeWindow);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      updateCodeWindow(window.id, { code: value });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('code-window-header')) {
      isDragging.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
      onFocus();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current && containerRef.current) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      updateCodeWindow(window.id, {
        position: { x: Math.max(0, newX), y: Math.max(0, newY) }
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

  const handleResize = (direction: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = window.size.width;
    const startHeight = window.size.height;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('right')) {
        newWidth = Math.max(300, startWidth + deltaX);
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(200, startHeight + deltaY);
      }

      updateCodeWindow(window.id, {
        size: { width: newWidth, height: newHeight }
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={`code-window ${isActive ? 'active' : ''}`}
      style={{
        position: 'absolute',
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        backgroundColor: '#1e1e1e',
        border: isActive ? '2px solid #007acc' : '1px solid #3c3c3c',
        borderRadius: '4px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isActive ? 1000 : 100,
        userSelect: 'none'
      }}
      onMouseDown={onFocus}
    >
      {/* Header */}
      <div
        className="code-window-header"
        style={{
          backgroundColor: '#2d2d30',
          color: 'white',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'move',
          borderBottom: '1px solid #3c3c3c'
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold' }}>{window.name}</span>
          {window.isMain && (
            <span style={{ 
              backgroundColor: '#007acc',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              MAIN
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#cccccc',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px'
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#e81123';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          value={window.code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            selectOnLineNumbers: true,
            automaticLayout: true,
            wordWrap: 'on',
            contextmenu: false
          }}
        />
      </div>

      {/* Resize handle */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '12px',
          height: '12px',
          backgroundColor: '#007acc',
          cursor: 'se-resize',
          borderRadius: '0 0 4px 0'
        }}
        onMouseDown={(e) => handleResize('bottom-right', e)}
      />
    </div>
  );
};

export default CodeWindow; 