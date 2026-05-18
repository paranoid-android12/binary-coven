import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      <div className="admin-font min-h-screen flex items-center justify-center bg-[#1e293b] p-5">
        <div className="bg-white border border-[#e7e5e0] rounded-xl py-10 px-[50px] w-full max-w-[420px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] relative">
          <div className="text-center mb-[35px]">
            <h1 className="text-[28px] font-bold text-[#1c1917] m-0 mb-[10px] uppercase tracking-[2px]">Binary Coven</h1>
            <p className="text-sm text-[#78716c] m-0 uppercase tracking-wider">Admin Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="mb-5">
            <div className="mb-[25px]">
              <label htmlFor="username" className="block text-[#78716c] text-[13px] mb-2 tracking-wider uppercase">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-[14px] px-4 bg-white border border-[#e7e5e0] rounded-md text-[#1c1917] text-[15px] transition-all duration-200 ease-in-out box-border outline-none focus:border-[#b45309] focus:shadow-[0_0_0_2px_rgba(180,83,9,0.15)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#a8a29e]"
                placeholder="Enter admin username"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="mb-[25px]">
              <label htmlFor="password" className="block text-[#78716c] text-[13px] mb-2 tracking-wider uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-[14px] px-4 pr-10 bg-white border border-[#e7e5e0] rounded-md text-[#1c1917] text-[15px] transition-all duration-200 ease-in-out box-border outline-none focus:border-[#b45309] focus:shadow-[0_0_0_2px_rgba(180,83,9,0.15)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#a8a29e]"
                  placeholder="Enter admin password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer p-1 flex items-center justify-center text-[#78716c] transition-colors duration-200 hover:text-[#1c1917]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-[#b91c1c] text-[#b91c1c] py-3 px-4 rounded-md mb-5 text-sm text-center font-[Arial,sans-serif]">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-[14px] px-6 bg-[#b45309] text-white border-none rounded-md text-base font-bold cursor-pointer transition-all duration-200 ease-in-out uppercase tracking-[2px] hover:bg-[#92400e] active:bg-[#78350f] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="text-center mt-[25px] pt-5 border-t border-[#e7e5e0]">
            <p className="text-[#a8a29e] text-[13px] m-0">LMS Administration Panel</p>
          </div>
        </div>
      </div>
    </>
  );
}
