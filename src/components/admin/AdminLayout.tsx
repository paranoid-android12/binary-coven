import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { BarChart3, Key, Users, LogOut, Menu, User, UserCog } from 'lucide-react';
import styles from '../../styles/admin/AdminLayout.module.css';

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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
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

      <div className={styles.container}>
        {/* Sidebar Navigation */}
        <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <h1 className={styles.logo}>Binary Coven</h1>
            <p className={styles.logoSubtitle}>Admin Panel</p>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${currentPath === item.href ? styles.navItemActive : ''}`}
                >
                  <IconComponent className={styles.navIcon} size={20} />
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <LogOut className={styles.navIcon} size={20} />
              <span className={styles.navLabel}>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {/* Top Header */}
          <header className={styles.header}>
            <button
              className={styles.mobileMenuButton}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={24} />
            </button>

            <div className={styles.headerContent}>
              <h2 className={styles.pageTitle}>{title}</h2>

              <div className={styles.headerActions}>
                <div className={styles.adminBadge}>
                  <User className={styles.adminIcon} size={18} />
                  <div className={styles.adminInfo}>
                    <span className={styles.adminUsername}>{adminUser?.username || 'Admin'}</span>
                    <span className={styles.adminRole}>
                      {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className={styles.content}>
            {children}
          </main>

          {/* Footer */}
          <footer className={styles.footer}>
            <p>Binary Coven Learning Management System © 2025</p>
          </footer>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </div>
    </>
  );
}
