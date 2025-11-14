import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Key, BookOpen, Zap } from 'lucide-react';
import styles from '../../styles/admin/Dashboard.module.css';

interface SessionCode {
  id: string;
  code: string;
  validityStart: string;
  validityEnd: string;
  isActive: boolean;
  createdAt: string;
  studentCount: number;
  activeStudents24h: number;
  status: 'active' | 'expired' | 'scheduled';
}

interface DashboardStats {
  totalStudents: number;
  activeSessions: number;
  totalSessions: number;
  recentActivity: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeSessions: 0,
    totalSessions: 0,
    recentActivity: 0,
  });
  const [recentSessions, setRecentSessions] = useState<SessionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/session-codes/list');
      const data = await response.json();

      if (data.success) {
        const sessions: SessionCode[] = data.sessionCodes;

        // Calculate stats
        const totalStudents = sessions.reduce((sum, s) => sum + s.studentCount, 0);
        const activeSessions = sessions.filter(s => s.status === 'active').length;
        const recentActivity = sessions.reduce((sum, s) => sum + s.activeStudents24h, 0);

        setStats({
          totalStudents,
          activeSessions,
          totalSessions: sessions.length,
          recentActivity,
        });

        // Get most recent 5 sessions
        const sortedSessions = [...sessions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentSessions(sortedSessions.slice(0, 5));
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return styles.statusActive;
      case 'expired':
        return styles.statusExpired;
      case 'scheduled':
        return styles.statusScheduled;
      default:
        return '';
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className={styles.dashboard}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <p>{error}</p>
            <button onClick={fetchDashboardData} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Users className={styles.statIcon} size={17} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>{stats.totalStudents}</h3>
                  <p className={styles.statLabel}>Total Students</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <Key className={styles.statIcon} size={17} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>{stats.activeSessions}</h3>
                  <p className={styles.statLabel}>Active Sessions</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <BookOpen className={styles.statIcon} size={17} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>{stats.totalSessions}</h3>
                  <p className={styles.statLabel}>Total Sessions</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <Zap className={styles.statIcon} size={17} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>{stats.recentActivity}</h3>
                  <p className={styles.statLabel}>Active (24h)</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Quick Actions</h2>
              <div className={styles.actionsGrid}>
                <Link href="/admin/sessions" className={styles.actionCard}>
                  <Key className={styles.actionIcon} size={32} />
                  <h3 className={styles.actionTitle}>Manage Sessions</h3>
                  <p className={styles.actionDescription}>
                    Create and manage session codes for students
                  </p>
                </Link>

                <Link href="/admin/students" className={styles.actionCard}>
                  <Users className={styles.actionIcon} size={32} />
                  <h3 className={styles.actionTitle}>View Students</h3>
                  <p className={styles.actionDescription}>
                    Track student progress and analytics
                  </p>
                </Link>
              </div>
            </div>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Recent Session Codes</h2>
                  <Link href="/admin/sessions" className={styles.viewAllLink}>
                    View All →
                  </Link>
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Students</th>
                        <th>Active (24h)</th>
                        <th>Valid Until</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((session) => (
                        <tr key={session.id}>
                          <td className={styles.codeCell}>
                            <code className={styles.sessionCode}>{session.code}</code>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(session.status)}`}>
                              {session.status}
                            </span>
                          </td>
                          <td className={styles.numberCell}>{session.studentCount}</td>
                          <td className={styles.numberCell}>{session.activeStudents24h}</td>
                          <td>{formatDate(session.validityEnd)}</td>
                          <td>{formatDate(session.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {stats.totalSessions === 0 && (
              <div className={styles.welcomeBox}>
                <h2>Welcome to Binary Coven Admin</h2>
                <p>Get started by creating your first session code!</p>
                <Link href="/admin/sessions" className={styles.primaryButton}>
                  Create Session Code
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
