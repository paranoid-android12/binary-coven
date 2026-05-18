import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Key, BookOpen, Zap, ArrowRight, UserCog } from 'lucide-react';
import { adminFetch } from '../../utils/adminFetch';

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
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    fetchDashboardData();
    // Fetch admin name for greeting
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user?.username) {
          setAdminName(data.user.username);
        }
      })
      .catch(() => {});
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await adminFetch('/api/session-codes/list');
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
        return 'bg-lime-50 text-[#4d7c0f]';
      case 'expired':
        return 'bg-red-50 text-[#b91c1c]';
      case 'scheduled':
        return 'bg-slate-100 text-[#475569]';
      default:
        return '';
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="max-w-[1400px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-admin-text-muted">
            <div className="w-[50px] h-[50px] border-4 border-admin-border border-t-admin-accent rounded-full animate-spin-slow mb-5"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-[30px] text-center text-[#b91c1c]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-[#b91c1c] text-white border-none py-[10px] px-5 rounded-lg text-sm cursor-pointer transition-colors duration-200 hover:bg-[#991b1b]"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Greeting */}
            <div className="mb-8">
              <h1 className="text-[28px] font-bold text-admin-text m-0 mb-1">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return 'Good morning';
                  if (hour < 18) return 'Good afternoon';
                  return 'Good evening';
                })()}, {adminName}
              </h1>
              <p className="text-sm text-admin-text-muted m-0">Here&apos;s your overview for today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-10 max-laptop:grid-cols-2 max-tablet:grid-cols-1">
              <div className="bg-admin-card border border-admin-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-admin-border-hover">
                <div className="p-[25px] flex items-center gap-5 max-tablet:p-5">
                  <Users className="text-admin-accent flex-shrink-0" size={22} />
                  <div className="flex-1">
                    <h3 className="text-[32px] font-bold text-admin-text m-0 mb-[2px] max-tablet:text-[26px]">{stats.totalStudents}</h3>
                    <p className="text-sm text-admin-text-muted m-0 font-medium">Total Students</p>
                  </div>
                </div>
              </div>

              <div className="bg-admin-card border border-admin-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-admin-border-hover">
                <div className="p-[25px] flex items-center gap-5 max-tablet:p-5">
                  <Key className="text-admin-accent flex-shrink-0" size={22} />
                  <div className="flex-1">
                    <h3 className="text-[32px] font-bold text-admin-text m-0 mb-[2px] max-tablet:text-[26px]">{stats.activeSessions}</h3>
                    <p className="text-sm text-admin-text-muted m-0 font-medium">Active Sessions</p>
                  </div>
                </div>
              </div>

              <div className="bg-admin-card border border-admin-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-admin-border-hover">
                <div className="p-[25px] flex items-center gap-5 max-tablet:p-5">
                  <BookOpen className="text-admin-accent flex-shrink-0" size={22} />
                  <div className="flex-1">
                    <h3 className="text-[32px] font-bold text-admin-text m-0 mb-[2px] max-tablet:text-[26px]">{stats.totalSessions}</h3>
                    <p className="text-sm text-admin-text-muted m-0 font-medium">Total Sessions</p>
                  </div>
                </div>
              </div>

              <div className="bg-admin-card border border-admin-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-admin-border-hover">
                <div className="p-[25px] flex items-center gap-5 max-tablet:p-5">
                  <Zap className="text-admin-accent flex-shrink-0" size={22} />
                  <div className="flex-1">
                    <h3 className="text-[32px] font-bold text-admin-text m-0 mb-[2px] max-tablet:text-[26px]">{stats.recentActivity}</h3>
                    <p className="text-sm text-admin-text-muted m-0 font-medium">Active (24h)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-10">
              <h2 className="text-[22px] font-bold text-admin-text m-0 mb-5">Quick Actions</h2>
              <div className="grid grid-cols-3 gap-5 max-laptop:grid-cols-2 max-tablet:grid-cols-1">
                <Link
                  href="/admin/sessions"
                  className="group bg-admin-card border border-admin-border rounded-xl p-6 no-underline transition-colors duration-200 block hover:border-admin-accent"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Key className="text-admin-accent" size={24} />
                    <ArrowRight className="text-admin-text-faint transition-all duration-200 group-hover:text-admin-accent group-hover:translate-x-1" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-admin-text m-0 mb-[6px]">Manage Sessions</h3>
                  <p className="text-sm text-admin-text-muted m-0 leading-[1.5]">
                    Create and manage session codes for students
                  </p>
                </Link>

                <Link
                  href="/admin/students"
                  className="group bg-admin-card border border-admin-border rounded-xl p-6 no-underline transition-colors duration-200 block hover:border-admin-accent"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Users className="text-admin-accent" size={24} />
                    <ArrowRight className="text-admin-text-faint transition-all duration-200 group-hover:text-admin-accent group-hover:translate-x-1" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-admin-text m-0 mb-[6px]">View Students</h3>
                  <p className="text-sm text-admin-text-muted m-0 leading-[1.5]">
                    Track student progress and analytics
                  </p>
                </Link>

                <Link
                  href="/admin/users"
                  className="group bg-admin-card border border-admin-border rounded-xl p-6 no-underline transition-colors duration-200 block hover:border-admin-accent"
                >
                  <div className="flex items-start justify-between mb-4">
                    <UserCog className="text-admin-accent" size={24} />
                    <ArrowRight className="text-admin-text-faint transition-all duration-200 group-hover:text-admin-accent group-hover:translate-x-1" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-admin-text m-0 mb-[6px]">Admin Users</h3>
                  <p className="text-sm text-admin-text-muted m-0 leading-[1.5]">
                    Manage admin accounts and permissions
                  </p>
                </Link>
              </div>
            </div>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5 max-tablet:flex-col max-tablet:items-start max-tablet:gap-[10px]">
                  <h2 className="text-[22px] font-bold text-admin-text m-0">Recent Session Codes</h2>
                  <Link
                    href="/admin/sessions"
                    className="text-admin-accent no-underline text-[15px] font-medium transition-colors duration-200 hover:text-admin-accent-hover"
                  >
                    View All →
                  </Link>
                </div>

                <div className="bg-admin-card border border-admin-border rounded-xl overflow-hidden max-tablet:overflow-x-auto">
                  <table className="w-full border-collapse max-tablet:min-w-[600px]">
                    <thead>
                      <tr className="bg-[#faf9f7] border-b-2 border-admin-border">
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-admin-text uppercase tracking-[0.5px]">Code</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-admin-text uppercase tracking-[0.5px]">Status</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-admin-text uppercase tracking-[0.5px]">Students</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-admin-text uppercase tracking-[0.5px]">Active (24h)</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-admin-text uppercase tracking-[0.5px]">Valid Until</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-admin-text uppercase tracking-[0.5px]">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((session) => (
                        <tr key={session.id} className="border-b border-admin-border last:border-b-0 transition-colors duration-200 ease-in-out hover:bg-[#faf9f7]">
                          <td className="p-[15px_20px] text-sm text-admin-text font-medium">
                            <code className="bg-stone-100 py-1 px-[10px] rounded-md font-mono text-[13px] text-admin-text font-bold">
                              {session.code}
                            </code>
                          </td>
                          <td className="p-[15px_20px] text-sm text-admin-text">
                            <span className={`inline-block py-1 px-3 rounded-xl text-xs font-bold uppercase tracking-[0.5px] ${getStatusBadgeClass(session.status)}`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="p-[15px_20px] text-sm text-admin-text font-semibold text-center">{session.studentCount}</td>
                          <td className="p-[15px_20px] text-sm text-admin-text font-semibold text-center">{session.activeStudents24h}</td>
                          <td className="p-[15px_20px] text-sm text-admin-text">{formatDate(session.validityEnd)}</td>
                          <td className="p-[15px_20px] text-sm text-admin-text">{formatDate(session.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {stats.totalSessions === 0 && (
              <div className="bg-admin-accent-light border border-admin-accent rounded-xl py-[50px] px-10 text-center mt-10 max-tablet:py-[30px] max-tablet:px-5">
                <h2 className="text-[28px] text-admin-accent-hover m-0 mb-[15px] max-tablet:text-[22px]">Welcome to Binary Coven Admin</h2>
                <p className="text-base text-admin-text m-0 mb-[25px] max-tablet:text-sm">Get started by creating your first session code!</p>
                <Link
                  href="/admin/sessions"
                  className="inline-block bg-admin-accent text-white py-[14px] px-7 rounded-lg no-underline text-[15px] font-bold transition-colors duration-200 hover:bg-admin-accent-hover"
                >
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
