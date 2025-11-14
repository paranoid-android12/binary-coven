import { useState } from 'react';
import styles from '../../styles/admin/CreateSessionModal.module.css';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSessionModal({ isOpen, onClose, onSuccess }: CreateSessionModalProps) {
  const [customCode, setCustomCode] = useState('');
  const [durationType, setDurationType] = useState<'hours' | 'days'>('days');
  const [durationValue, setDurationValue] = useState('7');
  const [maxStudents, setMaxStudents] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = {};

      // Add custom code if provided
      if (customCode.trim()) {
        payload.code = customCode.trim().toUpperCase();
      }

      // Add duration
      if (durationType === 'hours') {
        payload.validityHours = parseInt(durationValue);
      } else {
        payload.validityDays = parseInt(durationValue);
      }

      // Add max students if provided
      if (maxStudents.trim()) {
        payload.maxStudents = parseInt(maxStudents);
      }

      const response = await fetch('/api/session-codes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setCustomCode('');
        setDurationValue('7');
        setMaxStudents('');
        onSuccess();
        onClose();
      } else {
        setError(data.message || 'Failed to create session code');
      }
    } catch (err) {
      console.error('Error creating session code:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Session Code</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="customCode" className={styles.label}>
              Custom Code (Optional)
            </label>
            <input
              type="text"
              id="customCode"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              className={styles.input}
              placeholder="Leave empty to auto-generate"
              disabled={loading}
              maxLength={20}
            />
            <p className={styles.helpText}>
              If empty, a random code will be generated
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Validity Duration</label>
            <div className={styles.durationRow}>
              <input
                type="number"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className={styles.durationInput}
                min="1"
                max={durationType === 'hours' ? '720' : '30'}
                required
                disabled={loading}
              />
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value as 'hours' | 'days')}
                className={styles.durationSelect}
                disabled={loading}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <p className={styles.helpText}>
              How long the session code will be valid
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="maxStudents" className={styles.label}>
              Max Students (Optional)
            </label>
            <input
              type="number"
              id="maxStudents"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              className={styles.input}
              placeholder="Unlimited"
              min="1"
              disabled={loading}
            />
            <p className={styles.helpText}>
              Leave empty for unlimited students
            </p>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.footer}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Session Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
