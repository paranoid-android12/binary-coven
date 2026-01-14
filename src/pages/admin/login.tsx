import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Eye, EyeOff } from 'lucide-react';
import { validatePassword, checkPasswordRequirements } from '@/utils/passwordValidation';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.authenticated && data.userType === 'admin') {
          router.push('/admin');
        }
      } catch (err) {
        // Not authenticated, stay on login page
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    // Validate password requirements
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      setPasswordTouched(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin');
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Admin login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login - Binary Coven</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-admin-purple-gradient font-[family-name:var(--font-family-pixel)] p-5">
        <div className="bg-admin-tan border-4 border-admin-purple rounded-xl py-10 px-[50px] w-full max-w-[420px] shadow-admin-card relative">
          <div className="text-center mb-[35px]">
            <h1 className="text-[32px] font-bold text-admin-purple m-0 mb-[10px] uppercase tracking-[2px] text-shadow-admin">Binary Coven</h1>
            <p className="text-base text-admin-purple m-0 opacity-85 uppercase tracking-wider">Admin Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="mb-5">
            <div className="mb-[25px]">
              <label htmlFor="username" className="block text-admin-purple text-[13px] mb-2 tracking-wider uppercase">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-[14px] px-4 bg-admin-tan-light border-2 border-admin-purple rounded-md text-admin-purple text-[15px] font-[family-name:var(--font-family-pixel)] transition-all duration-200 ease-in-out box-border outline-none focus:border-admin-purple focus:shadow-[0_0_0_2px_rgba(33,7,20,0.2)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-admin-purple/60"
                placeholder="Enter admin username"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="mb-[25px]">
              <label htmlFor="password" className="block text-admin-purple text-[13px] mb-2 tracking-wider uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordTouched(true);
                  }}
                  onBlur={() => setPasswordTouched(true)}
                  className="w-full py-[14px] px-4 pr-10 bg-admin-tan-light border-2 border-admin-purple rounded-md text-admin-purple text-[15px] font-[family-name:var(--font-family-pixel)] transition-all duration-200 ease-in-out box-border outline-none focus:border-admin-purple focus:shadow-[0_0_0_2px_rgba(33,7,20,0.2)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-admin-purple/60"
                  placeholder="Enter admin password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer p-1 flex items-center justify-center text-[#666] transition-colors duration-200 hover:text-black"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordTouched && password && (() => {
                const requirements = checkPasswordRequirements(password);
                return (
                  <div className="text-[0.8em] p-2 bg-[#f5f5f5] rounded mt-2 flex flex-col gap-1">
                    <div className={requirements.hasUpperCase ? 'text-[#0b7607]' : 'text-[#b10000]'}>
                      {requirements.hasUpperCase ? '✓' : '✗'} One uppercase letter
                    </div>
                    <div className={requirements.hasNumber ? 'text-[#0b7607]' : 'text-[#b10000]'}>
                      {requirements.hasNumber ? '✓' : '✗'} One number
                    </div>
                    <div className={requirements.hasSpecialChar ? 'text-[#0b7607]' : 'text-[#b10000]'}>
                      {requirements.hasSpecialChar ? '✓' : '✗'} One special character (!@#$%^&*...)
                    </div>
                  </div>
                );
              })()}
            </div>

            {error && (
              <div className="bg-red-500/10 border-2 border-red-500 text-red-500 py-3 px-4 rounded-md mb-5 text-sm text-center font-[Arial,sans-serif]">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-[14px] px-6 bg-transparent text-admin-purple border-[3px] border-admin-purple rounded-md text-lg font-bold font-[family-name:var(--font-family-pixel)] cursor-pointer transition-all duration-200 ease-in-out uppercase tracking-[2px] shadow-admin-button hover:bg-admin-purple hover:text-admin-tan hover:translate-y-px hover:shadow-admin-button-hover active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-transparent disabled:hover:text-admin-purple disabled:hover:translate-y-0"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="text-center mt-[25px] pt-5 border-t-2 border-admin-purple/20">
            <p className="text-admin-purple/75 text-[13px] m-0">LMS Administration Panel</p>
          </div>
        </div>
      </div>
    </>
  );
}
