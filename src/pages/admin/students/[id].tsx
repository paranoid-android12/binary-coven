import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import Link from 'next/link';
import { Target, FileText, Clock, Play, Save } from 'lucide-react';
import QuestProgressChart from '../../../components/admin/QuestProgressChart';
import CodeExecutionViewer from '../../../components/admin/CodeExecutionViewer';
import ObjectiveProgressList from '../../../components/admin/ObjectiveProgressList';
import GameStateViewer from '../../../components/admin/GameStateViewer';

interface StudentProfile {
  id: string;
  username: string;
  displayName: string;
  sessionCode: string;
  joinedAt: string;
  lastLogin: string;
}

interface QuestProgress {
  id: string;
  questId: string;
  questTitle: string;
  state: string;
  currentPhaseIndex: number;
  startedAt: string;
  completedAt: string | null;
  timeSpentSeconds: number;
  attempts: number;
  score: number;
}

interface ObjectiveProgress {
  id: string;
  questId: string;
  phaseId: string;
  objectiveIndex: number;
  objectiveDescription: string;
  completedAt: string;
  attempts: number;
  timeSpentSeconds: number;
  hintsUsed: number;
}

interface CodeExecution {
  id: string;
  questId: string;
  phaseId: string;
  codeWindowId: string;
  codeContent: string;
  executionResult: any;
  executedAt: string;
  entityId: string;
  executionDurationMs: number;
}

interface StudentAnalytics {
  profile: StudentProfile;
  summary: {
    questsCompleted: number;
    questsActive: number;
    totalTimeSpentSeconds: number;
    totalCodeExecutions: number;
    lastSaveTime: string | null;
  };
  questProgress: QuestProgress[];
  objectiveProgress: ObjectiveProgress[];
  recentCodeExecutions: CodeExecution[];
  gameState: any;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'quests' | 'objectives' | 'code' | 'gamestate'>('overview');

  useEffect(() => {
    if (id) {
      fetchStudentAnalytics();
    }
  }, [id]);

