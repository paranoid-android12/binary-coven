import { useState, FormEvent } from 'react';
import { useUser } from '@/contexts/UserContext';
import styles from '@/styles/LoginModal.module.css';
import { clearAllGameState, loadAndSyncGameState, logLocalStorageState } from '@/utils/localStorageManager';

interface StudentLoginResponse {
  success: boolean;
  message: string;
  student?: {
    id: string;
    username: string;
    displayName: string;
    sessionCodeId: string;
  };
  error?: string;
}

interface LoginModalProps {
  isVisible: boolean;
  onLoginSuccess: () => void;
  onClose?: () => void;
}

export default function LoginModal({ isVisible, onLoginSuccess, onClose }: LoginModalProps) {
  const { login } = useUser();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    sessionCode: '',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidationMessage, setCodeValidationMessage] = useState<string>('');

  // Validate session code as user types
  const handleSessionCodeChange = async (code: string) => {
    setFormData({ ...formData, sessionCode: code });
    setCodeValidationMessage('');

    if (code.length >= 4) {
      setIsValidatingCode(true);
      try {
        const response = await fetch(`/api/session-codes/validate?code=${encodeURIComponent(code)}`);
        const data = await response.json();

        if (data.valid) {
          setCodeValidationMessage('✓ Valid session code');
        } else {
          setCodeValidationMessage('✗ ' + (data.message || 'Invalid session code'));
        }
      } catch (err) {
        setCodeValidationMessage('✗ Unable to validate code');
      } finally {
        setIsValidatingCode(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!formData.password) {
      setError('Please enter a password');
      return;
    }
    if (!formData.sessionCode.trim()) {
      setError('Please enter a session code');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[LoginModal] Logging in...');

      // STEP 1: Clear any existing localStorage state BEFORE login
      // This ensures fresh state for both new and existing accounts
      console.log('[LoginModal] Clearing existing localStorage state...');
      logLocalStorageState();
      clearAllGameState();
      console.log('[LoginModal] localStorage cleared');

      // STEP 2: Perform login
      const response = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
          sessionCode: formData.sessionCode.trim(),
        }),
      });

      const data: StudentLoginResponse = await response.json();

      if (data.success && data.student) {
        console.log('[LoginModal] Login successful:', data.student.username);

        // STEP 3: Load and sync game state from database to localStorage
        console.log('[LoginModal] Loading game state from database...');
        const syncSuccess = await loadAndSyncGameState(data.student.id);

        if (syncSuccess) {
          console.log('[LoginModal] Game state loaded and synced successfully');
        } else {
          console.warn('[LoginModal] Failed to load game state, but continuing with login');
        }

        // STEP 4: Update user context
        login(data.student, 'student');

        // Reset form
        setFormData({ username: '', password: '', sessionCode: '' });
        setError('');

        // Log final state
        console.log('[LoginModal] Login complete. Final localStorage state:');
        logLocalStorageState();

        // Notify parent component
        onLoginSuccess();
      } else {
        setError(data.error || data.message || 'Login failed');
        console.error('[LoginModal] Login failed:', data.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Binary Coven</h1>
        <p className={styles.subtitle}>Student Portal</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="sessionCode" className={styles.label}>
              Session Code
            </label>
            <input
              type="text"
              id="sessionCode"
              className={styles.input}
              value={formData.sessionCode}
              onChange={(e) => handleSessionCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter session code"
              disabled={isLoading}
              required
            />
            {isValidatingCode && (
              <p className={styles.validationMessage}>Validating...</p>
            )}
            {codeValidationMessage && (
              <p
                className={`${styles.validationMessage} ${
                  codeValidationMessage.startsWith('✓')
                    ? styles.validationSuccess
                    : styles.validationError
                }`}
              >
                {codeValidationMessage}
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              type="text"
              id="username"
              className={styles.input}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Choose a username"
              disabled={isLoading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              type="password"
              id="password"
              className={styles.input}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Enter Game'}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            First time? Just enter your session code and create a username/password.
          </p>
        </div>
      </div>
    </div>
  );
}
