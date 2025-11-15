import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: number;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = message.duration || 3000;

    // Start exit animation before removal
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    // Remove toast after animation
    const removeTimer = setTimeout(() => {
      onDismiss(message.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [message, onDismiss]);

  const getBackgroundColor = () => {
    switch (message.type) {
      case 'success':
        return '#00cc00';
      case 'error':
        return '#e81123';
      case 'warning':
        return '#f5a623';
      case 'info':
      default:
        return '#007acc';
    }
  };

  return (
    <div
      style={{
        backgroundColor: getBackgroundColor(),
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        marginBottom: '8px',
        fontSize: '14px',
        fontFamily: 'BoldPixels, monospace',
        minWidth: '250px',
        maxWidth: '400px',
        animation: isExiting
          ? 'toast-slide-out 0.3s ease-out forwards'
          : 'toast-slide-in 0.3s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        border: message.type === 'success' 
          ? '3px solid #00ff00' 
          : '2px solid rgba(255, 255, 255, 0.3)',
        boxShadow: message.type === 'success'
          ? '0 4px 16px rgba(0, 204, 0, 0.6), 0 0 20px rgba(0, 255, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <span style={{ fontSize: '18px' }}>
        {message.type === 'success' && '✓'}
        {message.type === 'error' && '✗'}
        {message.type === 'warning' && '⚠'}
        {message.type === 'info' && 'ⓘ'}
      </span>
      <span style={{ flex: 1 }}>{message.message}</span>
      <style>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(-400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toast-slide-out {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-400px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
