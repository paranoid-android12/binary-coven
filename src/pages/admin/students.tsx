import { useEffect, useState, useMemo, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Target, Clock, Play, Zap, Award, Search, ChevronDown } from 'lucide-react';
import { adminFetch } from '../../utils/adminFetch';
import StudentProgressCard from '../../components/admin/StudentProgressCard';
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

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [sessionCodes, setSessionCodes] = useState<SessionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'username' | 'quests' | 'time' | 'lastLogin'>('lastLogin');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [questDefinitions, setQuestDefinitions] = useState<Quest[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchAllStudents();
    fetchQuestDefinitions();
  }, []);

  const fetchQuestDefinitions = async () => {
    try {
      const res = await adminFetch('/api/quests/definitions');
      const data = await res.json();
      if (data.success) {
        setQuestDefinitions(data.quests as Quest[]);
      }
    } catch {
      // Silently skip — mastery badges will not appear
    }
  };

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchQuery, sessionFilter, sortBy, sortOrder]);

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      setError('');

      // First, fetch all session codes
      const sessionResponse = await adminFetch('/api/session-codes/list');
      const sessionData = await sessionResponse.json();

      if (!sessionData.success) {
        setError('Failed to load session codes');
        return;
      }

      const codes = sessionData.sessionCodes;
      setSessionCodes(codes);

      // Fetch students for all session codes in parallel
      const results = await Promise.all(
        codes.map(async (session) => {
          try {
            const studentResponse = await adminFetch(`/api/session-codes/${session.code}/students`);
            const studentData = await studentResponse.json();

            if (studentData.success && studentData.students) {
              return studentData.students.map((student: any) => ({
                ...student,
                sessionCode: session.code,
                sessionCodeId: session.id,
              }));
            }
          } catch (err) {
            console.error(`Error fetching students for ${session.code}:`, err);
          }
          return [];
        })
      );

      const allStudents: Student[] = results.flat();

      setStudents(allStudents);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('An error occurred while loading students');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortStudents = () => {
    let filtered = [...students];

    // Apply session filter
    if (sessionFilter !== 'all') {
      filtered = filtered.filter((student) => student.sessionCode === sessionFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((student) =>
        student.username.toLowerCase().includes(query) ||
        student.displayName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortBy) {
        case 'username':
          compareA = a.username.toLowerCase();
          compareB = b.username.toLowerCase();
          break;
        case 'quests':
          compareA = a.questsCompleted;
          compareB = b.questsCompleted;
          break;
        case 'time':
          compareA = a.totalTimeSpentSeconds;
          compareB = b.totalTimeSpentSeconds;
          break;
        case 'lastLogin':
          compareA = new Date(a.lastLogin).getTime();
          compareB = new Date(b.lastLogin).getTime();
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredStudents(filtered);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getTotalStats = () => {
    return {
      totalStudents: students.length,
      totalQuests: students.reduce((sum, s) => sum + s.questsCompleted, 0),
      totalTime: students.reduce((sum, s) => sum + s.totalTimeSpentSeconds, 0),
      totalExecutions: students.reduce((sum, s) => sum + s.totalCodeExecutions, 0),
      activeToday: students.filter((s) => {
        const lastLogin = new Date(s.lastLogin);
        const today = new Date();
        return lastLogin.toDateString() === today.toDateString();
      }).length,
    };
  };

  const stats = getTotalStats();

  return (
    <AdminLayout title="Students">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-admin-text m-0 mb-[10px] max-tablet:text-[24px]">All Students</h1>
            <p className="text-[15px] text-admin-text-muted m-0">
              Manage and view student progress across all sessions
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-8 max-laptop:grid-cols-3 max-tablet:grid-cols-2">
          <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-4 transition-colors duration-200 hover:border-admin-border-hover">
            <Users className="text-admin-accent flex-shrink-0" size={18} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-text m-0 mb-[2px]">{stats.totalStudents}</div>
              <div className="text-xs text-admin-text-muted m-0 font-medium">Total Students</div>
            </div>
          </div>
          <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-4 transition-colors duration-200 hover:border-admin-border-hover">
            <Target className="text-admin-accent flex-shrink-0" size={18} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-text m-0 mb-[2px]">{stats.totalQuests}</div>
              <div className="text-xs text-admin-text-muted m-0 font-medium">Quests Completed</div>
            </div>
          </div>
          <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-4 transition-colors duration-200 hover:border-admin-border-hover">
            <Clock className="text-admin-accent flex-shrink-0" size={18} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-text m-0 mb-[2px]">{formatTime(stats.totalTime)}</div>
              <div className="text-xs text-admin-text-muted m-0 font-medium">Total Time</div>
            </div>
          </div>
          <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-4 transition-colors duration-200 hover:border-admin-border-hover">
            <Play className="text-admin-accent flex-shrink-0" size={18} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-text m-0 mb-[2px]">{stats.totalExecutions}</div>
              <div className="text-xs text-admin-text-muted m-0 font-medium">Code Executions</div>
            </div>
          </div>
          <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-4 transition-colors duration-200 hover:border-admin-border-hover">
            <Zap className="text-admin-accent flex-shrink-0" size={18} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-text m-0 mb-[2px]">{stats.activeToday}</div>
              <div className="text-xs text-admin-text-muted m-0 font-medium">Active Today</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-[15px] mb-8 max-tablet:flex-col">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-faint pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Search by username or display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-[12px_16px] pl-10 border border-admin-border rounded-lg text-sm text-admin-text transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-admin-accent focus:border-transparent"
            />
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-[12px_16px] pr-10 border border-admin-border rounded-lg text-sm text-admin-text bg-admin-card transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-admin-accent focus:border-transparent cursor-pointer max-tablet:w-full min-w-[180px] text-left relative"
            >
              {sessionFilter === 'all' ? 'All Sessions' : sessionFilter}
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-faint transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-admin-card border border-admin-border rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
                <div className="max-h-[240px] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setSessionFilter('all'); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 border-none ${
                      sessionFilter === 'all' ? 'bg-amber-50 text-admin-accent font-semibold' : 'text-admin-text hover:bg-stone-50'
                    }`}
                  >
                    All Sessions
                  </button>
                  {sessionCodes.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => { setSessionFilter(session.code); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 border-none ${
                        sessionFilter === session.code ? 'bg-amber-50 text-admin-accent font-semibold' : 'text-admin-text hover:bg-stone-50'
                      }`}
                    >
                      {session.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-admin-text-muted">
            <div className="w-[50px] h-[50px] border-4 border-admin-border border-t-admin-accent rounded-full animate-spin-slow mb-5"></div>
            <p>Loading students...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-[30px] text-center text-[#b91c1c]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button onClick={fetchAllStudents} className="bg-[#b91c1c] text-white border-none py-[10px] px-5 rounded-lg text-sm cursor-pointer transition-colors duration-200 hover:bg-[#991b1b]">
              Retry
            </button>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && (
          <>
            {filteredStudents.length === 0 ? (
              <div className="bg-admin-card border border-admin-border rounded-xl py-[50px] px-10 text-center max-tablet:py-[30px] max-tablet:px-5">
                <p className="text-[15px] text-admin-text-muted m-0">
                  {students.length === 0
                    ? 'No students yet. Students will appear here once they register with a session code.'
                    : 'No students match your search criteria.'}
                </p>
              </div>
            ) : (
              <div className="mb-8">
                {/* Sort controls */}
                <div className="flex items-center gap-3 mb-4 text-xs text-admin-text-muted">
                  <span className="font-medium">Sort by:</span>
                  {(['username', 'quests', 'time', 'lastLogin'] as const).map((col) => (
                    <button
                      key={col}
                      onClick={() => handleSort(col)}
                      className={`px-2 py-1 rounded text-xs border-none cursor-pointer transition-colors duration-200 ${
                        sortBy === col
                          ? 'bg-amber-50 text-admin-accent font-semibold'
                          : 'text-admin-text-muted hover:text-admin-accent bg-transparent'
                      }`}
                    >
                      {col === 'username' ? 'Name' : col === 'quests' ? 'Quests' : col === 'time' ? 'Time' : 'Last Active'}{' '}
                      {getSortIcon(col)}
                    </button>
                  ))}
                </div>

                {/* Card grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => (
                    <StudentProgressCard
                      key={student.id}
                      student={student}
                      questDefinitions={questDefinitions}
                      showSessionCode={true}
                      formatTime={formatTime}
                      formatDate={formatDate}
                    />
                  ))}
                </div>

                <div className="mt-4 text-sm text-admin-text-muted">
                  Showing {filteredStudents.length} of {students.length} students
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
