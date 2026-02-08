import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import Link from 'next/link';
import { Target, FileText, Clock, Play, Save, Award } from 'lucide-react';
import QuestProgressChart from '../../../components/admin/QuestProgressChart';
import CodeExecutionViewer from '../../../components/admin/CodeExecutionViewer';
import ObjectiveProgressList from '../../../components/admin/ObjectiveProgressList';
import GameStateViewer from '../../../components/admin/GameStateViewer';
import {
  computeTopicMastery,
  getActiveMasteryTags,
  isFullyMastered,
  MASTERY_ADMIN_CLASSES,
  TOPIC_DESCRIPTIONS,
  type TopicMastery,
} from '../../../utils/masteryComputation';
import type { Quest } from '../../../types/quest';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'overview' | 'quests' | 'objectives' | 'code' | 'gamestate'>('profile');
  const [questDefinitions, setQuestDefinitions] = useState<Quest[]>([]);

  useEffect(() => {
    if (id) {
      fetchStudentAnalytics();
      fetchQuestDefinitions();
    }
  }, [id]);

  /** Fetch quest definitions dynamically from API (not hardcoded) */
  const fetchQuestDefinitions = async () => {
    try {
      const res = await fetch('/api/quests/definitions');
      const data = await res.json();
      if (data.success) {
        setQuestDefinitions(data.quests as Quest[]);
      }
    } catch {
      // Silently skip — mastery section will show empty
    }
  };

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

  // Compute mastery from quest definitions + student progress
  const completedQuestDefs = useMemo(() => {
    if (!analytics || questDefinitions.length === 0) return [];
    const completedIds = new Set(
      analytics.questProgress
        .filter((qp) => qp.state === 'completed')
        .map((qp) => qp.questId)
    );
    return questDefinitions.filter((q) => completedIds.has(q.id));
  }, [analytics, questDefinitions]);

  const topicMastery = useMemo(
    () => computeTopicMastery(questDefinitions, completedQuestDefs),
    [questDefinitions, completedQuestDefs]
  );
  const activeTags = useMemo(() => getActiveMasteryTags(topicMastery), [topicMastery]);
  const allMastered = useMemo(() => isFullyMastered(topicMastery), [topicMastery]);

  // Completion rate
  const completionRate = analytics
    ? analytics.questProgress.length > 0
      ? Math.round((analytics.summary.questsCompleted / analytics.questProgress.length) * 100)
      : 0
    : 0;

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
                  {/* Mastery Tags */}
                  {activeTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {activeTags.map((tag) => (
                        <span
                          key={tag.topic}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${MASTERY_ADMIN_CLASSES[tag.level]}`}
                        >
                          {tag.level === 'mastered' ? '✓' : '◐'} {tag.topic}
                        </span>
                      ))}
                      {allMastered && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-700 border-amber-300">
                          <Award size={12} /> All Mastered
                        </span>
                      )}
                    </div>
                  )}
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
                  activeTab === 'profile'
                    ? 'text-admin-primary border-b-2 border-admin-primary mb-[-2px]'
                    : 'text-[#6b7280] hover:text-admin-dark'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
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
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Profile Summary Cards */}
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
                    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-primary mb-1">{completionRate}%</div>
                      <div className="text-xs text-[#6b7280] font-medium">Completion Rate</div>
                    </div>
                    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-primary mb-1">{analytics.summary.questsCompleted}</div>
                      <div className="text-xs text-[#6b7280] font-medium">Quests Done</div>
                    </div>
                    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-primary mb-1">{formatTime(analytics.summary.totalTimeSpentSeconds)}</div>
                      <div className="text-xs text-[#6b7280] font-medium">Total Time</div>
                    </div>
                    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-primary mb-1">{analytics.summary.totalCodeExecutions}</div>
                      <div className="text-xs text-[#6b7280] font-medium">Code Runs</div>
                    </div>
                  </div>

                  {/* Topic Mastery Section */}
                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    <h2 className="text-lg font-bold text-admin-dark m-0 mb-4">Topic Mastery</h2>
                    <div className="space-y-4">
                      {topicMastery.filter(tm => tm.totalQuests > 0).map((tm) => {
                        const barColor = tm.level === 'mastered' ? '#22c55e'
                          : tm.level === 'in-progress' ? '#eab308'
                          : '#d1d5db';
                        return (
                          <div key={tm.topic}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-admin-dark">{tm.topic}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${MASTERY_ADMIN_CLASSES[tm.level]}`}>
                                  {tm.level === 'mastered' ? 'MASTERED' : tm.level === 'in-progress' ? 'IN PROGRESS' : 'NOT STARTED'}
                                </span>
                              </div>
                              <span className="text-sm font-bold" style={{ color: barColor }}>{tm.proficiency}%</span>
                            </div>
                            <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${tm.proficiency}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[11px] text-[#9ca3af]">{tm.completedQuests}/{tm.totalQuests} quests</span>
                              <span className="text-[11px] text-[#9ca3af] italic">{TOPIC_DESCRIPTIONS[tm.topic]}</span>
                            </div>
                          </div>
                        );
                      })}
                      {topicMastery.filter(tm => tm.totalQuests > 0).length === 0 && (
                        <p className="text-sm text-[#6b7280] text-center py-4">No quest data available to compute mastery.</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    <h2 className="text-lg font-bold text-admin-dark m-0 mb-4">Recent Quest Activity</h2>
                    {analytics.questProgress.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.questProgress.slice(0, 5).map((qp) => (
                          <div key={qp.questId} className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg">
                            <div>
                              <span className="text-sm font-semibold text-admin-dark">{qp.questTitle || qp.questId}</span>
                              <div className="text-xs text-[#6b7280] mt-0.5">
                                {qp.state === 'completed' ? `Completed ${formatDate(qp.completedAt)}` : `Started ${formatDate(qp.startedAt)}`}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                              qp.state === 'completed' ? 'bg-green-100 text-green-700' :
                              qp.state === 'active' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {qp.state}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6b7280] text-center py-4">No quest activity yet.</p>
                    )}
                  </div>
                </div>
              )}

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
