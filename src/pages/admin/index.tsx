import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Key, BookOpen, Zap } from 'lucide-react';

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
        return 'bg-[#d1fae5] text-[#047857]';
      case 'expired':
        return 'bg-[#fee2e2] text-[#dc2626]';
      case 'scheduled':
        return 'bg-[#dbeafe] text-[#1d4ed8]';
      default:
        return '';
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="max-w-[1400px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-[#6b7280]">
            <div className="w-[50px] h-[50px] border-4 border-[#e5e7eb] border-t-admin-primary rounded-full animate-spin-slow mb-5"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-[30px] text-center text-[#dc2626]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-[#dc2626] text-white border-none py-[10px] px-5 rounded-lg text-sm font-[family-name:var(--font-family-pixel)] cursor-pointer transition-colors duration-300 ease-in-out hover:bg-[#b91c1c]"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-10 max-laptop:grid-cols-2 max-tablet:grid-cols-1">
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-[25px] flex items-center gap-5 transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-tablet:p-5">
                <Users className="text-xl w-[45px] h-[45px] flex items-center justify-center bg-admin-primary rounded-lg p-[5px] text-white flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[32px] font-bold text-admin-primary m-0 mb-[5px] max-tablet:text-[26px]">{stats.totalStudents}</h3>
                  <p className="text-sm text-[#6b7280] m-0 font-medium">Total Students</p>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-[25px] flex items-center gap-5 transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-tablet:p-5">
                <Key className="text-xl w-[45px] h-[45px] flex items-center justify-center bg-admin-primary rounded-lg p-[5px] text-white flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[32px] font-bold text-admin-primary m-0 mb-[5px] max-tablet:text-[26px]">{stats.activeSessions}</h3>
                  <p className="text-sm text-[#6b7280] m-0 font-medium">Active Sessions</p>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-[25px] flex items-center gap-5 transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-tablet:p-5">
                <BookOpen className="text-xl w-[45px] h-[45px] flex items-center justify-center bg-admin-primary rounded-lg p-[5px] text-white flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[32px] font-bold text-admin-primary m-0 mb-[5px] max-tablet:text-[26px]">{stats.totalSessions}</h3>
                  <p className="text-sm text-[#6b7280] m-0 font-medium">Total Sessions</p>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-[25px] flex items-center gap-5 transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-tablet:p-5">
                <Zap className="text-xl w-[45px] h-[45px] flex items-center justify-center bg-admin-primary rounded-lg p-[5px] text-white flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[32px] font-bold text-admin-primary m-0 mb-[5px] max-tablet:text-[26px]">{stats.recentActivity}</h3>
                  <p className="text-sm text-[#6b7280] m-0 font-medium">Active (24h)</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-10">
              <h2 className="text-[22px] font-bold text-admin-dark m-0 mb-5">Quick Actions</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 max-tablet:grid-cols-1">
                <Link
                  href="/admin/sessions"
                  className="bg-white border-2 border-[#e5e7eb] rounded-xl p-[30px] no-underline transition-all duration-300 ease-in-out block hover:border-admin-primary hover:shadow-[0_4px_12px_rgba(14,195,201,0.15)] hover:-translate-y-[3px]"
                >
                  <Key className="text-[48px] mb-[15px]" size={32} />
                  <h3 className="text-xl font-bold text-admin-dark m-0 mb-[10px]">Manage Sessions</h3>
                  <p className="text-sm text-[#6b7280] m-0 leading-[1.5]">
                    Create and manage session codes for students
                  </p>
                </Link>

                <Link
                  href="/admin/students"
                  className="bg-white border-2 border-[#e5e7eb] rounded-xl p-[30px] no-underline transition-all duration-300 ease-in-out block hover:border-admin-primary hover:shadow-[0_4px_12px_rgba(14,195,201,0.15)] hover:-translate-y-[3px]"
                >
                  <Users className="text-[48px] mb-[15px]" size={32} />
                  <h3 className="text-xl font-bold text-admin-dark m-0 mb-[10px]">View Students</h3>
                  <p className="text-sm text-[#6b7280] m-0 leading-[1.5]">
                    Track student progress and analytics
                  </p>
                </Link>
              </div>
            </div>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5 max-tablet:flex-col max-tablet:items-start max-tablet:gap-[10px]">
                  <h2 className="text-[22px] font-bold text-admin-dark m-0">Recent Session Codes</h2>
                  <Link
                    href="/admin/sessions"
                    className="text-admin-primary no-underline text-[15px] font-medium transition-colors duration-300 ease-in-out hover:text-admin-primary-dark"
                  >
                    View All →
                  </Link>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] max-tablet:overflow-x-auto">
                  <table className="w-full border-collapse max-tablet:min-w-[600px]">
                    <thead>
                      <tr className="bg-[#f9fafb] border-b-2 border-[#e5e7eb]">
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Code</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Status</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Students</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Active (24h)</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Valid Until</th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((session) => (
                        <tr key={session.id} className="border-b border-[#e5e7eb] last:border-b-0 transition-colors duration-200 ease-in-out hover:bg-[#f9fafb]">
                          <td className="p-[15px_20px] text-sm text-[#374151] font-medium">
                            <code className="bg-[#f3f4f6] py-1 px-[10px] rounded-md font-[family-name:var(--font-family-pixel)] text-[13px] text-admin-primary font-bold">
                              {session.code}
                            </code>
                          </td>
                          <td className="p-[15px_20px] text-sm text-[#374151]">
                            <span className={`inline-block py-1 px-3 rounded-xl text-xs font-bold uppercase tracking-[0.5px] ${getStatusBadgeClass(session.status)}`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="p-[15px_20px] text-sm text-[#374151] font-semibold text-center">{session.studentCount}</td>
                          <td className="p-[15px_20px] text-sm text-[#374151] font-semibold text-center">{session.activeStudents24h}</td>
                          <td className="p-[15px_20px] text-sm text-[#374151]">{formatDate(session.validityEnd)}</td>
                          <td className="p-[15px_20px] text-sm text-[#374151]">{formatDate(session.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {stats.totalSessions === 0 && (
              <div className="bg-[linear-gradient(135deg,#e0f9fa_0%,#d1f4f6_100%)] border-2 border-admin-primary rounded-xl py-[50px] px-10 text-center mt-10 max-tablet:py-[30px] max-tablet:px-5">
                <h2 className="text-[28px] text-admin-primary-dark m-0 mb-[15px] max-tablet:text-[22px]">Welcome to Binary Coven Admin</h2>
                <p className="text-base text-[#374151] m-0 mb-[25px] max-tablet:text-sm">Get started by creating your first session code!</p>
                <Link
                  href="/admin/sessions"
                  className="inline-block bg-admin-primary-gradient text-white py-[14px] px-7 rounded-lg no-underline text-[15px] font-bold transition-all duration-300 ease-in-out shadow-[0_2px_8px_rgba(14,195,201,0.3)] hover:bg-admin-primary-gradient-hover hover:shadow-[0_4px_12px_rgba(14,195,201,0.4)] hover:-translate-y-[2px]"
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
