import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import Link from 'next/link';
import { Target, FileText, Clock, Play, Save, Award } from 'lucide-react';
import { adminFetch } from '../../../utils/adminFetch';
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
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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

const CHART_COLORS = {
  completed: '#4d7c0f',
  active: '#2563eb',
  available: '#78716c',
  locked: '#a8a29e',
  failed: '#b91c1c',
};

export default function StudentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'quests' | 'code' | 'gamestate'>('dashboard');
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
      const res = await adminFetch('/api/quests/definitions');
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

      const response = await adminFetch(`/api/analytics/student/${id}`);
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
  const studentQuestDefs = useMemo(() => {
    if (!analytics || questDefinitions.length === 0) return [];
    const studentQuestIds = new Set(
      analytics.questProgress.map((qp) => qp.questId)
    );
    return questDefinitions.filter((q) => studentQuestIds.has(q.id));
  }, [analytics, questDefinitions]);

  const completedQuestDefs = useMemo(() => {
    if (!analytics || studentQuestDefs.length === 0) return [];
    const completedIds = new Set(
      analytics.questProgress
        .filter((qp) => qp.state === 'completed')
        .map((qp) => qp.questId)
    );
    return studentQuestDefs.filter((q) => completedIds.has(q.id));
  }, [analytics, studentQuestDefs]);

  const topicMastery = useMemo(
    () => computeTopicMastery(studentQuestDefs, completedQuestDefs),
    [studentQuestDefs, completedQuestDefs]
  );
  const activeTags = useMemo(() => getActiveMasteryTags(topicMastery), [topicMastery]);
  const allMastered = useMemo(() => isFullyMastered(topicMastery), [topicMastery]);

  // Completion rate
  const completionRate = analytics
    ? analytics.questProgress.length > 0
      ? Math.round((analytics.summary.questsCompleted / analytics.questProgress.length) * 100)
      : 0
    : 0;

  // Pie chart data for quest completion
  const pieData = useMemo(() => {
    if (!analytics) return [];
    const states: Record<string, number> = {};
    analytics.questProgress.forEach((qp) => {
      const s = qp.state.toLowerCase();
      states[s] = (states[s] || 0) + 1;
    });
    return Object.entries(states).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CHART_COLORS[name as keyof typeof CHART_COLORS] || '#a8a29e',
    }));
  }, [analytics]);

  // Bar chart data for time per quest (top 8 by time)
  const barData = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.questProgress]
      .filter((qp) => qp.timeSpentSeconds > 0)
      .sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds)
      .slice(0, 8)
      .map((qp) => ({
        name: (qp.questTitle || qp.questId).length > 18
          ? (qp.questTitle || qp.questId).substring(0, 18) + '...'
          : (qp.questTitle || qp.questId),
        minutes: Math.round(qp.timeSpentSeconds / 60),
      }));
  }, [analytics]);

  return (
    <AdminLayout title={analytics?.profile.username || 'Student Details'}>
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/students" className="inline-block text-admin-accent no-underline text-[15px] font-medium mb-5 transition-colors duration-200 hover:text-admin-accent-hover">
            ← Back to Students
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-[60px] px-5 text-admin-text-muted">
            <div className="w-[50px] h-[50px] border-4 border-admin-border border-t-admin-accent rounded-full animate-spin-slow mb-5"></div>
            <p>Loading student analytics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-[30px] text-center text-[#b91c1c]">
            <p className="m-0 mb-[15px] text-base">{error}</p>
            <button onClick={fetchStudentAnalytics} className="bg-[#b91c1c] text-white border-none py-[10px] px-5 rounded-lg text-sm cursor-pointer transition-colors duration-200 hover:bg-[#991b1b]">
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && analytics && (
          <>
            {/* Student Info Card */}
            <div className="bg-admin-card border border-admin-border rounded-xl p-[30px] mb-8 max-tablet:p-5">
              <div className="flex items-start gap-5 mb-8 max-tablet:flex-col">
                <div className="w-[80px] h-[80px] rounded-full bg-admin-accent flex items-center justify-center text-white text-[32px] font-bold flex-shrink-0 max-tablet:w-[60px] max-tablet:h-[60px] max-tablet:text-[24px]">
                  {analytics.profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h1 className="text-[28px] font-bold text-admin-text m-0 mb-[5px] max-tablet:text-[24px]">{analytics.profile.username}</h1>
                  {analytics.profile.displayName && analytics.profile.displayName !== analytics.profile.username && (
                    <p className="text-base text-admin-text-muted m-0 mb-[10px]">{analytics.profile.displayName}</p>
                  )}
                  <div className="flex items-center gap-[10px] flex-wrap text-sm text-admin-text-muted">
                    <span>
                      Session: <Link href={`/admin/sessions/${analytics.profile.sessionCode}/students`} className="text-admin-accent no-underline font-semibold transition-colors duration-200 hover:text-admin-accent-hover">{analytics.profile.sessionCode}</Link>
                    </span>
                    <span className="text-admin-text-faint">•</span>
                    <span>
                      Joined: {formatDate(analytics.profile.joinedAt)}
                    </span>
                    <span className="text-admin-text-faint">•</span>
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
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 text-admin-accent border-blue-200">
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
                  <Target className="text-admin-accent flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-text m-0">{analytics.summary.questsCompleted}</div>
                    <div className="text-xs text-admin-text-muted m-0">Quests Completed</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <FileText className="text-admin-accent flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-text m-0">{analytics.summary.questsActive}</div>
                    <div className="text-xs text-admin-text-muted m-0">Quests Active</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <Clock className="text-admin-accent flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-text m-0">{formatTime(analytics.summary.totalTimeSpentSeconds)}</div>
                    <div className="text-xs text-admin-text-muted m-0">Total Time</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <Play className="text-admin-accent flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-text m-0">{analytics.summary.totalCodeExecutions}</div>
                    <div className="text-xs text-admin-text-muted m-0">Code Runs</div>
                  </div>
                </div>
                <div className="flex items-center gap-[12px]">
                  <Save className="text-admin-accent flex-shrink-0" size={20} />
                  <div>
                    <div className="text-[20px] font-bold text-admin-text m-0">
                      {analytics.summary.lastSaveTime ? '✓' : '✕'}
                    </div>
                    <div className="text-xs text-admin-text-muted m-0">Last Saved</div>
                    {analytics.summary.lastSaveTime && (
                      <div className="text-[10px] text-admin-text-faint mt-[2px]">{getRelativeTime(analytics.summary.lastSaveTime)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-[10px] mb-8 border-b-2 border-admin-border overflow-x-auto max-tablet:gap-[5px]">
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'text-admin-accent border-b-2 border-admin-accent mb-[-2px]'
                    : 'text-admin-text-muted hover:text-admin-text'
                }`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'quests'
                    ? 'text-admin-accent border-b-2 border-admin-accent mb-[-2px]'
                    : 'text-admin-text-muted hover:text-admin-text'
                }`}
                onClick={() => setActiveTab('quests')}
              >
                Quests
              </button>
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'code'
                    ? 'text-admin-accent border-b-2 border-admin-accent mb-[-2px]'
                    : 'text-admin-text-muted hover:text-admin-text'
                }`}
                onClick={() => setActiveTab('code')}
              >
                Code History
              </button>
              <button
                className={`py-[12px] px-5 border-none bg-transparent text-sm font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'gamestate'
                    ? 'text-admin-accent border-b-2 border-admin-accent mb-[-2px]'
                    : 'text-admin-text-muted hover:text-admin-text'
                }`}
                onClick={() => setActiveTab('gamestate')}
              >
                Game State
              </button>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Row 1: Summary stat cards */}
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
                    <div className="bg-admin-card border border-admin-border rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-accent mb-1">{completionRate}%</div>
                      <div className="text-xs text-admin-text-muted font-medium">Completion Rate</div>
                    </div>
                    <div className="bg-admin-card border border-admin-border rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-accent mb-1">{analytics.summary.questsCompleted}</div>
                      <div className="text-xs text-admin-text-muted font-medium">Quests Done</div>
                    </div>
                    <div className="bg-admin-card border border-admin-border rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-accent mb-1">{formatTime(analytics.summary.totalTimeSpentSeconds)}</div>
                      <div className="text-xs text-admin-text-muted font-medium">Total Time</div>
                    </div>
                    <div className="bg-admin-card border border-admin-border rounded-xl p-5 text-center">
                      <div className="text-3xl font-bold text-admin-accent mb-1">{analytics.summary.totalCodeExecutions}</div>
                      <div className="text-xs text-admin-text-muted font-medium">Code Runs</div>
                    </div>
                  </div>

                  {/* Row 2: Charts — PieChart + BarChart */}
                  {analytics.questProgress.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Quest Completion Donut */}
                      <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                        <h3 className="text-base font-bold text-admin-text m-0 mb-4">Quest Status</h3>
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e0', fontSize: 13 }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              iconType="circle"
                              iconSize={8}
                              formatter={(value) => <span style={{ color: '#78716c', fontSize: 12 }}>{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Time Per Quest Bar Chart */}
                      {barData.length > 0 && (
                        <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                          <h3 className="text-base font-bold text-admin-text m-0 mb-4">Time per Quest (min)</h3>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                              <XAxis type="number" tick={{ fontSize: 11, fill: '#78716c' }} />
                              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#78716c' }} />
                              <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e0', fontSize: 13 }}
                                formatter={(value: number) => [`${value} min`, 'Time']}
                              />
                              <Bar dataKey="minutes" fill="#2563eb" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Row 3: Topic Mastery Section */}
                  <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                    <h2 className="text-lg font-bold text-admin-text m-0 mb-4">Topic Mastery</h2>
                    <div className="space-y-4">
                      {topicMastery.filter(tm => tm.totalQuests > 0).map((tm) => {
                        const barColor = tm.level === 'mastered' ? '#4d7c0f'
                          : tm.level === 'in-progress' ? '#2563eb'
                          : '#d5d3ce';
                        return (
                          <div key={tm.topic}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-admin-text">{tm.topic}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${MASTERY_ADMIN_CLASSES[tm.level]}`}>
                                  {tm.level === 'mastered' ? 'MASTERED' : tm.level === 'in-progress' ? 'IN PROGRESS' : 'NOT STARTED'}
                                </span>
                              </div>
                              <span className="text-sm font-bold" style={{ color: barColor }}>{tm.proficiency}%</span>
                            </div>
                            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${tm.proficiency}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[11px] text-admin-text-faint">{tm.completedQuests}/{tm.totalQuests} quests</span>
                              <span className="text-[11px] text-admin-text-faint italic">{TOPIC_DESCRIPTIONS[tm.topic]}</span>
                            </div>
                          </div>
                        );
                      })}
                      {topicMastery.filter(tm => tm.totalQuests > 0).length === 0 && (
                        <p className="text-sm text-admin-text-muted text-center py-4">No quest data available to compute mastery.</p>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Recent Activity */}
                  <div className="bg-admin-card border border-admin-border rounded-xl p-6">
                    <h2 className="text-lg font-bold text-admin-text m-0 mb-4">Recent Quest Activity</h2>
                    {analytics.questProgress.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.questProgress.slice(0, 5).map((qp) => (
                          <div key={qp.questId} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                            <div>
                              <span className="text-sm font-semibold text-admin-text">{qp.questTitle || qp.questId}</span>
                              <div className="text-xs text-admin-text-muted mt-0.5">
                                {qp.state === 'completed' ? `Completed ${formatDate(qp.completedAt)}` : `Started ${formatDate(qp.startedAt)}`}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                              qp.state === 'completed' ? 'bg-lime-50 text-[#4d7c0f]' :
                              qp.state === 'active' ? 'bg-blue-50 text-[#2563eb]' :
                              'bg-stone-100 text-stone-500'
                            }`}>
                              {qp.state}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-admin-text-muted text-center py-4">No quest activity yet.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'quests' && (
                <div className="mb-8">
                  <h2 className="text-[22px] font-bold text-admin-text m-0 mb-5">Quest Progress Details</h2>
                  <QuestProgressChart questProgress={analytics.questProgress} showDetails={true} />
                  {analytics.objectiveProgress.length > 0 && (
                    <div className="mt-8">
                      <h2 className="text-[22px] font-bold text-admin-text m-0 mb-5">Objective Completion Details</h2>
                      <ObjectiveProgressList
                        objectiveProgress={analytics.objectiveProgress}
                        questProgress={analytics.questProgress}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'code' && (
                <div className="mb-8">
                  <h2 className="text-[22px] font-bold text-admin-text m-0 mb-5">Code Execution History</h2>
                  <CodeExecutionViewer
                    codeExecutions={analytics.recentCodeExecutions}
                    compact={false}
                  />
                </div>
              )}

              {activeTab === 'gamestate' && (
                <div className="mb-8">
                  <h2 className="text-[22px] font-bold text-admin-text m-0 mb-5">Game State</h2>
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
