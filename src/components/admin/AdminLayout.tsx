import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { BarChart3, Key, Users, LogOut, Menu, UserCog } from 'lucide-react';
import Image from 'next/image';

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: 'super_admin' | 'admin';
}

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Admin Dashboard' }: AdminLayoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!data.authenticated || data.userType !== 'admin') {
          router.push('/admin/login');
        } else {
          setAuthenticated(true);
          setAdminUser(data.user as AdminUser);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="admin-font min-h-screen flex flex-col items-center justify-center bg-admin-sidebar text-white">
        <div className="w-10 h-10 border-4 border-white/20 border-t-admin-accent rounded-full animate-spin-slow mb-4" />
        <p className="text-sm text-white/60">Loading...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/sessions', label: 'Session Codes', icon: Key },
    { href: '/admin/students', label: 'Students', icon: Users },
  ];

  const allNavItems = adminUser?.role === 'super_admin'
    ? [...navItems, { href: '/admin/users', label: 'Admin Users', icon: UserCog }]
    : navItems;

  const currentPath = router.pathname;

  return (
    <>
      <Head>
        <title>{title} — Binary Coven Admin</title>
      </Head>

      <div className="admin-font flex min-h-screen bg-admin-bg">
        {/* Sidebar */}
        <aside className={`w-[220px] bg-admin-sidebar text-white flex flex-col fixed h-screen left-0 top-0 z-[1000] transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'max-laptop:-translate-x-full'
        }`}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.07]">
            <Image src="/assets/wheat.png" alt="wheat" width={28} height={28} style={{ imageRendering: 'pixelated' }} className="flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white leading-none">Binary Coven</p>
              <p className="text-[10px] text-white/40 leading-none mt-0.5">Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-2 px-2 overflow-y-auto">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 py-2 px-3 rounded-md text-[13px] no-underline transition-colors duration-150 mb-0.5 ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'
                  }`}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-2 py-3 border-t border-white/[0.07]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 py-2 px-3 rounded-md text-[13px] text-white/50 cursor-pointer transition-colors duration-150 bg-transparent border-none hover:bg-white/[0.06] hover:text-white/80"
            >
              <LogOut size={15} className="flex-shrink-0" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 ml-[220px] flex flex-col min-h-screen max-laptop:ml-0">
          {/* Header */}
          <header className="bg-admin-card border-b border-admin-border px-6 py-3 sticky top-0 z-[100] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="hidden max-laptop:flex items-center justify-center border-none bg-transparent text-admin-text cursor-pointer p-1"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu size={20} />
              </button>
              <h2 className="text-base font-bold text-admin-text m-0">{title}</h2>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-admin-accent flex items-center justify-center text-white text-xs font-bold">
                {adminUser?.username?.charAt(0).toUpperCase() ?? 'A'}
              </div>
              <div className="flex flex-col leading-tight max-tablet:hidden">
                <span className="text-xs font-semibold text-admin-text">{adminUser?.username ?? 'Admin'}</span>
                <span className={`text-[10px] ${adminUser?.role === 'super_admin' ? 'text-admin-accent' : 'text-admin-text-faint'}`}>
                  {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 bg-admin-bg">
            {children}
          </main>

          <footer className="bg-admin-card border-t border-admin-border py-3 px-6 text-center">
            <p className="m-0 text-[11px] text-admin-text-faint">Binary Coven LMS © {new Date().getFullYear()}</p>
          </footer>
        </div>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="hidden max-laptop:block fixed inset-0 bg-black/50 z-[999]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </div>
    </>
  );
}
