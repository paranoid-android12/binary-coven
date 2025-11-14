import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '@/styles/StudentLogin.module.css';
import { useUser } from '@/contexts/UserContext';

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

export default function StudentLogin() {
  const router = useRouter();
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
        // Update user context
        login(data.student, 'student');
        // Redirect to game
        router.push('/');
      } else {
        setError(data.error || data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Student Login - Binary Coven</title>
      </Head>

      <div className={styles.container}>
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
    </>
  );
}
