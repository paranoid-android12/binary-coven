import { useState } from 'react';
import { Target, ChevronDown, ChevronRight, Calendar, Clock, RotateCcw, Lightbulb } from 'lucide-react';
import styles from '../../styles/admin/ObjectiveProgressList.module.css';

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

interface QuestProgress {
  id: string;
  questId: string;
  questTitle: string;
}

interface ObjectiveProgressListProps {
  objectiveProgress: ObjectiveProgress[];
  questProgress: QuestProgress[];
}

export default function ObjectiveProgressList({ objectiveProgress, questProgress }: ObjectiveProgressListProps) {
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'attempts' | 'completed'>('completed');

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getQuestTitle = (questId: string) => {
    const quest = questProgress.find((q) => q.questId === questId);
    return quest?.questTitle || questId;
  };

  // Group objectives by quest
  const objectivesByQuest = objectiveProgress.reduce((acc, obj) => {
    if (!acc[obj.questId]) {
      acc[obj.questId] = [];
    }
    acc[obj.questId].push(obj);
    return acc;
  }, {} as Record<string, ObjectiveProgress[]>);

  // Sort objectives within each quest
  Object.keys(objectivesByQuest).forEach((questId) => {
    objectivesByQuest[questId].sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return b.timeSpentSeconds - a.timeSpentSeconds;
        case 'attempts':
          return b.attempts - a.attempts;
        case 'completed':
        default:
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      }
    });
  });

  const toggleQuestExpand = (questId: string) => {
    setExpandedQuest(expandedQuest === questId ? null : questId);
  };

  const getTotalStats = () => {
    return {
      totalObjectives: objectiveProgress.length,
      totalTime: objectiveProgress.reduce((sum, obj) => sum + obj.timeSpentSeconds, 0),
      totalAttempts: objectiveProgress.reduce((sum, obj) => sum + obj.attempts, 0),
      totalHints: objectiveProgress.reduce((sum, obj) => sum + obj.hintsUsed, 0),
      avgTime: objectiveProgress.length > 0
        ? Math.floor(objectiveProgress.reduce((sum, obj) => sum + obj.timeSpentSeconds, 0) / objectiveProgress.length)
        : 0,
    };
  };

  const stats = getTotalStats();

  if (objectiveProgress.length === 0) {
    return (
      <div className={styles.empty}>
        <Target className={styles.emptyIcon} size={48} />
        <p className={styles.emptyText}>No objective progress data yet</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Summary Stats */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.totalObjectives}</div>
          <div className={styles.summaryLabel}>Objectives Completed</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{formatTime(stats.totalTime)}</div>
          <div className={styles.summaryLabel}>Total Time</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.totalAttempts}</div>
          <div className={styles.summaryLabel}>Total Attempts</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.totalHints}</div>
          <div className={styles.summaryLabel}>Hints Used</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{formatTime(stats.avgTime)}</div>
          <div className={styles.summaryLabel}>Avg Time/Objective</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className={styles.controls}>
        <div className={styles.sortLabel}>Sort by:</div>
        <div className={styles.sortButtons}>
          <button
            className={`${styles.sortButton} ${sortBy === 'completed' ? styles.sortButtonActive : ''}`}
            onClick={() => setSortBy('completed')}
          >
            Recently Completed
          </button>
          <button
            className={`${styles.sortButton} ${sortBy === 'time' ? styles.sortButtonActive : ''}`}
            onClick={() => setSortBy('time')}
          >
            Time Spent
          </button>
          <button
            className={`${styles.sortButton} ${sortBy === 'attempts' ? styles.sortButtonActive : ''}`}
            onClick={() => setSortBy('attempts')}
          >
            Attempts
          </button>
        </div>
      </div>

      {/* Quest List */}
      <div className={styles.questList}>
        {Object.keys(objectivesByQuest).map((questId) => {
          const objectives = objectivesByQuest[questId];
          const isExpanded = expandedQuest === questId;
          const questTitle = getQuestTitle(questId);

          return (
            <div key={questId} className={styles.questItem}>
              <div className={styles.questHeader} onClick={() => toggleQuestExpand(questId)}>
                {isExpanded ? (
                  <ChevronDown className={styles.expandIcon} size={20} />
                ) : (
                  <ChevronRight className={styles.expandIcon} size={20} />
                )}
                <div className={styles.questInfo}>
                  <h3 className={styles.questTitle}>{questTitle}</h3>
                  <div className={styles.questMeta}>
                    <span className={styles.metaItem}>
                      {objectives.length} objective{objectives.length !== 1 ? 's' : ''}
                    </span>
                    <span className={styles.metaSeparator}>•</span>
                    <span className={styles.metaItem}>
                      {formatTime(objectives.reduce((sum, obj) => sum + obj.timeSpentSeconds, 0))} total
                    </span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.objectiveList}>
                  {objectives.map((objective) => (
                    <div key={objective.id} className={styles.objectiveItem}>
                      <div className={styles.objectiveHeader}>
                        <div className={styles.objectiveIndex}>
                          {objective.objectiveIndex + 1}
                        </div>
                        <div className={styles.objectiveContent}>
                          <div className={styles.objectiveDescription}>
                            {objective.objectiveDescription}
                          </div>
                          <div className={styles.objectiveMeta}>
                            <span className={styles.metaItem}>
                              <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> {formatDate(objective.completedAt)}
                            </span>
                            <span className={styles.metaSeparator}>•</span>
                            <span className={styles.metaItem}>
                              <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} /> {formatTime(objective.timeSpentSeconds)}
                            </span>
                            <span className={styles.metaSeparator}>•</span>
                            <span className={styles.metaItem}>
                              <RotateCcw size={14} style={{ display: 'inline', marginRight: '4px' }} /> {objective.attempts} attempt{objective.attempts !== 1 ? 's' : ''}
                            </span>
                            {objective.hintsUsed > 0 && (
                              <>
                                <span className={styles.metaSeparator}>•</span>
                                <span className={styles.metaItem}>
                                  <Lightbulb size={14} style={{ display: 'inline', marginRight: '4px' }} /> {objective.hintsUsed} hint{objective.hintsUsed !== 1 ? 's' : ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
