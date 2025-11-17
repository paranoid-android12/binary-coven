import { useState, FormEvent, useRef, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { clearAllGameState, loadAndSyncGameState, logLocalStorageState } from '@/utils/localStorageManager';
import { validatePassword, checkPasswordRequirements } from '@/utils/passwordValidation';

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
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    sessionCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidationMessage, setCodeValidationMessage] = useState<string>('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Handle click outside modal to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (onClose) {
          onClose();
        }
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

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

    // Validate password requirements
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      setPasswordTouched(true);
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(2px)',
    }}>
      <div 
        ref={modalRef}
        style={{
          backgroundColor: '#d8a888',
          border: '4px solid #210714',
          borderRadius: '12px',
          padding: '40px 50px',
          maxWidth: '350px',
          width: '90%',
          boxShadow: '0 8px 0 #210714, 0 12px 20px rgba(0, 0, 0, 0.5)',
          position: 'relative',
        }}>
        {/* X Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            border: '2px solid #210714',
            borderRadius: '6px',
            color: '#210714',
            fontSize: '20px',
            fontFamily: 'BoldPixels',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '1',
            padding: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#210714';
            e.currentTarget.style.color = '#d8a888';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#210714';
          }}
        >
          ×
        </button>
        <h1 style={{
          fontFamily: 'BoldPixels',
          fontSize: '2.5em',
          color: '#210714',
          textAlign: 'center',
          margin: '0 0 10px 0',
          textShadow: '2px 2px 0px rgba(255, 255, 255, 0.3)',
        }}>Binary Coven</h1>
        <p style={{
          fontFamily: 'BoldPixels',
          fontSize: '1.2em',
          color: '#210714',
          textAlign: 'center',
          margin: '0 0 30px 0',
          opacity: 0.8,
        }}>Student Portal</p>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          width: '100%',
          maxWidth: '360px',
          margin: '0 auto',
        }}>
          {error && (
            <div style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              border: '2px solid #ff0000',
              color: '#ff0000',
              padding: '12px 15px',
              marginBottom: '10px',
              fontSize: '0.9em',
              borderRadius: '4px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="sessionCode" style={{
              fontFamily: 'BoldPixels',
              fontSize: '0.9em',
              color: '#210714',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Session Code
            </label>
            <input
              type="text"
              id="sessionCode"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1em',
                padding: '12px 15px',
                backgroundColor: '#e8c4a8',
                color: '#210714',
                border: '2px solid #210714',
                borderRadius: '6px',
                outline: 'none',
              }}
              value={formData.sessionCode}
              onChange={(e) => handleSessionCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter session code"
              disabled={isLoading}
              required
            />
            {isValidatingCode && (
              <p style={{ fontFamily: 'Arial', fontSize: '0.85em', margin: 0, padding: '5px 0' }}>Validating...</p>
            )}
            {codeValidationMessage && (
              <p style={{
                fontFamily: 'Arial',
                fontSize: '0.85em',
                margin: 0,
                padding: '5px 0',
                color: codeValidationMessage.startsWith('✓') ? '#0b7607' : '#b10000'
              }}>
                {codeValidationMessage}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="username" style={{
              fontFamily: 'BoldPixels',
              fontSize: '0.9em',
              color: '#210714',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Username
            </label>
            <input
              type="text"
              id="username"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1em',
                padding: '12px 15px',
                backgroundColor: '#e8c4a8',
                color: '#210714',
                border: '2px solid #210714',
                borderRadius: '6px',
                outline: 'none',
              }}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Choose a username"
              disabled={isLoading}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="password" style={{
              fontFamily: 'BoldPixels',
              fontSize: '0.9em',
              color: '#210714',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '1em',
                  padding: '12px 15px',
                  paddingRight: '45px',
                  backgroundColor: '#e8c4a8',
                  color: '#210714',
                  border: '2px solid #210714',
                  borderRadius: '6px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                placeholder="Enter password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#210714',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {/* Password requirements indicator */}
            {passwordTouched && formData.password && (() => {
              const requirements = checkPasswordRequirements(formData.password);
              return (
                <div style={{
                  fontSize: '0.75em',
                  padding: '8px 10px',
                  backgroundColor: 'rgba(33, 7, 20, 0.1)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{
                    color: requirements.hasUpperCase ? '#0b7607' : '#b10000',
                    fontFamily: 'Arial',
                  }}>
                    {requirements.hasUpperCase ? '✓' : '✗'} One uppercase letter
                  </div>
                  <div style={{
                    color: requirements.hasNumber ? '#0b7607' : '#b10000',
                    fontFamily: 'Arial',
                  }}>
                    {requirements.hasNumber ? '✓' : '✗'} One number
                  </div>
                  <div style={{
                    color: requirements.hasSpecialChar ? '#0b7607' : '#b10000',
                    fontFamily: 'Arial',
                  }}>
                    {requirements.hasSpecialChar ? '✓' : '✗'} One special character (!@#$%^&*...)
                  </div>
                </div>
              );
            })()}
          </div>

          <LoginButton
            text={isLoading ? 'Logging in...' : 'Enter Game'}
            disabled={isLoading}
          />
        </form>

        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '2px solid rgba(33, 7, 20, 0.2)',
        }}>
          <p style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '0.8em',
            color: '#210714',
            textAlign: 'center',
            margin: 0,
            lineHeight: '1.5',
            opacity: 0.7,
          }}>
            First time? Just enter your session code and create a username/password.
          </p>
        </div>
      </div>
    </div>
  );
}

// Login Button Component with CSS background
interface LoginButtonProps {
  text: string;
  disabled?: boolean;
}

const LoginButton: React.FC<LoginButtonProps> = ({ text, disabled = false }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="submit"
      disabled={disabled}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsPressed(false);
        setIsHovered(false);
      }}
      style={{
        width: '100%',
        padding: '15px 20px',
        backgroundColor: isHovered && !disabled ? '#210714' : 'transparent',
        color: isHovered && !disabled ? '#d8a888' : '#210714',
        border: '3px solid #210714',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '18px',
        fontFamily: 'BoldPixels',
        transition: 'all 0.15s',
        transform: isPressed && !disabled ? 'translateY(2px)' : 'translateY(0)',
        boxShadow: isPressed && !disabled ? 'none' : '0 4px 0 #210714',
        opacity: disabled ? 0.5 : 1,
        textTransform: 'uppercase',
        letterSpacing: '2px',
      }}
    >
      {text}
    </button>
  );
};
