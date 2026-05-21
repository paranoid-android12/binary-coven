import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  description?: string;
  color?: string;
  height?: number;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  description,
  color = '#007acc',
  height = 20,
  showPercentage = true
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div style={{ width: '100%', marginBottom: '8px' }}>
      {description && (
        <div style={{
          fontSize: '12px',
          color: '#cccccc',
          marginBottom: '4px',
          fontWeight: 'bold'
        }}>
          {description}
        </div>
      )}
      <div style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: '#444444',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #666666',
        position: 'relative'
      }}>
        <div style={{
          width: `${clampedProgress}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.3s ease',
          borderRadius: '3px'
        }} />
        {showPercentage && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '11px',
            fontWeight: 'bold',
            color: clampedProgress > 50 ? 'white' : '#cccccc',
            textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
          }}>
            {Math.round(clampedProgress)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar; 