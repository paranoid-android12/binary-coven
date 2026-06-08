import { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Target, Clock, Play, Zap, Search, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { adminFetch } from '../../utils/adminFetch';
import type { Quest } from '../../types/quest';

interface Student {
  id: string;
  username: string;
  displayName: string;
  sessionCode: string;
  sessionCodeId: string;
  joinedAt: string;
  lastLogin: string;
  questsCompleted: number;
  questsActive: number;
  totalTimeSpentSeconds: number;
  totalCodeExecutions: number;
  lastSaveTime: string | null;
  questProgress: { questId: string; state: string }[];
}

interface SessionCode {
  id: string;
  code: string;
}

type SortCol = 'username' | 'quests' | 'time' | 'executions' | 'lastLogin';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [sessionCodes, setSessionCodes] = useState<SessionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortCol>('lastLogin');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchAllStudents(); }, []);

  useEffect(() => { filterAndSort(); }, [students, searchQuery, sessionFilter, sortBy, sortOrder]);

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const sessionResponse = await adminFetch('/api/session-codes/list');
      const sessionData = await sessionResponse.json();
      if (!sessionData.success) { setError('Failed to load session codes'); return; }

      const codes: SessionCode[] = sessionData.sessionCodes;
      setSessionCodes(codes);

      const results = await Promise.all(
        codes.map(async (session) => {
          try {
            const r = await adminFetch(`/api/session-codes/${session.code}/students`);
            const d = await r.json();
            if (d.success && d.students) {
              return d.students.map((s: any) => ({ ...s, sessionCode: session.code, sessionCodeId: session.id }));
            }
          } catch { /* skip */ }
          return [];
        })
      );
      setStudents(results.flat());
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading students');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSort = () => {
    let list = [...students];
    if (sessionFilter !== 'all') list = list.filter(s => s.sessionCode === sessionFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.username.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let av: any, bv: any;
      switch (sortBy) {
        case 'username': av = a.username.toLowerCase(); bv = b.username.toLowerCase(); break;
        case 'quests': av = a.questsCompleted; bv = b.questsCompleted; break;
        case 'time': av = a.totalTimeSpentSeconds; bv = b.totalTimeSpentSeconds; break;
        case 'executions': av = a.totalCodeExecutions; bv = b.totalCodeExecutions; break;
        case 'lastLogin': av = new Date(a.lastLogin).getTime(); bv = new Date(b.lastLogin).getTime(); break;
      }
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredStudents(list);
  };

  const handleSort = (col: SortCol) => {
    if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortOrder('desc'); }
  };

  const formatDate = (ds: string | null) => {
    if (!ds) return 'Never';
    const d = new Date(ds), now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const stats = {
    total: students.length,
    quests: students.reduce((s, x) => s + x.questsCompleted, 0),
    time: students.reduce((s, x) => s + x.totalTimeSpentSeconds, 0),
    executions: students.reduce((s, x) => s + x.totalCodeExecutions, 0),
    activeToday: students.filter(s => new Date(s.lastLogin).toDateString() === new Date().toDateString()).length,
  };

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortBy !== col) return <ChevronsUpDown size={12} className="ml-1 opacity-40 inline" />;
    return sortOrder === 'asc'
      ? <ChevronUp size={12} className="ml-1 text-admin-accent inline" />
      : <ChevronDown size={12} className="ml-1 text-admin-accent inline" />;
  };

  const thClass = (col: SortCol) =>
    `px-4 py-2.5 text-left text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-admin-text transition-colors duration-150 ${sortBy === col ? 'text-admin-text' : ''}`;

  return (
    <AdminLayout title="Students">
      <div className="max-w-[1200px] mx-auto space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-5 gap-3 max-laptop:grid-cols-3 max-tablet:grid-cols-2">
          {[
            { label: 'Students', value: stats.total, icon: Users },
            { label: 'Quests Done', value: stats.quests, icon: Target },
            { label: 'Total Time', value: formatTime(stats.time), icon: Clock },
            { label: 'Code Runs', value: stats.executions, icon: Play },
            { label: 'Active Today', value: stats.activeToday, icon: Zap },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-admin-card border border-admin-border rounded-lg p-3.5 relative">
              <Icon className="absolute top-3 right-3 text-admin-text-faint" size={13} />
              <p className="text-xl font-bold text-admin-text mb-0.5">{value}</p>
              <p className="text-[11px] text-admin-text-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 max-tablet:flex-col">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-faint pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search by username or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-9 pr-4 border border-admin-border rounded-lg text-sm text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent focus:border-transparent"
            />
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 py-2 px-3 pr-8 border border-admin-border rounded-lg text-sm text-admin-text bg-admin-card focus:outline-none cursor-pointer min-w-[160px] max-tablet:w-full"
            >
              {sessionFilter === 'all' ? 'All Sessions' : sessionFilter}
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-faint transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} size={14} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-admin-card border border-admin-border rounded-lg shadow-md z-50 overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  {['all', ...sessionCodes.map(s => s.code)].map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => { setSessionFilter(code); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors duration-100 border-none ${
                        sessionFilter === code ? 'bg-blue-50 text-admin-accent font-semibold' : 'text-admin-text hover:bg-stone-50'
                      }`}
                    >
                      {code === 'all' ? 'All Sessions' : code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-admin-text-muted">
            <div className="w-10 h-10 border-4 border-admin-border border-t-admin-accent rounded-full animate-spin-slow mb-4" />
            <p className="text-sm">Loading students...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-[#b91c1c] text-sm">
            <p className="mb-3">{error}</p>
            <button onClick={fetchAllStudents} className="bg-[#b91c1c] text-white border-none py-2 px-4 rounded-md text-xs cursor-pointer hover:bg-[#991b1b]">Retry</button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-admin-card border border-admin-border rounded-lg py-12 text-center">
            <p className="text-sm text-admin-text-muted">
              {students.length === 0 ? 'No students yet.' : 'No students match your filters.'}
            </p>
          </div>
        ) : (
          <div className="bg-admin-card border border-admin-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-admin-border">
                    <th className={thClass('username')} onClick={() => handleSort('username')}>
                      Username <SortIcon col="username" />
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide whitespace-nowrap">Session</th>
                    <th className={thClass('quests')} onClick={() => handleSort('quests')}>
                      Quests <SortIcon col="quests" />
                    </th>
                    <th className={thClass('time')} onClick={() => handleSort('time')}>
                      Time <SortIcon col="time" />
                    </th>
                    <th className={thClass('executions')} onClick={() => handleSort('executions')}>
                      Runs <SortIcon col="executions" />
                    </th>
                    <th className={thClass('lastLogin')} onClick={() => handleSort('lastLogin')}>
                      Last Active <SortIcon col="lastLogin" />
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-admin-text-muted uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.id} className="border-b border-admin-border last:border-0 hover:bg-[#faf9f7] transition-colors duration-100">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-admin-text m-0 text-[13px]">{s.username}</p>
                        {s.displayName && s.displayName !== s.username && (
                          <p className="text-[11px] text-admin-text-faint m-0">{s.displayName}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/sessions/${s.sessionCode}/students`}
                          className="text-admin-accent no-underline text-xs font-bold hover:text-admin-accent-hover"
                        >
                          {s.sessionCode}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-admin-text m-0 text-[13px]">{s.questsCompleted}</p>
                        {s.questsActive > 0 && (
                          <p className="text-[11px] text-admin-text-faint m-0">+{s.questsActive} active</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-admin-text text-[13px]">{formatTime(s.totalTimeSpentSeconds)}</td>
                      <td className="px-4 py-2.5 text-admin-text text-[13px]">{s.totalCodeExecutions}</td>
                      <td className="px-4 py-2.5 text-admin-text-muted text-[13px] whitespace-nowrap">{formatDate(s.lastLogin)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="inline-block border border-admin-border text-admin-text-muted bg-transparent py-1 px-3 rounded-md no-underline text-xs font-medium transition-colors duration-150 hover:border-admin-accent hover:text-admin-accent"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-admin-border bg-[#faf9f7]">
              <p className="text-[11px] text-admin-text-faint m-0">
                {filteredStudents.length} of {students.length} students
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
