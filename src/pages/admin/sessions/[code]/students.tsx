import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/admin/AdminLayout';
import Link from 'next/link';
import { Users, CheckCircle, Zap, Clock } from 'lucide-react';

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
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/sessions" className="inline-block text-admin-primary no-underline text-[15px] font-medium mb-5 transition-colors duration-300 ease-in-out hover:text-admin-primary-dark">
            ← Back to Sessions
          </Link>

          {sessionCode && (
            <div>
              <h1 className="text-[28px] font-bold text-admin-dark m-0 mb-[10px] max-tablet:text-[24px]">
                Session Code: <span className="text-admin-primary">{sessionCode.code}</span>
              </h1>
              <p className="text-[15px] text-[#6b7280] m-0">
                Valid until: {formatDate(sessionCode.validityEnd)}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-[#6b7280]">
            <div className="w-[50px] h-[50px] border-4 border-[#e5e7eb] border-t-admin-primary rounded-full animate-spin-slow mb-5"></div>
            <p>Loading students...</p>
          </div>
        ) : error ? (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-[30px] text-center text-[#dc2626]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button onClick={fetchStudents} className="bg-[#dc2626] text-white border-none py-[10px] px-5 rounded-lg text-sm font-[family-name:var(--font-family-pixel)] cursor-pointer transition-colors duration-300 ease-in-out hover:bg-[#b91c1c]">
              Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl py-[50px] px-10 text-center max-tablet:py-[30px] max-tablet:px-5">
            <h3 className="text-xl font-bold text-admin-dark m-0 mb-[10px]">No students yet</h3>
            <p className="text-[15px] text-[#6b7280] m-0">
              No students have registered with this session code
            </p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-8 max-laptop:grid-cols-2 max-tablet:grid-cols-1">
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <Users className="text-admin-primary flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">{students.length}</h3>
                  <p className="text-xs text-[#6b7280] m-0 font-medium">Total Students</p>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <CheckCircle className="text-admin-primary flex-shrink-0" size={10} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">
                    {students.reduce((sum, s) => sum + s.questsCompleted, 0)}
                  </h3>
                  <p className="text-xs text-[#6b7280] m-0 font-medium">Quests Completed</p>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <Zap className="text-admin-primary flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">
                    {students.reduce((sum, s) => sum + s.totalCodeExecutions, 0)}
                  </h3>
                  <p className="text-xs text-[#6b7280] m-0 font-medium">Code Executions</p>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex items-center gap-[15px] transition-all duration-300 ease-in-out shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                <Clock className="text-admin-primary flex-shrink-0" size={17} />
                <div className="flex-1">
                  <h3 className="text-[24px] font-bold text-admin-primary m-0 mb-[5px]">
                    {formatTime(students.reduce((sum, s) => sum + s.totalTimeSpentSeconds, 0))}
                  </h3>
                  <p className="text-xs text-[#6b7280] m-0 font-medium">Total Time</p>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] max-tablet:overflow-x-auto">
              <table className="w-full border-collapse max-tablet:min-w-[700px]">
                <thead>
                  <tr className="bg-[#f9fafb] border-b-2 border-[#e5e7eb]">
                    <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Username</th>
                    <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Joined</th>
                    <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Last Login</th>
                    <th className="p-[15px_20px] text-center text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Quests</th>
                    <th className="p-[15px_20px] text-center text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Time Spent</th>
                    <th className="p-[15px_20px] text-center text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Executions</th>
                    <th className="p-[15px_20px] text-left text-[13px] font-bold text-[#374151] uppercase tracking-[0.5px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-[#e5e7eb] last:border-b-0 transition-colors duration-200 ease-in-out hover:bg-[#f9fafb]">
                      <td className="p-[15px_20px] text-sm text-[#374151]">
                        <div className="font-semibold text-admin-dark">{student.username}</div>
                        {student.displayName && (
                          <div className="text-xs text-[#9ca3af] mt-[3px]">{student.displayName}</div>
                        )}
                      </td>
                      <td className="p-[15px_20px] text-sm text-[#374151]">{formatDate(student.joinedAt)}</td>
                      <td className="p-[15px_20px] text-sm text-[#374151]">{formatDate(student.lastLogin)}</td>
                      <td className="p-[15px_20px] text-center text-sm text-[#374151]">
                        <span className="bg-admin-primary text-white py-1 px-3 rounded-xl text-xs font-bold">
                          {student.questsCompleted} / 9
                        </span>
                      </td>
                      <td className="p-[15px_20px] text-center text-sm text-[#374151] font-medium">
                        {formatTime(student.totalTimeSpentSeconds)}
                      </td>
                      <td className="p-[15px_20px] text-center text-sm text-[#374151] font-medium">
                        {student.totalCodeExecutions}
                      </td>
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
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
