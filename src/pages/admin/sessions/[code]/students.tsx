import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, CheckCircle, Zap, Clock } from 'lucide-react';
import { adminFetch } from '../../../../utils/adminFetch';
import StudentProgressCard from '../../../../components/admin/StudentProgressCard';
import type { Quest } from '../../../../types/quest';

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
  questProgress: { questId: string; state: string }[];
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
  const [questDefinitions, setQuestDefinitions] = useState<Quest[]>([]);

  useEffect(() => {
    if (code) {
      fetchStudents();
      fetchQuestDefinitions();
    }
  }, [code]);

  const fetchQuestDefinitions = async () => {
    try {
      const res = await adminFetch('/api/quests/definitions');
      const data = await res.json();
      if (data.success) {
        setQuestDefinitions(data.quests as Quest[]);
      }
    } catch {
      // Silently skip
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await adminFetch(`/api/session-codes/${code}/students`);
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
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/sessions" className="inline-block text-admin-accent no-underline text-[15px] font-medium mb-5 transition-colors duration-300 ease-in-out hover:text-admin-accent-hover">
            ← Back to Sessions
          </Link>

          {sessionCode && (
            <div>
              <h1 className="text-[28px] font-bold text-admin-text m-0 mb-[10px] max-tablet:text-[24px]">
                Session Code: <span className="text-admin-accent">{sessionCode.code}</span>
              </h1>
              <p className="text-[15px] text-admin-text-muted m-0">
                Valid until: {formatDate(sessionCode.validityEnd)}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-admin-text-muted">
            <div className="w-[50px] h-[50px] border-4 border-[#e5e7eb] border-t-admin-accent rounded-full animate-spin-slow mb-5"></div>
            <p>Loading students...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-[#fecaca] rounded-xl p-[30px] text-center text-[#b91c1c]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button onClick={fetchStudents} className="bg-[#b91c1c] text-white border-none py-[10px] px-5 rounded-lg text-sm font-[family-name:var(--font-family-admin)] cursor-pointer transition-colors duration-300 ease-in-out hover:bg-[#991b1b]">
              Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-admin-card border border-admin-border rounded-xl py-[50px] px-10 text-center max-tablet:py-[30px] max-tablet:px-5">
            <h3 className="text-xl font-bold text-admin-text m-0 mb-[10px]">No students yet</h3>
            <p className="text-[15px] text-admin-text-muted m-0">
              No students have registered with this session code
            </p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-8 max-laptop:grid-cols-2 max-tablet:grid-cols-1">
              <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-admin-border-hover">
                <Users className="text-admin-accent flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-accent m-0 mb-[5px]">{students.length}</h3>
                  <p className="text-xs text-admin-text-muted m-0 font-medium">Total Students</p>
                </div>
              </div>

              <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-admin-border-hover">
                <CheckCircle className="text-admin-accent flex-shrink-0" size={10} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-accent m-0 mb-[5px]">
                    {students.reduce((sum, s) => sum + s.questsCompleted, 0)}
                  </h3>
                  <p className="text-xs text-admin-text-muted m-0 font-medium">Quests Completed</p>
                </div>
              </div>

              <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-admin-border-hover">
                <Zap className="text-admin-accent flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-accent m-0 mb-[5px]">
                    {students.reduce((sum, s) => sum + s.totalCodeExecutions, 0)}
                  </h3>
                  <p className="text-xs text-admin-text-muted m-0 font-medium">Code Executions</p>
                </div>
              </div>

              <div className="bg-admin-card border border-admin-border rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-admin-border-hover">
                <Clock className="text-admin-accent flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-accent m-0 mb-[5px]">
                    {formatTime(students.reduce((sum, s) => sum + s.totalTimeSpentSeconds, 0))}
                  </h3>
                  <p className="text-xs text-admin-text-muted m-0 font-medium">Total Time</p>
                </div>
              </div>
            </div>

            {/* Student Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {students.map((student) => (
                <StudentProgressCard
                  key={student.id}
                  student={student}
                  questDefinitions={questDefinitions}
                  formatTime={formatTime}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
