import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, CheckCircle, Zap, Clock } from 'lucide-react';
import styles from '../../../../styles/admin/SessionStudents.module.css';

interface Student {
  id: string;
  username: string;
  displayName: string;
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
  validityEnd: string;
}

export default function SessionStudentsPage() {
  const router = useRouter();
  const { code } = router.query;
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionCode, setSessionCode] = useState<SessionCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) {
      fetchStudents();
    }
  }, [code]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/session-codes/${code}/students`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students);
        setSessionCode(data.sessionCode);
      } else {
        setError(data.message || 'Failed to load students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('An error occurred while loading students');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  return (
    <AdminLayout title={`Students - ${code}`}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/admin/sessions" className={styles.backButton}>
            ← Back to Sessions
          </Link>

          {sessionCode && (
            <div className={styles.sessionInfo}>
              <h1 className={styles.title}>
                Session Code: <span className={styles.code}>{sessionCode.code}</span>
              </h1>
              <p className={styles.subtitle}>
                Valid until: {formatDate(sessionCode.validityEnd)}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading students...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={fetchStudents} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>No students yet</h3>
            <p className={styles.emptyText}>
              No students have registered with this session code
            </p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Users className={styles.statIcon} size={17} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>{students.length}</h3>
                  <p className={styles.statLabel}>Total Students</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <CheckCircle className={styles.statIcon} size={10} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>
                    {students.reduce((sum, s) => sum + s.questsCompleted, 0)}
                  </h3>
                  <p className={styles.statLabel}>Quests Completed</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <Zap className={styles.statIcon} size={17} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>
                    {students.reduce((sum, s) => sum + s.totalCodeExecutions, 0)}
                  </h3>
                  <p className={styles.statLabel}>Code Executions</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <Clock className={styles.statIcon} size={17} />
                <div className={styles.statContent}>
                  <h3 className={styles.statValue}>
                    {formatTime(students.reduce((sum, s) => sum + s.totalTimeSpentSeconds, 0))}
                  </h3>
                  <p className={styles.statLabel}>Total Time</p>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th className={styles.centerCell}>Quests</th>
                    <th className={styles.centerCell}>Time Spent</th>
                    <th className={styles.centerCell}>Executions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className={styles.usernameCell}>
                        <div className={styles.username}>{student.username}</div>
                        {student.displayName && (
                          <div className={styles.displayName}>{student.displayName}</div>
                        )}
                      </td>
                      <td>{formatDate(student.joinedAt)}</td>
                      <td>{formatDate(student.lastLogin)}</td>
                      <td className={styles.centerCell}>
                        <span className={styles.questBadge}>
                          {student.questsCompleted} / 9
                        </span>
                      </td>
                      <td className={styles.centerCell}>
                        {formatTime(student.totalTimeSpentSeconds)}
                      </td>
                      <td className={styles.centerCell}>
                        {student.totalCodeExecutions}
                      </td>
                      <td>
                        <button className={styles.viewButton} disabled title="Coming in Phase 9">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
