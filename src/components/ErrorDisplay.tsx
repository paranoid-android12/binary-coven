import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';

interface EducationalError {
  userFriendlyMessage: string;
  suggestion: string;
  concept: string;
  severity: 'error' | 'warning' | 'info';
  explanation: string;
}

interface ErrorDisplayProps {
  position?: { x: number; y: number };
  onClose?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ position = { x: 50, y: 150 }, onClose }) => {
  const [currentError, setCurrentError] = useState<EducationalError | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleCodeExecutionError = (data: any) => {
      if (data && data.data && data.data.suggestion) {
        setCurrentError(data.data);
        setIsVisible(true);

        // Auto-hide after 8 seconds
        setTimeout(() => {
          setIsVisible(false);
        }, 8000);
      }
    };

    EventBus.on('code-execution-failed', handleCodeExecutionError);

    return () => {
      EventBus.removeAllListeners('code-execution-failed');
    };
  }, []);

  if (!isVisible || !currentError) return null;

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'error': return '#e81123';
      case 'warning': return '#f5a623';
      case 'info': return '#007acc';
      default: return '#e81123';
    }
  };

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 4000,
        maxWidth: '400px',
        backgroundColor: '#2d2d30',
        border: `2px solid ${getSeverityColor(currentError.severity)}`,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden',
        fontFamily: 'BoldPixels'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: getSeverityColor(currentError.severity),
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span style={{ fontSize: '18px' }}>
          {getSeverityIcon(currentError.severity)}
        </span>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          Code Error
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 4px'
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Main Error Message */}
        <div style={{
          marginBottom: '12px',
          fontSize: '14px',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {currentError.userFriendlyMessage}
        </div>

        {/* Suggestion */}
        <div style={{
          marginBottom: '12px',
          padding: '8px 12px',
          backgroundColor: '#1e1e1e',
          borderRadius: '6px',
          borderLeft: `3px solid ${getSeverityColor(currentError.severity)}`,
          fontSize: '13px',
          color: '#cccccc',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: '#16c60c' }}>💡 Suggestion:</strong>
          <br />
          {currentError.suggestion}
        </div>

        {/* Concept Explanation */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#999',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: '#50e3c2' }}>📚 {currentError.concept}:</strong>
          <br />
          {currentError.explanation}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #3c3c3c',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center'
      }}>
        Click anywhere to dismiss • Check the Function Glossary for more help
      </div>
    </div>
  );
};

export default ErrorDisplay;
