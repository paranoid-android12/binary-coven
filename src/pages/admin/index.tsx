import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Key, BookOpen, Zap, ArrowRight, UserCog, Target, Clock, Play, Gauge } from 'lucide-react';
import { adminFetch } from '../../utils/adminFetch';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

interface AggStats {
  totalStudents: number;
  activeToday: number;
  questsCompleted: number;
  questsActive: number;
  totalTimeSeconds: number;
  codeExecutions: number;
  avgQuestsPerStudent: number;
}

// Quest-state colors, matching the student detail view
const QUEST_STATE_COLORS: Record<string, string> = {
  completed: '#4d7c0f',
  active: '#2563eb',
  available: '#78716c',
  locked: '#a8a29e',
  failed: '#b91c1c',
};

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
  const [agg, setAgg] = useState<AggStats | null>(null);
  const [questStateCounts, setQuestStateCounts] = useState<Record<string, number>>({});
  const [signups, setSignups] = useState<Array<{ label: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Sessions list (required) + platform aggregate (best-effort) in parallel
      const [sessionsRes, aggRes] = await Promise.all([
        adminFetch('/api/session-codes/list'),
        adminFetch('/api/admin/dashboard').catch(() => null),
      ]);

      const data = await sessionsRes.json();
      if (data.success) {
        const sessions: SessionCode[] = data.sessionCodes;
        setStats({
          totalStudents: sessions.reduce((sum, s) => sum + s.studentCount, 0),
          activeSessions: sessions.filter(s => s.status === 'active').length,
          totalSessions: sessions.length,
          recentActivity: sessions.reduce((sum, s) => sum + s.activeStudents24h, 0),
        });
        setRecentSessions(
          [...sessions]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        );
      } else {
        setError('Failed to load dashboard data');
      }

      // Aggregate learning stats — optional; dashboard still renders without it
      if (aggRes) {
        try {
          const aggData = await aggRes.json();
          if (aggData.success) {
            setAgg(aggData.stats);
            setQuestStateCounts(aggData.questStateCounts || {});
            setSignups(aggData.signups || []);
          }
        } catch { /* ignore — leave learning stats empty */ }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h >= 1) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const statusClass = (status: string) => {
    if (status === 'active') return 'bg-lime-50 text-[#4d7c0f]';
    if (status === 'expired') return 'bg-red-50 text-[#b91c1c]';
    return 'bg-slate-100 text-[#475569]';
  };

  const statCards: { label: string; value: string | number; icon: typeof Users }[] = [
    { label: 'Students', value: agg?.totalStudents ?? stats.totalStudents, icon: Users },
    { label: 'Active Today', value: agg?.activeToday ?? stats.recentActivity, icon: Zap },
    { label: 'Active Sessions', value: stats.activeSessions, icon: Key },
    { label: 'Total Sessions', value: stats.totalSessions, icon: BookOpen },
    { label: 'Quests Completed', value: agg?.questsCompleted ?? 0, icon: Target },
    { label: 'Avg / Student', value: agg?.avgQuestsPerStudent ?? 0, icon: Gauge },
    { label: 'Learning Time', value: formatDuration(agg?.totalTimeSeconds ?? 0), icon: Clock },
    { label: 'Code Runs', value: agg?.codeExecutions ?? 0, icon: Play },
  ];

  // Quest-status chart data (only non-zero slices)
  const questStateData = Object.entries(questStateCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: QUEST_STATE_COLORS[name] || '#a8a29e',
    }));
  const totalQuestRecords = questStateData.reduce((sum, d) => sum + d.value, 0);
  const hasSignups = signups.some((s) => s.count > 0);

  const quickLinks = [
    { href: '/admin/sessions', label: 'Session Codes', desc: 'Create and manage session codes', icon: Key },
    { href: '/admin/students', label: 'Students', desc: 'Track progress across all sessions', icon: Users },
    { href: '/admin/users', label: 'Admin Users', desc: 'Manage accounts and permissions', icon: UserCog },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-admin-text-muted">
            <div className="w-10 h-10 border-4 border-admin-border border-t-admin-accent rounded-full animate-spin-slow mb-4" />
            <p className="text-sm">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-[#b91c1c] text-sm">
            <p className="mb-3">{error}</p>
            <button onClick={fetchDashboardData} className="bg-[#b91c1c] text-white border-none py-2 px-4 rounded-md text-xs cursor-pointer hover:bg-[#991b1b]">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 max-laptop:grid-cols-2 max-tablet:grid-cols-2">
              {statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-admin-card border border-admin-border rounded-lg p-4 relative">
                  <Icon className="absolute top-3.5 right-3.5 text-admin-text-faint" size={14} />
                  <p className="text-2xl font-bold text-admin-text mb-0.5">{value}</p>
                  <p className="text-xs text-admin-text-muted">{label}</p>
                </div>
              ))}
            </div>

            {/* Charts: quest status + new students over time */}
            {(totalQuestRecords > 0 || hasSignups) && (
              <div className="grid grid-cols-2 gap-3 max-tablet:grid-cols-1">
                {/* Quest Status donut */}
                <div className="bg-admin-card border border-admin-border rounded-lg p-4">
                  <h2 className="text-xs font-bold text-admin-text-muted uppercase tracking-wider mb-2">Quest Status</h2>
                  {totalQuestRecords > 0 ? (
                    <div className="flex items-center gap-3">
                      <ResponsiveContainer width="50%" height={150}>
                        <PieChart>
                          <Pie data={questStateData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} dataKey="value">
                            {questStateData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e0', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Legend with counts */}
                      <div className="flex-1 flex flex-col gap-1.5">
                        {questStateData.map((d) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-admin-text-muted">
                              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: d.color }} />
                              {d.name}
                            </span>
                            <span className="font-semibold text-admin-text">
                              {d.value}
                              <span className="text-admin-text-faint font-normal ml-1">
                                {Math.round((d.value / totalQuestRecords) * 100)}%
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-admin-text-faint py-10 text-center">No quest activity yet.</p>
                  )}
                </div>

                {/* New students over the last 8 weeks */}
                <div className="bg-admin-card border border-admin-border rounded-lg p-4">
                  <h2 className="text-xs font-bold text-admin-text-muted uppercase tracking-wider mb-2">New Students · 8 weeks</h2>
                  {hasSignups ? (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={signups} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716c' }} interval={0} tickLine={false} axisLine={{ stroke: '#e7e5e0' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716c' }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e0', fontSize: 12 }} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
                        <Bar dataKey="count" name="Signups" fill="#2563eb" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-admin-text-faint py-10 text-center">No recent signups.</p>
                  )}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div>
              <h2 className="text-xs font-bold text-admin-text-muted uppercase tracking-wider mb-2">Quick Actions</h2>
              <div className="bg-admin-card border border-admin-border rounded-lg divide-y divide-admin-border">
                {quickLinks.map(({ href, label, desc, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-4 px-4 py-3 no-underline transition-colors duration-150 hover:bg-[#faf9f7]"
                  >
                    <Icon className="text-admin-accent flex-shrink-0" size={16} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-admin-text m-0">{label}</p>
                      <p className="text-xs text-admin-text-muted m-0 truncate">{desc}</p>
                    </div>
                    <ArrowRight className="text-admin-text-faint transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0" size={14} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold text-admin-text-muted uppercase tracking-wider m-0">Recent Sessions</h2>
                  <Link href="/admin/sessions" className="text-xs text-admin-accent no-underline hover:text-admin-accent-hover">
                    View all →
                  </Link>
                </div>
                <div className="bg-admin-card border border-admin-border rounded-lg overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-admin-border">
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide">Code</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide">Students</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide">Active 24h</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide">Valid Until</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((s) => (
                        <tr key={s.id} className="border-b border-admin-border last:border-0 hover:bg-[#faf9f7]">
                          <td className="px-4 py-2.5">
                            <code className="bg-stone-100 py-0.5 px-2 rounded text-[12px] font-mono font-bold text-admin-text">{s.code}</code>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block py-0.5 px-2 rounded text-[11px] font-semibold uppercase tracking-wide ${statusClass(s.status)}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-admin-text font-medium">{s.studentCount}</td>
                          <td className="px-4 py-2.5 text-right text-admin-text font-medium">{s.activeStudents24h}</td>
                          <td className="px-4 py-2.5 text-right text-admin-text-muted">{formatDate(s.validityEnd)}</td>
                          <td className="px-4 py-2.5 text-right text-admin-text-muted">{formatDate(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state */}
            {stats.totalSessions === 0 && (
              <div className="bg-admin-accent-light border border-admin-accent rounded-lg py-10 px-6 text-center">
                <p className="text-base font-semibold text-admin-accent-hover mb-1">Welcome to Binary Coven Admin</p>
                <p className="text-sm text-admin-text-muted mb-4">Get started by creating your first session code.</p>
                <Link href="/admin/sessions" className="inline-block bg-admin-accent text-white py-2 px-5 rounded-md no-underline text-sm font-semibold hover:bg-admin-accent-hover">
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
