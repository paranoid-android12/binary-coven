import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Target, Clock, Play, Zap, Award } from 'lucide-react';

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

  useEffect(() => {
    fetchAllStudents();
  }, []);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchQuery, sessionFilter, sortBy, sortOrder]);

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      setError('');

      // First, fetch all session codes
      const sessionResponse = await fetch('/api/session-codes/list');
      const sessionData = await sessionResponse.json();

      if (!sessionData.success) {
        setError('Failed to load session codes');
        return;
      }

      const codes = sessionData.sessionCodes;
      setSessionCodes(codes);

      // Fetch students for each session code
      const allStudents: Student[] = [];

      for (const session of codes) {
        try {
          const studentResponse = await fetch(`/api/session-codes/${session.code}/students`);
          const studentData = await studentResponse.json();

          if (studentData.success && studentData.students) {
            // Add session code to each student
            const studentsWithSession = studentData.students.map((student: any) => ({
              ...student,
              sessionCode: session.code,
              sessionCodeId: session.id,
            }));
            allStudents.push(...studentsWithSession);
          }
        } catch (err) {
          console.error(`Error fetching students for ${session.code}:`, err);
        }
      }

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
            <h1 className="text-[28px] font-bold text-admin-dark m-0 mb-[10px] max-tablet:text-[24px]">All Students</h1>
            <p className="text-[15px] text-[#6b7280] m-0">
              Manage and view student progress across all sessions
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-8 max-laptop:grid-cols-3 max-tablet:grid-cols-2">
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <Users className="text-admin-primary flex-shrink-0" size={17} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">{stats.totalStudents}</div>
              <div className="text-xs text-[#6b7280] m-0 font-medium">Total Students</div>
            </div>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <Target className="text-admin-primary flex-shrink-0" size={17} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">{stats.totalQuests}</div>
              <div className="text-xs text-[#6b7280] m-0 font-medium">Quests Completed</div>
            </div>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <Clock className="text-admin-primary flex-shrink-0" size={17} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">{formatTime(stats.totalTime)}</div>
              <div className="text-xs text-[#6b7280] m-0 font-medium">Total Time</div>
            </div>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <Play className="text-admin-primary flex-shrink-0" size={17} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">{stats.totalExecutions}</div>
              <div className="text-xs text-[#6b7280] m-0 font-medium">Code Executions</div>
            </div>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <Zap className="text-admin-primary flex-shrink-0" size={17} />
            <div className="flex-1">
              <div className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">{stats.activeToday}</div>
              <div className="text-xs text-[#6b7280] m-0 font-medium">Active Today</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-[15px] mb-8 max-tablet:flex-col">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by username or display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-[12px_16px] border border-[#d1d5db] rounded-lg text-sm text-[#374151] transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-admin-primary focus:border-transparent"
            />
          </div>

          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="p-[12px_16px] border border-[#d1d5db] rounded-lg text-sm text-[#374151] bg-white transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-admin-primary focus:border-transparent cursor-pointer max-tablet:w-full"
          >
            <option value="all">All Sessions</option>
            {sessionCodes.map((session) => (
              <option key={session.id} value={session.code}>
                {session.code}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-[#6b7280]">
            <div className="w-[50px] h-[50px] border-4 border-[#e5e7eb] border-t-admin-primary rounded-full animate-spin-slow mb-5"></div>
            <p>Loading students...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-[30px] text-center text-[#dc2626]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button onClick={fetchAllStudents} className="bg-[#dc2626] text-white border-none py-[10px] px-5 rounded-lg text-sm font-[family-name:var(--font-family-admin)] cursor-pointer transition-colors duration-300 ease-in-out hover:bg-[#b91c1c]">
              Retry
            </button>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && (
          <>
            {filteredStudents.length === 0 ? (
              <div className="bg-white border border-[#e5e7eb] rounded-xl py-[50px] px-10 text-center max-tablet:py-[30px] max-tablet:px-5">
                <p className="text-[15px] text-[#6b7280] m-0">
                  {students.length === 0
                    ? 'No students yet. Students will appear here once they register with a session code.'
                    : 'No students match your search criteria.'}
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] max-tablet:overflow-x-auto">
                  <table className="w-full border-collapse max-tablet:min-w-[900px]">
                    <thead>
                      <tr className="bg-[#f9fafb] border-b-2 border-[#e5e7eb]">
                        <th
                          onClick={() => handleSort('username')}
                          className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px] cursor-pointer transition-colors duration-200 ease-in-out hover:text-admin-primary"
                        >
                          Username {getSortIcon('username')}
                        </th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Session Code</th>
                        <th
                          onClick={() => handleSort('quests')}
                          className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px] cursor-pointer transition-colors duration-200 ease-in-out hover:text-admin-primary"
                        >
                          Quests {getSortIcon('quests')}
                        </th>
                        <th
                          onClick={() => handleSort('time')}
                          className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px] cursor-pointer transition-colors duration-200 ease-in-out hover:text-admin-primary"
                        >
                          Time Spent {getSortIcon('time')}
                        </th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Executions</th>
                        <th
                          onClick={() => handleSort('lastLogin')}
                          className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px] cursor-pointer transition-colors duration-200 ease-in-out hover:text-admin-primary"
                        >
                          Last Active {getSortIcon('lastLogin')}
                        </th>
                        <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="border-b border-[#e5e7eb] last:border-b-0 transition-colors duration-200 ease-in-out hover:bg-[#f9fafb]">
                          <td className="p-[15px_20px] text-sm text-[#374151]">
                            <div className="font-semibold text-admin-dark">{student.username}</div>
                            {student.displayName && student.displayName !== student.username && (
                              <div className="text-xs text-[#9ca3af] mt-[3px]">{student.displayName}</div>
                            )}
                          </td>
                          <td className="p-[15px_20px] text-sm text-[#374151]">
                            <Link
                              href={`/admin/sessions/${student.sessionCode}/students`}
                              className="text-admin-primary no-underline font-[family-name:var(--font-family-admin)] text-[13px] font-bold transition-colors duration-300 ease-in-out hover:text-admin-primary-dark"
                            >
                              {student.sessionCode}
                            </Link>
                          </td>
                          <td className="p-[15px_20px] text-sm text-[#374151]">
                            <div className="flex items-center gap-[8px]">
                              <span className="font-semibold text-admin-dark">{student.questsCompleted}</span>
                              {student.questsActive > 0 && (
                                <span className="text-[#10b981] text-xs font-semibold">+{student.questsActive}</span>
                              )}
                            </div>
                            {/* Completion Progress Bar */}
                            {(student.questsCompleted > 0 || student.questsActive > 0) && (
                              <div className="w-full h-1.5 bg-[#e5e7eb] rounded-full mt-1.5 overflow-hidden max-w-[80px]">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, ((student.questsCompleted) / Math.max(1, student.questsCompleted + student.questsActive)) * 100)}%`,
                                    backgroundColor: student.questsActive === 0 && student.questsCompleted > 0 ? '#22c55e' : '#0ec5c9',
                                  }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="p-[15px_20px] text-sm text-[#374151] font-medium">{formatTime(student.totalTimeSpentSeconds)}</td>
                          <td className="p-[15px_20px] text-sm text-[#374151] font-medium">{student.totalCodeExecutions}</td>
                          <td className="p-[15px_20px] text-sm text-[#374151]">{formatDate(student.lastLogin)}</td>
                          <td className="p-[15px_20px] text-sm text-[#374151]">
                            <Link
                              href={`/admin/students/${student.id}`}
                              className="inline-block bg-admin-primary text-white py-[6px] px-[14px] rounded-lg no-underline text-xs font-semibold transition-all duration-300 ease-in-out hover:bg-admin-primary-dark hover:-translate-y-[1px] hover:shadow-[0_2px_8px_rgba(14,195,201,0.3)]"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="bg-[#f9fafb] p-[15px_20px] border-t border-[#e5e7eb]">
                    <p className="text-sm text-[#6b7280] m-0">
                      Showing {filteredStudents.length} of {students.length} students
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
