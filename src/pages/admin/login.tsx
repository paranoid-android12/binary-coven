import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { Eye, EyeOff, User, Lock, LogIn } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

export default function AdminLogin() {
  const router = useRouter();
  const { login } = useUser();
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
        // Populate the global UserContext so pages that gate on useUser()
        // (e.g. /admin/users) don't bounce back due to a stale null session.
        if (data.admin) {
          login(data.admin, 'admin');
        }
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
        <title>Admin Login — Binary Coven</title>
      </Head>

      <div className="admin-font relative min-h-screen flex items-center justify-center p-5 overflow-hidden"
        style={{ background: 'radial-gradient(circle at 20% 20%, #27364d 0%, #1e293b 40%, #0f172a 100%)' }}
      >
        {/* Ambient floating sprites */}
        <Image
          src="/assets/wheat.png" alt="" width={48} height={48} aria-hidden
          style={{ imageRendering: 'pixelated', ['--float-rot' as string]: '-12deg' }}
          className="pointer-events-none select-none absolute top-[12%] left-[14%] opacity-20 animate-[float_7s_ease-in-out_infinite]"
        />
        <Image
          src="/assets/star.png" alt="" width={40} height={40} aria-hidden
          style={{ imageRendering: 'pixelated', ['--float-rot' as string]: '8deg' }}
          className="pointer-events-none select-none absolute top-[22%] right-[16%] opacity-25 animate-[float_5.5s_ease-in-out_infinite] [animation-delay:0.8s]"
        />
        <Image
          src="/assets/wheat.png" alt="" width={64} height={64} aria-hidden
          style={{ imageRendering: 'pixelated', ['--float-rot' as string]: '10deg' }}
          className="pointer-events-none select-none absolute bottom-[14%] right-[12%] opacity-15 animate-[float_8s_ease-in-out_infinite] [animation-delay:1.5s]"
        />
        <Image
          src="/assets/star.png" alt="" width={28} height={28} aria-hidden
          style={{ imageRendering: 'pixelated', ['--float-rot' as string]: '-6deg' }}
          className="pointer-events-none select-none absolute bottom-[20%] left-[18%] opacity-20 animate-[float_6.5s_ease-in-out_infinite] [animation-delay:0.4s]"
        />

        {/* Login card */}
        <div className="relative w-full max-w-[440px] animate-[loginCardIn_0.4s_ease-out]">
          {/* Wooden hero logo, overlapping the card top */}
          <div className="flex justify-center mb-[-20px] relative z-10">
            <Image
              src="/assets/QUBIT.png"
              alt="Binary Coven"
              width={300}
              height={150}
              priority
              className="w-[220px] h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] animate-[float_6s_ease-in-out_infinite]"
            />
          </div>

          <div className="bg-white border border-[#e7e5e0] rounded-2xl pt-10 pb-6 px-7 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-admin-accent-light border border-[#dbeafe]">
                <Lock size={13} className="text-admin-accent" />
                <span className="text-[11px] font-bold text-admin-accent uppercase tracking-[2px]">Admin Dashboard</span>
              </div>
              <p className="text-[13px] text-[#78716c] mt-2 mb-0">Sign in to manage sessions, students &amp; admins.</p>
            </div>

            <form onSubmit={handleSubmit} className="mb-1">
              <div className="mb-4">
                <label htmlFor="username" className="block text-[#78716c] text-[12px] mb-2 tracking-wider uppercase font-semibold">
                  Username
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] pointer-events-none" />
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full py-2.5 pl-11 pr-4 bg-[#f8f7f4] border border-[#e7e5e0] rounded-lg text-[#1c1917] text-[15px] transition-all duration-200 ease-in-out box-border outline-none focus:bg-white focus:border-admin-accent focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#a8a29e]"
                    placeholder="Enter admin username"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor="password" className="block text-[#78716c] text-[12px] mb-2 tracking-wider uppercase font-semibold">
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e] pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 pl-11 pr-11 bg-[#f8f7f4] border border-[#e7e5e0] rounded-lg text-[#1c1917] text-[15px] transition-all duration-200 ease-in-out box-border outline-none focus:bg-white focus:border-admin-accent focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#a8a29e]"
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
                <div className="bg-red-50 border border-[#b91c1c] text-[#b91c1c] py-3 px-4 rounded-lg mb-5 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 py-3 px-6 bg-admin-accent text-white border-none rounded-lg text-[15px] font-bold cursor-pointer transition-all duration-200 ease-in-out uppercase tracking-[2px] shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:bg-admin-accent-hover hover:shadow-[0_6px_18px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Login
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-[#e7e5e0]">
              <Image src="/assets/wheat.png" alt="" width={16} height={16} aria-hidden style={{ imageRendering: 'pixelated' }} className="opacity-60" />
              <p className="text-[#a8a29e] text-[12px] m-0">Binary Coven · LMS Administration Panel</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
