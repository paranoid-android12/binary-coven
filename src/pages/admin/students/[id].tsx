import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import Link from 'next/link';
import { Target, FileText, Clock, Play, Save } from 'lucide-react';
import QuestProgressChart from '../../../components/admin/QuestProgressChart';
import CodeExecutionViewer from '../../../components/admin/CodeExecutionViewer';
import ObjectiveProgressList from '../../../components/admin/ObjectiveProgressList';
import GameStateViewer from '../../../components/admin/GameStateViewer';
import styles from '../../../styles/admin/StudentDetail.module.css';

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
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/admin/students" className={styles.backButton}>
            ← Back to Students
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading student analytics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={fetchStudentAnalytics} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && analytics && (
          <>
            {/* Student Info Card */}
            <div className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <div className={styles.avatar}>
                  {analytics.profile.username.charAt(0).toUpperCase()}
                </div>
                <div className={styles.infoText}>
                  <h1 className={styles.studentName}>{analytics.profile.username}</h1>
                  {analytics.profile.displayName && analytics.profile.displayName !== analytics.profile.username && (
                    <p className={styles.displayName}>{analytics.profile.displayName}</p>
                  )}
                  <div className={styles.metadata}>
                    <span className={styles.metaItem}>
                      Session: <Link href={`/admin/sessions/${analytics.profile.sessionCode}/students`} className={styles.sessionLink}>{analytics.profile.sessionCode}</Link>
                    </span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.metaItem}>
                      Joined: {formatDate(analytics.profile.joinedAt)}
                    </span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.metaItem}>
                      Last active: {getRelativeTime(analytics.profile.lastLogin)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className={styles.summaryStats}>
                <div className={styles.summaryItem}>
                  <Target className={styles.summaryIcon} size={10} />
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryValue}>{analytics.summary.questsCompleted}</div>
                    <div className={styles.summaryLabel}>Quests Completed</div>
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <FileText className={styles.summaryIcon} size={20} />
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryValue}>{analytics.summary.questsActive}</div>
                    <div className={styles.summaryLabel}>Quests Active</div>
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <Clock className={styles.summaryIcon} size={20} />
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryValue}>{formatTime(analytics.summary.totalTimeSpentSeconds)}</div>
                    <div className={styles.summaryLabel}>Total Time</div>
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <Play className={styles.summaryIcon} size={20} />
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryValue}>{analytics.summary.totalCodeExecutions}</div>
                    <div className={styles.summaryLabel}>Code Runs</div>
                  </div>
                </div>
                <div className={styles.summaryItem}>
                  <Save className={styles.summaryIcon} size={20} />
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryValue}>
                      {analytics.summary.lastSaveTime ? '✓' : '✕'}
                    </div>
                    <div className={styles.summaryLabel}>Last Saved</div>
                    {analytics.summary.lastSaveTime && (
                      <div className={styles.summaryNote}>{getRelativeTime(analytics.summary.lastSaveTime)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'overview' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'quests' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('quests')}
              >
                Quest Progress
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'objectives' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('objectives')}
              >
                Objectives
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'code' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('code')}
              >
                Code History
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'gamestate' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('gamestate')}
              >
                Game State
              </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
              {activeTab === 'overview' && (
                <div className={styles.overviewContent}>
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Quest Progress Summary</h2>
                    <QuestProgressChart questProgress={analytics.questProgress} />
                  </div>

                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Recent Code Executions</h2>
                    <CodeExecutionViewer
                      codeExecutions={analytics.recentCodeExecutions.slice(0, 10)}
                      compact={true}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'quests' && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Quest Progress Details</h2>
                  <QuestProgressChart questProgress={analytics.questProgress} showDetails={true} />
                </div>
              )}

              {activeTab === 'objectives' && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Objective Completion Details</h2>
                  <ObjectiveProgressList
                    objectiveProgress={analytics.objectiveProgress}
                    questProgress={analytics.questProgress}
                  />
                </div>
              )}

              {activeTab === 'code' && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Code Execution History</h2>
                  <CodeExecutionViewer
                    codeExecutions={analytics.recentCodeExecutions}
                    compact={false}
                  />
                </div>
              )}

              {activeTab === 'gamestate' && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Game State</h2>
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
