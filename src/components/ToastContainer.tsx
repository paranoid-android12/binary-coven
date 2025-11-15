import React, { useState, useEffect, useCallback, useRef } from 'react';
import Toast, { ToastMessage } from './Toast';
import { EventBus } from '../game/EventBus';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextIdRef = useRef(0);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', duration = 3000) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  useEffect(() => {
    // Listen for quest-completed event
    const handleQuestCompleted = (data: any) => {
      if (data.quest) {
        addToast(`Quest Completed: ${data.quest.title}!`, 'success', 4000);
      }
    };

    EventBus.on('quest-completed', handleQuestCompleted);

    return () => {
      EventBus.removeListener('quest-completed', handleQuestCompleted);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <Toast key={toast.id} message={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
