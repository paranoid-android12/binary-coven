import { useState, FormEvent, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Eye, EyeOff } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { validatePassword, checkPasswordRequirements } from '@/utils/passwordValidation';

interface StudentLoginResponse {
  success: boolean;
  message: string;
  needsOtp?: boolean;
  student?: {
    id: string;
    username: string;
    displayName: string;
    sessionCodeId: string;
  };
  error?: string;
}

type DialogStep = 'login' | 'otp' | 'forgot' | 'forgot-otp' | 'forgot-newpass';

export default function StudentLogin() {
  const router = useRouter();
  const { login } = useUser();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    sessionCode: '',
    email: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidationMessage, setCodeValidationMessage] = useState<string>('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  // OTP state
  const [dialogStep, setDialogStep] = useState<DialogStep>('login');
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpMessage, setOtpMessage] = useState('');

  // Forgot password state
  const [resetMaskedEmail, setResetMaskedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);

  // Countdown timer effect — each tick is a separate setTimeout managed by React
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timeout = setTimeout(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [resendTimer]);

  // Send OTP email
  const handleSendOtp = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setOtpMessage(`Verification code sent to ${formData.email.trim()}`);
        setResendTimer(60);
      } else {
        setError(data.message || 'Failed to send verification code');
        if (data.cooldownRemaining) {
          setResendTimer(data.cooldownRemaining);
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData.email]);

  // Verify OTP and register
  const handleVerifyOtp = useCallback(async () => {
    setError('');
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp-and-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: otpCode,
          username: formData.username.trim(),
          password: formData.password,
          sessionCode: formData.sessionCode.trim(),
        }),
      });
      const data: StudentLoginResponse = await response.json();
      if (data.success && data.student) {
        login(data.student, 'student');
        router.push('/');
      } else {
        setError(data.error || data.message || 'Verification failed');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [otpCode, formData, login, router]);

  // Send password reset code
  const handleSendResetCode = useCallback(async () => {
    setError('');
    if (!formData.username.trim() || !formData.sessionCode.trim()) {
      setError('Please enter your username and session code');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          sessionCode: formData.sessionCode.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setResetMaskedEmail(data.maskedEmail || '');
        setOtpMessage(`Reset code sent to ${data.maskedEmail}`);
        setResendTimer(60);
        setDialogStep('forgot-otp');
      } else {
        setError(data.message || 'Failed to send reset code');
        if (data.cooldownRemaining) {
          setResendTimer(data.cooldownRemaining);
          setResetMaskedEmail(data.maskedEmail || '');
          setDialogStep('forgot-otp');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData.username, formData.sessionCode]);

  // Resend reset code
  const handleResendResetCode = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          sessionCode: formData.sessionCode.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setOtpMessage(`Reset code sent to ${data.maskedEmail}`);
        setResendTimer(60);
      } else {
        setError(data.message || 'Failed to resend code');
        if (data.cooldownRemaining) {
          setResendTimer(data.cooldownRemaining);
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData.username, formData.sessionCode]);

  // Verify reset code — move to new password step
  const handleVerifyResetCode = useCallback(async () => {
    setError('');
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          sessionCode: formData.sessionCode.trim(),
          otp: otpCode,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setDialogStep('forgot-newpass');
        setError('');
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [otpCode, formData.username, formData.sessionCode]);

  // Submit new password
  const handleResetPassword = useCallback(async () => {
    setError('');
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError(validation.errors[0] || 'Password does not meet requirements');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          sessionCode: formData.sessionCode.trim(),
          otp: otpCode,
          newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setDialogStep('login');
        setError('');
        setOtpCode('');
        setNewPassword('');
        setNewPasswordTouched(false);
        setOtpMessage('Password reset successfully! You can now log in.');
        setTimeout(() => setOtpMessage(''), 5000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData.username, formData.sessionCode, otpCode, newPassword]);

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

    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
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

      if (data.needsOtp) {
        // New account — transition to OTP step and auto-send OTP
        setDialogStep('otp');
        setError('');
        setOtpMessage('');
        setIsLoading(false);
        setTimeout(() => handleSendOtp(), 100);
        return;
      } else if (data.success && data.student) {
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

      <div style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        padding: '20px',
      }}>
        <div style={{
          backgroundColor: '#d8a888',
          border: '4px solid #210714',
          borderRadius: '12px',
          padding: '40px 50px',
          maxWidth: '450px',
          width: '100%',
          boxShadow: '0 8px 0 #210714, 0 12px 20px rgba(0, 0, 0, 0.5)',
        }}>
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

          {dialogStep === 'login' ? (
            <>
              <form onSubmit={handleSubmit} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '100%',
                maxWidth: '360px',
              }}>
                {otpMessage && dialogStep === 'login' && (
                  <div style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    backgroundColor: 'rgba(11, 118, 7, 0.1)',
                    border: '2px solid #0b7607',
                    color: '#0b7607',
                    padding: '12px 15px',
                    fontSize: '0.9em',
                    borderRadius: '4px',
                  }}>
                    {otpMessage}
                  </div>
                )}
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
                    fontFamily: 'Arial, Helvetica, sans-serif',
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
                      backgroundColor: '#ffffff',
                      color: '#210714',
                      border: '2px solid #210714',
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
                      color: codeValidationMessage.startsWith('✓') ? '#16c60c' : '#ff0000'
                    }}>
                      {codeValidationMessage}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="email" style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '0.9em',
                    color: '#210714',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '1em',
                      padding: '12px 15px',
                      backgroundColor: '#ffffff',
                      color: '#210714',
                      border: '2px solid #210714',
                      outline: 'none',
                    }}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="username" style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
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
                      backgroundColor: '#ffffff',
                      color: '#210714',
                      border: '2px solid #210714',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="password" style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '0.9em',
                      color: '#210714',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setDialogStep('forgot');
                        setError('');
                        setOtpCode('');
                        setOtpMessage('');
                        setNewPassword('');
                        setNewPasswordTouched(false);
                      }}
                      style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontSize: '0.75em',
                        color: '#210714',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        opacity: 0.7,
                        textDecoration: 'underline',
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontSize: '1em',
                        padding: '12px 15px',
                        paddingRight: '45px',
                        backgroundColor: '#ffffff',
                        color: '#210714',
                        border: '2px solid #210714',
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

                <StudentLoginButton
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
            </>
          ) : dialogStep === 'otp' ? (
            /* OTP Verification Step */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '100%',
              maxWidth: '360px',
            }}>
              <p style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '0.9em',
                color: '#210714',
                textAlign: 'center',
                margin: 0,
                lineHeight: '1.5',
                userSelect: 'none',
                cursor: 'default',
              }}>
                A verification code has been sent to <strong>{formData.email}</strong>
              </p>

              {error && (
                <div style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  border: '2px solid #ff0000',
                  color: '#ff0000',
                  padding: '12px 15px',
                  fontSize: '0.9em',
                  borderRadius: '4px',
                }}>
                  {error}
                </div>
              )}

              {otpMessage && (
                <div style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  backgroundColor: 'rgba(11, 118, 7, 0.1)',
                  border: '2px solid #0b7607',
                  color: '#0b7607',
                  padding: '12px 15px',
                  fontSize: '0.9em',
                  borderRadius: '4px',
                }}>
                  {otpMessage}
                </div>
              )}

              {/* OTP input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="otpCode" style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.9em',
                  color: '#210714',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  id="otpCode"
                  maxLength={6}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '1.5em',
                    padding: '12px 15px',
                    backgroundColor: '#ffffff',
                    color: '#210714',
                    border: '2px solid #210714',
                    outline: 'none',
                    textAlign: 'center',
                    letterSpacing: '8px',
                  }}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={isLoading}
                />
                <p style={{
                  fontFamily: 'Arial',
                  fontSize: '0.75em',
                  color: '#210714',
                  textAlign: 'center',
                  margin: 0,
                  opacity: 0.6,
                }}>
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              {/* Resend button */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading || resendTimer > 0}
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.85em',
                  color: '#210714',
                  background: 'none',
                  border: 'none',
                  cursor: (isLoading || resendTimer > 0) ? 'not-allowed' : 'pointer',
                  padding: 0,
                  textAlign: 'center',
                  opacity: (isLoading || resendTimer > 0) ? 0.4 : 0.7,
                  textDecoration: 'underline',
                }}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
              </button>

              <StudentLoginButton
                text={isLoading ? 'Verifying...' : 'Verify & Create Account'}
                disabled={isLoading || otpCode.length !== 6}
                onClick={handleVerifyOtp}
              />

              <div style={{
                marginTop: '10px',
                paddingTop: '20px',
                borderTop: '2px solid rgba(33, 7, 20, 0.2)',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setDialogStep('login');
                    setError('');
                    setOtpCode('');
                    setOtpMessage('');
                  }}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '0.85em',
                    color: '#210714',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'center',
                    opacity: 0.7,
                    textDecoration: 'underline',
                    width: '100%',
                  }}
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : dialogStep === 'forgot' ? (
            /* Forgot Password — Enter username + session code */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '100%',
              maxWidth: '360px',
            }}>
              <p style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1em',
                fontWeight: 'bold',
                color: '#210714',
                textAlign: 'center',
                margin: 0,
              }}>
                Reset Password
              </p>
              <p style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '0.85em',
                color: '#210714',
                textAlign: 'center',
                margin: 0,
                opacity: 0.7,
                lineHeight: '1.5',
              }}>
                Enter your username and session code. We&apos;ll send a reset code to your registered email.
              </p>

              {error && (
                <div style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  border: '2px solid #ff0000',
                  color: '#ff0000',
                  padding: '12px 15px',
                  fontSize: '0.9em',
                  borderRadius: '4px',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.9em',
                  color: '#210714',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>Session Code</label>
                <input
                  type="text"
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '1em',
                    padding: '12px 15px',
                    backgroundColor: '#ffffff',
                    color: '#210714',
                    border: '2px solid #210714',
                    outline: 'none',
                  }}
                  value={formData.sessionCode}
                  onChange={(e) => setFormData({ ...formData, sessionCode: e.target.value })}
                  placeholder="Enter your session code"
                  disabled={isLoading}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.9em',
                  color: '#210714',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>Username</label>
                <input
                  type="text"
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '1em',
                    padding: '12px 15px',
                    backgroundColor: '#ffffff',
                    color: '#210714',
                    border: '2px solid #210714',
                    outline: 'none',
                  }}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>

              <StudentLoginButton
                text={isLoading ? 'Sending...' : 'Send Reset Code'}
                disabled={isLoading || !formData.username.trim() || !formData.sessionCode.trim()}
                onClick={handleSendResetCode}
              />

              <div style={{
                marginTop: '10px',
                paddingTop: '20px',
                borderTop: '2px solid rgba(33, 7, 20, 0.2)',
              }}>
                <button
                  type="button"
                  onClick={() => { setDialogStep('login'); setError(''); }}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '0.85em',
                    color: '#210714',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'center',
                    opacity: 0.7,
                    textDecoration: 'underline',
                    width: '100%',
                  }}
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : dialogStep === 'forgot-otp' ? (
            /* Forgot Password — Enter OTP */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '100%',
              maxWidth: '360px',
            }}>
              <p style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1em',
                fontWeight: 'bold',
                color: '#210714',
                textAlign: 'center',
                margin: 0,
              }}>
                Reset Password
              </p>
              <p style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '0.9em',
                color: '#210714',
                textAlign: 'center',
                margin: 0,
                lineHeight: '1.5',
                userSelect: 'none',
                cursor: 'default',
              }}>
                A reset code has been sent to <strong>{resetMaskedEmail}</strong>
              </p>

              {error && (
                <div style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  border: '2px solid #ff0000',
                  color: '#ff0000',
                  padding: '12px 15px',
                  fontSize: '0.9em',
                  borderRadius: '4px',
                }}>
                  {error}
                </div>
              )}

              {otpMessage && (
                <div style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  backgroundColor: 'rgba(11, 118, 7, 0.1)',
                  border: '2px solid #0b7607',
                  color: '#0b7607',
                  padding: '12px 15px',
                  fontSize: '0.9em',
                  borderRadius: '4px',
                }}>
                  {otpMessage}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.9em',
                  color: '#210714',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '1.5em',
                    padding: '12px 15px',
                    backgroundColor: '#ffffff',
                    color: '#210714',
                    border: '2px solid #210714',
                    outline: 'none',
                    textAlign: 'center',
                    letterSpacing: '8px',
                  }}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={isLoading}
                />
                <p style={{
                  fontFamily: 'Arial',
                  fontSize: '0.75em',
                  color: '#210714',
                  textAlign: 'center',
                  margin: 0,
                  opacity: 0.6,
                }}>
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <button
                type="button"
                onClick={handleResendResetCode}
                disabled={isLoading || resendTimer > 0}
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.85em',
                  color: '#210714',
                  background: 'none',
                  border: 'none',
                  cursor: (isLoading || resendTimer > 0) ? 'not-allowed' : 'pointer',
                  padding: 0,
                  textAlign: 'center',
                  opacity: (isLoading || resendTimer > 0) ? 0.4 : 0.7,
                  textDecoration: 'underline',
                }}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
              </button>

              <StudentLoginButton
                text="Continue"
                disabled={isLoading || otpCode.length !== 6}
                onClick={handleVerifyResetCode}
              />

              <div style={{
                marginTop: '10px',
                paddingTop: '20px',
                borderTop: '2px solid rgba(33, 7, 20, 0.2)',
              }}>
                <button
                  type="button"
                  onClick={() => { setDialogStep('login'); setError(''); setOtpCode(''); setOtpMessage(''); }}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '0.85em',
                    color: '#210714',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'center',
                    opacity: 0.7,
                    textDecoration: 'underline',
                    width: '100%',
                  }}
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : dialogStep === 'forgot-newpass' ? (
            /* Forgot Password — New Password */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '100%',
              maxWidth: '360px',
            }}>
              <p style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '1em',
                fontWeight: 'bold',
                color: '#210714',
                textAlign: 'center',
                margin: 0,
              }}>
                New Password
              </p>
              <p style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '0.85em',
                color: '#210714',
                textAlign: 'center',
                margin: 0,
                opacity: 0.7,
                lineHeight: '1.5',
              }}>
                Choose a new password for your account.
              </p>

              {error && (
                <div style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  border: '2px solid #ff0000',
                  color: '#ff0000',
                  padding: '12px 15px',
                  fontSize: '0.9em',
                  borderRadius: '4px',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '0.9em',
                  color: '#210714',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '1em',
                      padding: '12px 45px 12px 15px',
                      backgroundColor: '#ffffff',
                      color: '#210714',
                      border: '2px solid #210714',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (!newPasswordTouched) setNewPasswordTouched(true);
                    }}
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#210714',
                      opacity: 0.6,
                    }}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {newPasswordTouched && newPassword && (() => {
                  const requirements = checkPasswordRequirements(newPassword);
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
                      <div style={{ color: requirements.hasUpperCase ? '#0b7607' : '#b10000', fontFamily: 'Arial' }}>
                        {requirements.hasUpperCase ? '✓' : '✗'} One uppercase letter
                      </div>
                      <div style={{ color: requirements.hasNumber ? '#0b7607' : '#b10000', fontFamily: 'Arial' }}>
                        {requirements.hasNumber ? '✓' : '✗'} One number
                      </div>
                      <div style={{ color: requirements.hasSpecialChar ? '#0b7607' : '#b10000', fontFamily: 'Arial' }}>
                        {requirements.hasSpecialChar ? '✓' : '✗'} One special character (!@#$%^&*...)
                      </div>
                    </div>
                  );
                })()}
              </div>

              <StudentLoginButton
                text={isLoading ? 'Resetting...' : 'Reset Password'}
                disabled={isLoading || !newPassword}
                onClick={handleResetPassword}
              />

              <div style={{
                marginTop: '10px',
                paddingTop: '20px',
                borderTop: '2px solid rgba(33, 7, 20, 0.2)',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setDialogStep('login');
                    setError('');
                    setOtpCode('');
                    setOtpMessage('');
                    setNewPassword('');
                    setNewPasswordTouched(false);
                  }}
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '0.85em',
                    color: '#210714',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'center',
                    opacity: 0.7,
                    textDecoration: 'underline',
                    width: '100%',
                  }}
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// Student Login Button Component with CSS background
interface StudentLoginButtonProps {
  text: string;
  disabled?: boolean;
  onClick?: () => void;
}

const StudentLoginButton: React.FC<StudentLoginButtonProps> = ({ text, disabled = false, onClick }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type={onClick ? 'button' : 'submit'}
      disabled={disabled}
      onClick={onClick}
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
