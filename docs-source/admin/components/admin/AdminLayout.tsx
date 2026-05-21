import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { BarChart3, Key, Users, LogOut, Menu, UserCog } from 'lucide-react';

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
      <div className="admin-font min-h-screen flex flex-col items-center justify-center bg-admin-gradient text-white font-[family-name:var(--font-family-admin)]">
        <div className="w-[50px] h-[50px] border-4 border-[rgba(14,195,201,0.2)] border-t-admin-primary rounded-full animate-spin-slow mb-5"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const baseNavItems = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/sessions', label: 'Session Codes', icon: Key },
    { href: '/admin/students', label: 'Students', icon: Users },
  ];

  // Add Users management link for super admins
  const navItems = adminUser?.role === 'super_admin'
    ? [...baseNavItems, { href: '/admin/users', label: 'Admin Users', icon: UserCog }]
    : baseNavItems;

  const currentPath = router.pathname;

  return (
    <>
      <Head>
        <title>{title} - Binary Coven Admin</title>
      </Head>

      <div className="admin-font flex min-h-screen bg-[#f5f7fa] font-[family-name:var(--font-family-admin)]">
        {/* Sidebar Navigation */}
        <aside className={`w-[260px] bg-admin-gradient-vertical text-white flex flex-col fixed h-screen left-0 top-0 z-[1000] shadow-[2px_0_10px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'max-laptop:-translate-x-full'
        }`}>
          <div className="p-[28px_24px] border-b border-white/[0.08] text-center">
            <h1 className="text-[22px] font-bold text-admin-primary m-0 mb-1 uppercase tracking-[0.15em]">Binary Coven</h1>
            <p className="text-xs text-white/40 m-0 tracking-wide">Admin Panel</p>
          </div>

          <nav className="flex-1 py-3 px-3 overflow-y-auto">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center py-[11px] px-4 rounded-lg no-underline transition-all duration-200 ease-in-out mb-[2px] ${
                    isActive
                      ? 'bg-white/[0.12] text-admin-primary font-semibold'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
                  }`}
                >
                  <IconComponent className="mr-3 flex-shrink-0" size={18} />
                  <span className="text-[14px]">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/[0.08]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center py-[10px] px-4 bg-[rgba(255,82,82,0.08)] border border-[rgba(255,82,82,0.2)] rounded-lg text-[#ff8a8a] text-[14px] font-[family-name:var(--font-family-admin)] cursor-pointer transition-all duration-200 ease-in-out hover:bg-[rgba(255,82,82,0.15)] hover:border-[rgba(255,82,82,0.35)]"
            >
              <LogOut className="mr-3 flex-shrink-0" size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 ml-[260px] flex flex-col min-h-screen max-laptop:ml-0">
          {/* Top Header */}
          <header className="bg-white border-b border-[#e5e7eb] py-5 px-[30px] sticky top-0 z-[100] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <button
              className="hidden max-laptop:block bg-none border-none text-2xl text-admin-dark cursor-pointer p-[5px_10px] mr-[15px]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={24} />
            </button>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-admin-dark m-0">{title}</h2>

              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-admin-primary-gradient flex items-center justify-center text-white text-base font-bold shadow-[0_2px_8px_rgba(14,195,201,0.3)]">
                  {adminUser?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="flex flex-col leading-tight max-tablet:hidden">
                  <span className="text-sm font-bold text-admin-dark">{adminUser?.username || 'Admin'}</span>
                  <span className={`text-[11px] font-semibold ${
                    adminUser?.role === 'super_admin' ? 'text-amber-500' : 'text-admin-primary'
                  }`}>
                    {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-[30px] bg-[#f5f7fa]">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-[#e5e7eb] py-5 px-[30px] text-center">
            <p className="m-0 text-[#6b7280] text-[13px]">Binary Coven Learning Management System © {new Date().getFullYear()}</p>
          </footer>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="hidden max-laptop:block fixed top-0 left-0 right-0 bottom-0 bg-black/50 z-[999]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </div>
    </>
  );
}
