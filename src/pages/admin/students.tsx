import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, Target, Clock, Play, Zap } from 'lucide-react';
import styles from '../../styles/admin/Students.module.css';

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
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title} style={{ color: '#1a1a2e' }}>All Students</h1>
            <p className={styles.subtitle}>
              Manage and view student progress across all sessions
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <Users className={styles.statIcon} size={17} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.totalStudents}</div>
              <div className={styles.statLabel}>Total Students</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <Target className={styles.statIcon} size={17} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.totalQuests}</div>
              <div className={styles.statLabel}>Quests Completed</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <Clock className={styles.statIcon} size={17} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{formatTime(stats.totalTime)}</div>
              <div className={styles.statLabel}>Total Time</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <Play className={styles.statIcon} size={17} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.totalExecutions}</div>
              <div className={styles.statLabel}>Code Executions</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <Zap className={styles.statIcon} size={17} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.activeToday}</div>
              <div className={styles.statLabel}>Active Today</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className={styles.filterSelect}
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
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading students...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={fetchAllStudents} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && (
          <>
            {filteredStudents.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyText}>
                  {students.length === 0
                    ? 'No students yet. Students will appear here once they register with a session code.'
                    : 'No students match your search criteria.'}
                </p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort('username')}
                        className={styles.sortable}
                      >
                        Username {getSortIcon('username')}
                      </th>
                      <th>Session Code</th>
                      <th
                        onClick={() => handleSort('quests')}
                        className={styles.sortable}
                      >
                        Quests {getSortIcon('quests')}
                      </th>
                      <th
                        onClick={() => handleSort('time')}
                        className={styles.sortable}
                      >
                        Time Spent {getSortIcon('time')}
                      </th>
                      <th>Executions</th>
                      <th
                        onClick={() => handleSort('lastLogin')}
                        className={styles.sortable}
                      >
                        Last Active {getSortIcon('lastLogin')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className={styles.tableRow}>
                        <td className={styles.usernameCell}>
                          <div className={styles.username}>{student.username}</div>
                          {student.displayName && student.displayName !== student.username && (
                            <div className={styles.displayName}>{student.displayName}</div>
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/admin/sessions/${student.sessionCode}/students`}
                            className={styles.sessionCodeLink}
                          >
                            {student.sessionCode}
                          </Link>
                        </td>
                        <td>
                          <div className={styles.questStats}>
                            <span className={styles.completed}>{student.questsCompleted}</span>
                            {student.questsActive > 0 && (
                              <span className={styles.active}>+{student.questsActive}</span>
                            )}
                          </div>
                        </td>
                        <td>{formatTime(student.totalTimeSpentSeconds)}</td>
                        <td>{student.totalCodeExecutions}</td>
                        <td>{formatDate(student.lastLogin)}</td>
                        <td>
                          <Link
                            href={`/admin/students/${student.id}`}
                            className={styles.viewButton}
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.tableFooter}>
                  <p className={styles.resultCount}>
                    Showing {filteredStudents.length} of {students.length} students
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