  const fetchStudentAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/analytics/student/${id}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.message || 'Failed to load student analytics');
      }
    } catch (err) {
      console.error('Error fetching student analytics:', err);
      setError('An error occurred while loading student analytics');
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

  const getRelativeTime = (dateString: string) => {
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
    return formatDate(dateString);
  };

  return (
    <AdminLayout title={analytics?.profile.username || 'Student Details'}>
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/students" className="inline-block text-admin-primary no-underline text-[15px] font-medium mb-5 transition-colors duration-300 ease-in-out hover:text-admin-primary-dark">
            ← Back to Students
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-[#6b7280]">
            <div className="w-[50px] h-[50px] border-4 border-[#e5e7eb] border-t-admin-primary rounded-full animate-spin-slow mb-5"></div>
            <p>Loading student analytics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-[30px] text-center text-[#dc2626]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button onClick={fetchStudentAnalytics} className="bg-[#dc2626] text-white border-none py-[10px] px-5 rounded-lg text-sm font-[family-name:var(--font-family-pixel)] cursor-pointer transition-colors duration-300 ease-in-out hover:bg-[#b91c1c]">
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && analytics && (
          <>
            {/* Student Info Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-[30px] mb-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] max-tablet:p-5">
              <div className="flex items-start gap-5 mb-8 max-tablet:flex-col">
                <div className="w-[80px] h-[80px] rounded-full bg-admin-primary-gradient flex items-center justify-center text-white text-[32px] font-bold flex-shrink-0 max-tablet:w-[60px] max-tablet:h-[60px] max-tablet:text-[24px]">
                  {analytics.profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h1 className="text-[28px] font-bold text-admin-dark m-0 mb-[5px] max-tablet:text-[24px]">{analytics.profile.username}</h1>
                  {analytics.profile.displayName && analytics.profile.displayName !== analytics.profile.username && (
                    <p className="text-base text-[#6b7280] m-0 mb-[10px]">{analytics.profile.displayName}</p>
                  )}
                  <div className="flex items-center gap-[10px] flex-wrap text-sm text-[#6b7280]">
                    <span>
                      Session: <Link href={`/admin/sessions/${analytics.profile.sessionCode}/students`} className="text-admin-primary no-underline font-semibold transition-colors duration-300 ease-in-out hover:text-admin-primary-dark">{analytics.profile.sessionCode}</Link>
                    </span>
                    <span className="text-[#d1d5db]">•</span>
                    <span>
                      Joined: {formatDate(analytics.profile.joinedAt)}
                    </span>
                    <span className="text-[#d1d5db]">•</span>
                    <span>
                      Last active: {getRelativeTime(analytics.profile.lastLogin)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-5 max-tablet:grid-cols-2">
                <div className="flex items-center gap-[12px]">
                  <Target className="text-admin-primary flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-dark m-0">{analytics.summary.questsCompleted}</div>
                    <div className="text-xs text-[#6b7280] m-0">Quests Completed</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <FileText className="text-admin-primary flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-dark m-0">{analytics.summary.questsActive}</div>
                    <div className="text-xs text-[#6b7280] m-0">Quests Active</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <Clock className="text-admin-primary flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-dark m-0">{formatTime(analytics.summary.totalTimeSpentSeconds)}</div>
                    <div className="text-xs text-[#6b7280] m-0">Total Time</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <Play className="text-admin-primary flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-dark m-0">{analytics.summary.totalCodeExecutions}</div>
                    <div className="text-xs text-[#6b7280] m-0">Code Runs</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <Save className="text-admin-primary flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-dark m-0">
                      {analytics.summary.lastSaveTime ? '✓' : '✕'}
                    </div>
                    <div className="text-xs text-[#6b7280] m-0">Last Saved</div>
                    {analytics.summary.lastSaveTime && (
                      <div className="text-[10px] text-[#9ca3af] mt-[2px]">{getRelativeTime(analytics.summary.lastSaveTime)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-[10px] mb-8 border-b-2 border-[#e5e7eb] overflow-x-auto max-tablet:gap-[5px]">
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-300 ease-in-out whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'text-admin-primary border-b-2 border-admin-primary mb-[-2px]'
                    : 'text-[#6b7280] hover:text-admin-dark'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-300 ease-in-out whitespace-nowrap ${
                  activeTab === 'quests'
                    ? 'text-admin-primary border-b-2 border-admin-primary mb-[-2px]'
                    : 'text-[#6b7280] hover:text-admin-dark'
                }`}
                onClick={() => setActiveTab('quests')}
              >
                Quest Progress
              </button>
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-300 ease-in-out whitespace-nowrap ${
                  activeTab === 'objectives'
                    ? 'text-admin-primary border-b-2 border-admin-primary mb-[-2px]'
                    : 'text-[#6b7280] hover:text-admin-dark'
                }`}
                onClick={() => setActiveTab('objectives')}
              >
                Objectives
              </button>
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-300 ease-in-out whitespace-nowrap ${
                  activeTab === 'code'
                    ? 'text-admin-primary border-b-2 border-admin-primary mb-[-2px]'
                    : 'text-[#6b7280] hover:text-admin-dark'
                }`}
                onClick={() => setActiveTab('code')}
              >
                Code History
              </button>
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-300 ease-in-out whitespace-nowrap ${
                  activeTab === 'gamestate'
                    ? 'text-admin-primary border-b-2 border-admin-primary mb-[-2px]'
                    : 'text-[#6b7280] hover:text-admin-dark'
                }`}
                onClick={() => setActiveTab('gamestate')}
              >
                Game State
              </button>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'overview' && (
                <div>
                  <div className="mb-8">
                    <h2 className="text-[22px] font-bold text-admin-dark m-0 mb-5">Quest Progress Summary</h2>
                    <QuestProgressChart questProgress={analytics.questProgress} />
                  </div>

                  <div className="mb-8">
                    <h2 className="text-[22px] font-bold text-admin-dark m-0 mb-5">Recent Code Executions</h2>
                    <CodeExecutionViewer
                      codeExecutions={analytics.recentCodeExecutions.slice(0, 10)}
                      compact={true}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'quests' && (
                <div className="mb-8">
                  <h2 className="text-[22px] font-bold text-admin-dark m-0 mb-5">Quest Progress Details</h2>
                  <QuestProgressChart questProgress={analytics.questProgress} showDetails={true} />
                </div>
              )}

              {activeTab === 'objectives' && (
                <div className="mb-8">
                  <h2 className="text-[22px] font-bold text-admin-dark m-0 mb-5">Objective Completion Details</h2>
                  <ObjectiveProgressList
                    objectiveProgress={analytics.objectiveProgress}
                    questProgress={analytics.questProgress}
                  />
                </div>
              )}

              {activeTab === 'code' && (
                <div className="mb-8">
                  <h2 className="text-[22px] font-bold text-admin-dark m-0 mb-5">Code Execution History</h2>
                  <CodeExecutionViewer
                    codeExecutions={analytics.recentCodeExecutions}
                    compact={false}
                  />
                </div>
              )}

              {activeTab === 'gamestate' && (
                <div className="mb-8">
                  <h2 className="text-[22px] font-bold text-admin-dark m-0 mb-5">Game State</h2>
                  <GameStateViewer gameState={analytics.gameState} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
