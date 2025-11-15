import { BarChart3, CheckCircle, Play, AlertCircle, Circle, Lock } from 'lucide-react';
import styles from '../../styles/admin/QuestProgressChart.module.css';

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

interface QuestProgressChartProps {
  questProgress: QuestProgress[];
  showDetails?: boolean;
}

export default function QuestProgressChart({ questProgress, showDetails = false }: QuestProgressChartProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'completed':
        return '#75ba75';
      case 'active':
        return '#0ec3c9';
      case 'failed':
        return '#ff4444';
      case 'available':
        return '#ffaa00';
      case 'locked':
        return '#666666';
      default:
        return '#888888';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state.toLowerCase()) {
      case 'completed':
        return CheckCircle;
      case 'active':
        return Play;
      case 'failed':
        return AlertCircle;
      case 'available':
        return Circle;
      case 'locked':
        return Lock;
      default:
        return Circle;
    }
  };

  const completedQuests = questProgress.filter((q) => q.state.toLowerCase() === 'completed');
  const activeQuests = questProgress.filter((q) => q.state.toLowerCase() === 'active');
  const totalTime = questProgress.reduce((sum, q) => sum + q.timeSpentSeconds, 0);
  const avgAttempts = questProgress.length > 0
    ? (questProgress.reduce((sum, q) => sum + q.attempts, 0) / questProgress.length).toFixed(1)
    : 0;

  if (questProgress.length === 0) {
    return (
      <div className={styles.empty}>
        <BarChart3 className={styles.emptyIcon} size={48} />
        <p className={styles.emptyText}>No quest progress data yet</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Summary Cards */}
      {!showDetails && (
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{completedQuests.length}</div>
            <div className={styles.summaryLabel}>Completed</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{activeQuests.length}</div>
            <div className={styles.summaryLabel}>In Progress</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{formatTime(totalTime)}</div>
            <div className={styles.summaryLabel}>Total Time</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{avgAttempts}</div>
            <div className={styles.summaryLabel}>Avg Attempts</div>
          </div>
        </div>
      )}

      {/* Quest List */}
      <div className={styles.questList}>
        {questProgress.map((quest) => {
          const IconComponent = getStateIcon(quest.state);
          return (
          <div key={quest.id} className={styles.questItem}>
            <div className={styles.questHeader}>
              <div className={styles.questIconContainer}>
                <IconComponent
                  className={styles.questIcon}
                  size={24}
                  style={{ color: getStateColor(quest.state) }}
                />
                <div
                  className={styles.questStateBadge}
                  style={{ backgroundColor: getStateColor(quest.state) }}
                >
                  {quest.state}
                </div>
              </div>
              <div className={styles.questInfo}>
                <h3 className={styles.questTitle}>{quest.questTitle}</h3>
                <div className={styles.questMeta}>
                  <span className={styles.questMetaItem}>
                    Phase {quest.currentPhaseIndex + 1}
                  </span>
                  <span className={styles.questMetaSeparator}>•</span>
                  <span className={styles.questMetaItem}>
                    {quest.attempts} attempt{quest.attempts !== 1 ? 's' : ''}
                  </span>
                  <span className={styles.questMetaSeparator}>•</span>
                  <span className={styles.questMetaItem}>
                    {formatTime(quest.timeSpentSeconds)}
                  </span>
                  {quest.score > 0 && (
                    <>
                      <span className={styles.questMetaSeparator}>•</span>
                      <span className={styles.questMetaItem}>
                        Score: {quest.score}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {showDetails && (
              <div className={styles.questDetails}>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Started</div>
                    <div className={styles.detailValue}>{formatDate(quest.startedAt)}</div>
                  </div>
                  {quest.completedAt && (
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>Completed</div>
                      <div className={styles.detailValue}>{formatDate(quest.completedAt)}</div>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Time Spent</div>
                    <div className={styles.detailValue}>{formatTime(quest.timeSpentSeconds)}</div>
                  </div>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Attempts</div>
                    <div className={styles.detailValue}>{quest.attempts}</div>
                  </div>
                  {quest.score > 0 && (
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>Score</div>
                      <div className={styles.detailValue}>{quest.score}</div>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Current Phase</div>
                    <div className={styles.detailValue}>Phase {quest.currentPhaseIndex + 1}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}
