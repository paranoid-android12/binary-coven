import React, { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Quest, QuestState } from '../types/quest';

interface StudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TopicProgress {
  name: string;
  folder: string;
  completed: number;
  total: number;
  concepts: string[];
}

interface ClassStats {
  studentName: string;
  questsCompleted: number;
  totalTime: number;
  rank: number;
}

interface QuestExecutionStats {
  questId: string;
  totalAttempts: number;
  successfulRuns: number;
  failedRuns: number;
  avgExecutionTime: number;
}

interface ObjectiveStats {
  objectivesCompleted: number;
  totalTimeSpent: number;
  totalAttempts: number;
  totalHintsUsed: number;
  avgTimePerObjective: number;
}

type TabType = 'progress' | 'insights' | 'class';

export const StudentProgressModal: React.FC<StudentProgressModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [questStats, setQuestStats] = useState<QuestExecutionStats[]>([]);
  const [objectiveStats, setObjectiveStats] = useState<ObjectiveStats | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const gameStore = useGameStore();
  const availableQuests = gameStore.getAvailableQuests();
  const completedQuests = gameStore.getCompletedQuests();
  const activeQuest = gameStore.getActiveQuest();

  // Calculate topic-wise progress
  const getTopicProgress = (): TopicProgress[] => {
    const topics: TopicProgress[] = [
      { name: 'Basic Commands', folder: '1-basic-commands', completed: 0, total: 3, concepts: ['Movement', 'Print statements', 'Sequencing'] },
      { name: 'Variables', folder: '2-variables', completed: 0, total: 5, concepts: ['Variable declaration', 'Numbers', 'Strings', 'Booleans', 'Data types'] },
      { name: 'Conditionals', folder: '3-conditionals', completed: 0, total: 5, concepts: ['If statements', 'Else clauses', 'Elif chains', 'Comparison operators', 'Logical operators'] },
      { name: 'Loops', folder: '4-loops', completed: 0, total: 5, concepts: ['For loops', 'Range function', 'While loops', 'Loop control', 'Iteration'] },
      { name: 'Functions', folder: '5-functions', completed: 0, total: 5, concepts: ['Function definition', 'Parameters', 'Return values', 'Code reuse', 'Abstraction'] },
      { name: 'Lists', folder: '6-lists', completed: 0, total: 5, concepts: ['List creation', 'Indexing', 'Modification', 'Iteration', 'Data structures'] },
    ];

    // Count completed quests per topic
    completedQuests.forEach(quest => {
      const category = quest.category?.toLowerCase();
      if (category?.includes('tutorial') || category?.includes('basic')) {
        topics[0].completed++;
      } else if (category?.includes('variable')) {
        topics[1].completed++;
      } else if (category?.includes('conditional')) {
        topics[2].completed++;
      } else if (category?.includes('loop') || category?.includes('farming')) {
        topics[3].completed++;
      } else if (category?.includes('function') || category?.includes('programming')) {
        topics[4].completed++;
      } else if (category?.includes('list')) {
        topics[5].completed++;
      }
    });

    return topics;
  };

  // Get learning insights based on completed quests
  const getLearningInsights = () => {
    const topics = getTopicProgress();
    const insights: { message: string; type: 'success' | 'suggestion' | 'next' }[] = [];

    topics.forEach((topic, index) => {
      if (topic.completed === topic.total) {
        insights.push({
          message: `🎉 You've mastered ${topic.name}! You now understand: ${topic.concepts.join(', ')}.`,
          type: 'success'
        });
      } else if (topic.completed > 0) {
        insights.push({
          message: `📚 Keep going with ${topic.name}! You've completed ${topic.completed}/${topic.total} quests.`,
          type: 'suggestion'
        });
      }
    });

    // Suggest next topic
    const nextIncomplete = topics.find(t => t.completed < t.total);
    if (nextIncomplete) {
      insights.push({
        message: `💡 Suggested next: Continue with "${nextIncomplete.name}" to learn about ${nextIncomplete.concepts[nextIncomplete.completed] || nextIncomplete.concepts[0]}.`,
        type: 'next'
      });
    }

    return insights;
  };

  // Fetch class statistics
  const fetchClassStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics/class-stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClassStats(data.students || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch class stats:', error);
      // Generate mock data for demo
      setClassStats([
        { studentName: 'You', questsCompleted: completedQuests.length, totalTime: 3600, rank: 1 },
        { studentName: 'Student A', questsCompleted: 12, totalTime: 4500, rank: 2 },
        { studentName: 'Student B', questsCompleted: 10, totalTime: 3800, rank: 3 },
        { studentName: 'Student C', questsCompleted: 8, totalTime: 2900, rank: 4 },
        { studentName: 'Student D', questsCompleted: 5, totalTime: 2100, rank: 5 },
      ]);
    }
    setLoading(false);
  };

  // Fetch quest execution statistics
  const fetchQuestStats = async () => {
    try {
      const response = await fetch('/api/analytics/student-quest-stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuestStats(data.stats || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch quest stats:', error);
    }
  };

  // Fetch objective completion statistics
  const fetchObjectiveStats = async () => {
    try {
      const response = await fetch('/api/analytics/student-objective-stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setObjectiveStats(data.stats || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch objective stats:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuestStats();
      fetchObjectiveStats();
      if (activeTab === 'class') {
        fetchClassStats();
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const topics = getTopicProgress();
  const insights = getLearningInsights();
  const totalCompleted = completedQuests.length;
  const totalQuests = 28;
  const overallProgress = Math.round((totalCompleted / totalQuests) * 100);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Get aggregated stats for a topic by matching quest IDs with folder names
  const getTopicStats = (folder: string) => {
    const topicStats = questStats.filter(stat => stat.questId.includes(folder));
    if (topicStats.length === 0) return null;
    
    return {
      totalAttempts: topicStats.reduce((sum, s) => sum + s.totalAttempts, 0),
      successfulRuns: topicStats.reduce((sum, s) => sum + s.successfulRuns, 0),
      failedRuns: topicStats.reduce((sum, s) => sum + s.failedRuns, 0),
    };
  };

  // Get overall execution statistics
  const getOverallExecutionStats = () => {
    if (questStats.length === 0) return null;
    
    const totalRuns = questStats.reduce((sum, s) => sum + s.totalAttempts, 0);
    const successfulRuns = questStats.reduce((sum, s) => sum + s.successfulRuns, 0);
    const failedRuns = questStats.reduce((sum, s) => sum + s.failedRuns, 0);
    const avgDuration = questStats.reduce((sum, s) => sum + (s.avgExecutionTime * s.totalAttempts), 0) / totalRuns;
    
    return { totalRuns, successfulRuns, failedRuns, avgDuration };
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 4100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Modal Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#2d2d30',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            width: '90vw',
            maxWidth: '900px',
            height: '90vh',
            maxHeight: '750px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#007acc',
              color: 'white',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '24px',
                fontFamily: 'BoldPixels, monospace',
                fontWeight: 'bold',
              }}
            >
              My Progress
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '32px',
                cursor: 'pointer',
                padding: '0 8px',
                lineHeight: '1',
                fontFamily: 'BoldPixels, monospace',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#cccccc')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#252526',
              borderBottom: '1px solid #3c3c3c',
            }}
          >
            <button
              onClick={() => setActiveTab('progress')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: activeTab === 'progress' ? '#007acc' : 'transparent',
                color: activeTab === 'progress' ? 'white' : '#cccccc',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '14px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'progress') e.currentTarget.style.backgroundColor = '#3c3c3c';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'progress') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Progress [{totalCompleted}/{totalQuests}]
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: activeTab === 'insights' ? '#007acc' : 'transparent',
                color: activeTab === 'insights' ? 'white' : '#cccccc',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '14px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'insights') e.currentTarget.style.backgroundColor = '#3c3c3c';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'insights') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Learning Insights
            </button>
            <button
              onClick={() => setActiveTab('class')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: activeTab === 'class' ? '#007acc' : 'transparent',
                color: activeTab === 'class' ? 'white' : '#cccccc',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '14px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'class') e.currentTarget.style.backgroundColor = '#3c3c3c';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'class') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Class Statistics
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Overall Progress Card */}
                <div style={{
                  backgroundColor: '#1e1e1e',
                  border: '2px solid #3c3c3c',
                  borderRadius: '8px',
                  padding: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold', 
                      color: 'white', 
                      margin: 0,
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Overall Progress
                    </h3>
                    <span style={{ 
                      fontSize: '24px', 
                      fontWeight: 'bold', 
                      color: '#7ed321',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      {overallProgress}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '20px',
                    backgroundColor: '#3c3c3c',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${overallProgress}%`,
                      backgroundColor: '#7ed321',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <p style={{ 
                    color: '#cccccc', 
                    fontSize: '14px', 
                    marginTop: '8px', 
                    marginBottom: 0,
                    fontFamily: 'BoldPixels, monospace',
                  }}>
                    {totalCompleted} / {totalQuests} Quests Completed
                  </p>
                </div>

                {/* Code Execution History */}
                {(() => {
                  const execStats = getOverallExecutionStats();
                  if (execStats) {
                    return (
                      <div style={{
                        backgroundColor: '#1e1e1e',
                        border: '2px solid #3c3c3c',
                        borderRadius: '8px',
                        padding: '20px',
                      }}>
                        <h3 style={{ 
                          fontSize: '18px', 
                          fontWeight: 'bold', 
                          color: 'white', 
                          margin: '0 0 16px 0',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          Code Execution History
                        </h3>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(4, 1fr)', 
                          gap: '12px' 
                        }}>
                          {/* Total Runs */}
                          <div style={{
                            backgroundColor: '#252526',
                            border: '1px solid #3c3c3c',
                            borderRadius: '6px',
                            padding: '16px',
                            textAlign: 'center',
                          }}>
                            <div style={{ 
                              fontSize: '32px', 
                              fontWeight: 'bold', 
                              color: '#00c9ff',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {execStats.totalRuns}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#999999',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              TOTAL RUNS
                            </div>
                          </div>

                          {/* Successful */}
                          <div style={{
                            backgroundColor: '#252526',
                            border: '1px solid #3c3c3c',
                            borderRadius: '6px',
                            padding: '16px',
                            textAlign: 'center',
                          }}>
                            <div style={{ 
                              fontSize: '32px', 
                              fontWeight: 'bold', 
                              color: '#7ed321',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {execStats.successfulRuns}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#999999',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              SUCCESSFUL
                            </div>
                          </div>

                          {/* Failed */}
                          <div style={{
                            backgroundColor: '#252526',
                            border: '1px solid #3c3c3c',
                            borderRadius: '6px',
                            padding: '16px',
                            textAlign: 'center',
                          }}>
                            <div style={{ 
                              fontSize: '32px', 
                              fontWeight: 'bold', 
                              color: '#ff6b6b',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {execStats.failedRuns}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#999999',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              FAILED
                            </div>
                          </div>

                          {/* Avg Duration */}
                          <div style={{
                            backgroundColor: '#252526',
                            border: '1px solid #3c3c3c',
                            borderRadius: '6px',
                            padding: '16px',
                            textAlign: 'center',
                          }}>
                            <div style={{ 
                              fontSize: '32px', 
                              fontWeight: 'bold', 
                              color: '#00c9ff',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {isNaN(execStats.avgDuration) ? 'N/A' : `${Math.round(execStats.avgDuration)}ms`}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#999999',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              AVG DURATION
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Topic Progress Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topics.map((topic, index) => (
                    <div key={topic.folder}>
                      {/* Topic Card - Collapsed/Expanded Header */}
                      <div 
                        onClick={() => setExpandedTopic(expandedTopic === topic.folder ? null : topic.folder)}
                        style={{
                          backgroundColor: '#1e1e1e',
                          border: '2px solid #3c3c3c',
                          borderRadius: expandedTopic === topic.folder ? '8px 8px 0 0' : '8px',
                          padding: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: 'scale(1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#252526';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1e1e1e';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              backgroundColor: '#7ed321',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {index + 1}
                            </span>
                            <h4 style={{ 
                              fontWeight: 'bold', 
                              color: 'white', 
                              margin: 0,
                              fontFamily: 'BoldPixels, monospace',
                              fontSize: '14px',
                            }}>
                              {topic.name}
                            </h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              fontSize: '12px',
                              color: topic.completed === topic.total ? '#7ed321' : 
                                     topic.completed > 0 ? '#f5a623' : '#666666',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {topic.completed === topic.total ? '✓ COMPLETE' : 
                               topic.completed > 0 ? 'IN PROGRESS' : 'LOCKED'}
                            </span>
                            <span style={{
                              fontSize: '14px',
                              color: '#cccccc',
                              fontFamily: 'BoldPixels, monospace',
                              transition: 'transform 0.2s ease',
                              transform: expandedTopic === topic.folder ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}>
                              ▼
                            </span>
                          </div>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#3c3c3c',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginBottom: '8px',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(topic.completed / topic.total) * 100}%`,
                            backgroundColor: topic.completed === topic.total ? '#7ed321' : '#007acc',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                        <p style={{ 
                          color: '#888888', 
                          fontSize: '12px', 
                          margin: 0,
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {topic.completed}/{topic.total} quests
                        </p>
                        {(() => {
                          const stats = getTopicStats(topic.folder);
                          if (stats && stats.totalAttempts > 0) {
                            return (
                              <div style={{ 
                                marginTop: '8px', 
                                paddingTop: '8px', 
                                borderTop: '1px solid #3c3c3c',
                                fontSize: '12px',
                                color: '#999999',
                                fontFamily: 'BoldPixels, monospace',
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                  <span>Attempts:</span>
                                  <span style={{ color: '#cccccc', fontWeight: 'bold' }}>{stats.totalAttempts}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                  <span>Success:</span>
                                  <span style={{ color: '#7ed321', fontWeight: 'bold' }}>{stats.successfulRuns}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Failed:</span>
                                  <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{stats.failedRuns}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Expanded Quest List */}
                      {expandedTopic === topic.folder && (
                        <div style={{
                          backgroundColor: '#252526',
                          border: '2px solid #3c3c3c',
                          borderTop: 'none',
                          borderRadius: '0 0 8px 8px',
                          padding: '12px 16px',
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Placeholder for per-quest stats */}
                            <div style={{
                              fontSize: '13px',
                              color: '#999999',
                              fontFamily: 'BoldPixels, monospace',
                              paddingBottom: '8px',
                              borderBottom: '1px solid #3c3c3c',
                              fontWeight: 'bold',
                            }}>
                              Individual Quest Performance
                            </div>
                            {[...Array(Math.min(topic.total, 3))].map((_, qIndex) => (
                              <div key={qIndex} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 0',
                                fontSize: '12px',
                              }}>
                                <span style={{ color: '#cccccc', fontFamily: 'BoldPixels, monospace', fontWeight: 'bold' }}>
                                  {qIndex + 1}. Quest {qIndex + 1}
                                </span>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                                  <span>Attempts: <span style={{ color: '#cccccc', fontWeight: 'bold' }}>--</span></span>
                                  <span>Success: <span style={{ color: '#7ed321', fontWeight: 'bold' }}>--</span></span>
                                  <span>Time: <span style={{ color: '#00c9ff', fontWeight: 'bold' }}>--</span></span>
                                </div>
                              </div>
                            ))}
                            {topic.total > 3 && (
                              <div style={{
                                textAlign: 'center',
                                padding: '10px 0',
                                fontSize: '11px',
                                color: '#666666',
                                fontFamily: 'BoldPixels, monospace',
                              }}>
                                + {topic.total - 3} more quests
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Active Quest */}
                {activeQuest && (
                  <div style={{
                    backgroundColor: '#1e1e1e',
                    border: '2px solid #f5a623',
                    borderRadius: '8px',
                    padding: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        backgroundColor: '#f5a623',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'BoldPixels, monospace',
                      }}>
                        ACTIVE
                      </span>
                    </div>
                    <h4 style={{ 
                      fontWeight: 'bold', 
                      color: 'white', 
                      margin: '0 0 4px 0',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      {activeQuest.title}
                    </h4>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#cccccc', 
                      margin: 0,
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      {activeQuest.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Learning Insights Tab */}
            {activeTab === 'insights' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Objective Completion Stats Section */}
                {objectiveStats && objectiveStats.objectivesCompleted > 0 && (
                  <div style={{
                    backgroundColor: '#1e1e1e',
                    border: '2px solid #3c3c3c',
                    borderRadius: '8px',
                    padding: '20px',
                  }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold', 
                      color: 'white', 
                      margin: '0 0 16px 0',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Objective Completion Details
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(5, 1fr)', 
                      gap: '12px' 
                    }}>
                      {/* Objectives Completed */}
                      <div style={{
                        backgroundColor: '#252526',
                        border: '1px solid #3c3c3c',
                        borderRadius: '6px',
                        padding: '16px',
                        textAlign: 'center',
                      }}>
                        <div style={{ 
                          fontSize: '32px', 
                          fontWeight: 'bold', 
                          color: '#7ed321',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {objectiveStats.objectivesCompleted}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#999999',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          COMPLETED
                        </div>
                      </div>

                      {/* Total Time */}
                      <div style={{
                        backgroundColor: '#252526',
                        border: '1px solid #3c3c3c',
                        borderRadius: '6px',
                        padding: '16px',
                        textAlign: 'center',
                      }}>
                        <div style={{ 
                          fontSize: '32px', 
                          fontWeight: 'bold', 
                          color: '#00c9ff',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {formatTime(objectiveStats.totalTimeSpent)}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#999999',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          TOTAL TIME
                        </div>
                      </div>

                      {/* Total Attempts */}
                      <div style={{
                        backgroundColor: '#252526',
                        border: '1px solid #3c3c3c',
                        borderRadius: '6px',
                        padding: '16px',
                        textAlign: 'center',
                      }}>
                        <div style={{ 
                          fontSize: '32px', 
                          fontWeight: 'bold', 
                          color: '#f5a623',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {objectiveStats.totalAttempts}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#999999',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          ATTEMPTS
                        </div>
                      </div>

                      {/* Hints Used */}
                      <div style={{
                        backgroundColor: '#252526',
                        border: '1px solid #3c3c3c',
                        borderRadius: '6px',
                        padding: '16px',
                        textAlign: 'center',
                      }}>
                        <div style={{ 
                          fontSize: '32px', 
                          fontWeight: 'bold', 
                          color: '#b19cd9',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {objectiveStats.totalHintsUsed}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#999999',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          HINTS USED
                        </div>
                      </div>

                      {/* Avg Time Per Objective */}
                      <div style={{
                        backgroundColor: '#252526',
                        border: '1px solid #3c3c3c',
                        borderRadius: '6px',
                        padding: '16px',
                        textAlign: 'center',
                      }}>
                        <div style={{ 
                          fontSize: '32px', 
                          fontWeight: 'bold', 
                          color: '#00c9ff',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {formatTime(objectiveStats.avgTimePerObjective)}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#999999',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          AVG TIME
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Learning Progress Messages */}
                {insights.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ 
                      color: '#666666', 
                      fontSize: '16px',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Complete quests to unlock learning insights!
                    </p>
                    <p style={{ 
                      color: '#555555', 
                      fontSize: '14px', 
                      marginTop: '8px',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Start with the Tutorial to get started.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: 'white',
                      marginBottom: '12px',
                      margin: '0 0 12px 0',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Learning Progress
                    </h3>
                    {insights.map((insight, index) => (
                      <div 
                        key={index}
                        style={{
                          backgroundColor: '#1e1e1e',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: insight.type === 'success' ? '#7ed321' : 
                                      insight.type === 'next' ? '#007acc' : '#f5a623',
                        }}
                      >
                        <p style={{ 
                          color: 'white', 
                          margin: 0,
                          fontFamily: 'BoldPixels, monospace',
                          fontSize: '14px',
                          lineHeight: '1.5',
                        }}>
                          {insight.message}
                        </p>
                      </div>
                    ))}

                    {/* Concepts Learned Section */}
                    {completedQuests.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <h3 style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: 'white',
                          marginBottom: '12px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          Concepts Mastered
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {topics
                            .filter(t => t.completed > 0)
                            .flatMap(t => t.concepts.slice(0, t.completed))
                            .map((concept, index) => (
                              <span 
                                key={index}
                                style={{
                                  padding: '6px 14px',
                                  backgroundColor: '#2d5016',
                                  color: '#7ed321',
                                  fontSize: '12px',
                                  borderRadius: '20px',
                                  fontFamily: 'BoldPixels, monospace',
                                  textTransform: 'uppercase',
                                  border: '1px solid #7ed321',
                                }}
                              >
                                🟢 {concept}
                              </span>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Class Statistics Tab */}
            {activeTab === 'class' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ 
                      color: '#cccccc',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Loading class statistics...
                    </p>
                  </div>
                ) : classStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ 
                      color: '#666666',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      No class statistics available yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      backgroundColor: '#1e1e1e',
                      borderRadius: '8px',
                      border: '2px solid #3c3c3c',
                      overflow: 'hidden',
                    }}>
                      {/* Table Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 100px 100px',
                        gap: '16px',
                        padding: '12px 16px',
                        borderBottom: '1px solid #3c3c3c',
                        backgroundColor: '#252526',
                      }}>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Rank</span>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Student</span>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Quests</span>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Time</span>
                      </div>
                      {/* Table Rows */}
                      {classStats.map((student, index) => (
                        <div 
                          key={index}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 1fr 100px 100px',
                            gap: '16px',
                            padding: '12px 16px',
                            borderBottom: index < classStats.length - 1 ? '1px solid #3c3c3c' : 'none',
                            backgroundColor: student.studentName === 'You' ? 'rgba(0, 122, 204, 0.2)' : 'transparent',
                          }}
                        >
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: 'white',
                            fontFamily: 'BoldPixels, monospace',
                            fontSize: '16px',
                          }}>
                            {student.rank <= 3 ? ['🥇', '🥈', '🥉'][student.rank - 1] : `#${student.rank}`}
                          </span>
                          <span style={{
                            color: student.studentName === 'You' ? '#007acc' : 'white',
                            fontWeight: student.studentName === 'You' ? 'bold' : 'normal',
                            fontFamily: 'BoldPixels, monospace',
                          }}>
                            {student.studentName}
                          </span>
                          <span style={{ 
                            color: '#cccccc',
                            fontFamily: 'BoldPixels, monospace',
                          }}>
                            {student.questsCompleted}
                          </span>
                          <span style={{ 
                            color: '#cccccc',
                            fontFamily: 'BoldPixels, monospace',
                          }}>
                            {formatTime(student.totalTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p style={{
                      color: '#666666',
                      fontSize: '12px',
                      textAlign: 'center',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Statistics are updated periodically. Keep learning to climb the ranks!
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #3c3c3c',
            backgroundColor: '#252526',
          }}>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#007acc',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '16px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007acc'}
            >
              Continue Learning
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentProgressModal;
