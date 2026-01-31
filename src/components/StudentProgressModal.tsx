import React, { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { EventBus } from '../game/EventBus';
import { Quest } from '../types/quest';

interface StudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [expandedQuestStats, setExpandedQuestStats] = useState<string | null>(null); // Track which quest stats are expanded
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Force re-render on quest completion
  const [classStatsError, setClassStatsError] = useState<string | null>(null); // Error message for class stats
  
  // Store queries will be done fresh during render for dynamic updates

  // Organize quests by category
  const getOrganizedQuests = (avQuests: Quest[], completedQuests: Quest[] = []): { [category: string]: Quest[] } => {
    const organized: { [category: string]: Quest[] } = {};

    // Group quests by their actual category from the JSON file
    avQuests.forEach(quest => {
      const category = quest.category || 'Other';
      if (!organized[category]) {
        organized[category] = [];
      }
      organized[category].push(quest);
    });

    // Sort each category: completed quests first, then available
    Object.keys(organized).forEach(category => {
      organized[category].sort((a, b) => {
        const aCompleted = completedQuests.some(cq => cq.id === a.id);
        const bCompleted = completedQuests.some(cq => cq.id === b.id);
        if (aCompleted && !bCompleted) return -1;
        if (!aCompleted && bCompleted) return 1;
        return 0;
      });
    });

    return organized;
  };

  // Get learning insights based on completed quests
  const getLearningInsights = (avQuests: Quest[], compQuests: Quest[]) => {
    const organized = getOrganizedQuests(avQuests, compQuests);
    const insights: { message: string; type: 'success' | 'suggestion' | 'next' }[] = [];

    Object.keys(organized).forEach((category) => {
      const quests = organized[category];
      const completedCount = quests.filter(q => compQuests.some(cq => cq.id === q.id)).length;
      
      if (completedCount === quests.length && quests.length > 0) {
        insights.push({
          message: `You've mastered ${category}! Great progress on all ${quests.length} quests.`,
          type: 'success'
        });
      } else if (completedCount > 0) {
        insights.push({
          message: `Keep going with ${category}! You've completed ${completedCount}/${quests.length} quests.`,
          type: 'suggestion'
        });
      }
    });

    // Suggest next incomplete category
    const nextIncomplete = Object.keys(organized).find(cat => {
      const quests = organized[cat];
      const completedCount = quests.filter(q => compQuests.some(cq => cq.id === q.id)).length;
      return completedCount < quests.length;
    });
    
    if (nextIncomplete) {
      insights.push({
        message: `Suggested next: Continue with "${nextIncomplete}" to keep learning!`,
        type: 'next'
      });
    }

    return insights;
  };

  // Fetch class statistics
  const fetchClassStats = async (completedCount: number) => {
    setLoading(true);
    setClassStatsError(null);
    
    try {
      const response = await fetch('/api/analytics/class-stats');
      const data = await response.json();
      
      if (response.ok && data.success) {
        // If no students returned, show only "You"
        const students = data.students || [];
        
        // Filter out any existing "You" entry to prevent duplicates
        const filteredStudents = students.filter((s: ClassStats) => s.studentName !== 'You');
        
        // Add "You" with current progress
        const allStudents = [
          ...filteredStudents,
          { studentName: 'You', questsCompleted: completedCount, totalTime: 1440, rank: 0 }
        ];
        
        // Re-sort by quests completed (descending) and assign ranks
        allStudents.sort((a, b) => b.questsCompleted - a.questsCompleted);
        allStudents.forEach((student, index) => {
          student.rank = index + 1;
        });
        
        setClassStats(allStudents);
        setClassStatsError(null);
      } else {
        // API returned an error
        setClassStatsError(data.message || 'Failed to fetch class statistics');
        setClassStats([]);
      }
    } catch (error) {
      console.error('[StudentProgressModal] Failed to fetch class stats from API:', error);
      setClassStatsError(error instanceof Error ? error.message : 'Network error - unable to fetch class statistics');
      setClassStats([]);
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
    }
  }, [isOpen, refreshTrigger]);

  // Subscribe to quest completion events to refresh data
  useEffect(() => {
    const handleQuestComplete = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    EventBus.on('quest-completed', handleQuestComplete);

    return () => {
      EventBus.off('quest-completed', handleQuestComplete);
    };
  }, []);

  // Call store selectors to get fresh data (ensures dynamic updates on each render)
  // IMPORTANT: These hooks MUST be called before any conditional returns!
  const allLoadedQuests = useGameStore((state) => state.getAllLoadedQuests()); // All quests, including completed
  const allCompletedQuests = useGameStore((state) => state.getCompletedQuests());
  const currentActiveQuest = useGameStore((state) => state.getActiveQuest());
  const getQuestProgress = useGameStore((state) => state.getQuestProgress);

  // Fetch class stats when tab is active - needs to be after store hooks so we have completed count
  // Only fetch when we have loaded quests (to ensure data is ready)
  useEffect(() => {
    if (isOpen && activeTab === 'class' && allLoadedQuests.length > 0) {
      fetchClassStats(allCompletedQuests.length);
    }
  }, [isOpen, activeTab, allCompletedQuests.length, allLoadedQuests.length]);

  if (!isOpen) return null;

  const insights = getLearningInsights(allLoadedQuests, allCompletedQuests);
  const totalCompleted = allCompletedQuests.length;
  const totalQuests = allLoadedQuests.length;
  const overallProgress = totalQuests > 0 ? Math.round((totalCompleted / totalQuests) * 100) : 0;

  // Helper to format timestamps
  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to calculate time spent
  const formatTimeSpent = (startedAt?: number, completedAt?: number) => {
    if (!startedAt) return '-';
    const endTime = completedAt || Date.now();
    const minutes = Math.floor((endTime - startedAt) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

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
            maxWidth: '1000px',
            height: '90vh',
            maxHeight: '800px',
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
                fontSize: '28px',
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
                fontSize: '16px',
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
                fontSize: '16px',
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
                fontSize: '16px',
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
                      fontSize: '20px', 
                      fontWeight: 'bold', 
                      color: 'white', 
                      margin: 0,
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Overall Progress
                    </h3>
                    <span style={{ 
                      fontSize: '28px', 
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
                    fontSize: '16px', 
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
                          fontSize: '20px', 
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
                              fontSize: '36px', 
                              fontWeight: 'bold', 
                              color: '#00c9ff',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {execStats.totalRuns}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
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
                              fontSize: '36px', 
                              fontWeight: 'bold', 
                              color: '#7ed321',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {execStats.successfulRuns}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
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
                              fontSize: '36px', 
                              fontWeight: 'bold', 
                              color: '#ff6b6b',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {execStats.failedRuns}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
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
                              fontSize: '36px', 
                              fontWeight: 'bold', 
                              color: '#00c9ff',
                              marginBottom: '4px',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {isNaN(execStats.avgDuration) ? 'N/A' : `${Math.round(execStats.avgDuration)}ms`}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
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

                {/* Organized Quests by Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: 'white', 
                    margin: '8px 0 0 0',
                    fontFamily: 'BoldPixels, monospace',
                  }}>
                    Quests
                  </h3>
                  {(() => {
                    const organized = getOrganizedQuests(allLoadedQuests, allCompletedQuests);
                    const categories = Object.keys(organized).filter(cat => organized[cat].length > 0);
                    
                    return categories.length > 0 ? (
                      categories.map((category, catIndex) => {
                        const quests = organized[category];
                        const completedInCategory = quests.filter(q => allCompletedQuests.some(cq => cq.id === q.id)).length;
                        const categoryKey = `category-${category}`;

                        return (
                          <div key={category}>
                            {/* Category Header - Expandable */}
                            <div 
                              onClick={() => setExpandedTopic(expandedTopic === categoryKey ? null : categoryKey)}
                              style={{
                                backgroundColor: '#1e1e1e',
                                border: '2px solid #3c3c3c',
                                borderRadius: expandedTopic === categoryKey ? '8px 8px 0 0' : '8px',
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
                                    fontSize: '14px',
                                    fontFamily: 'BoldPixels, monospace',
                                  }}>
                                    {catIndex + 1}
                                  </span>
                                  <h4 style={{ 
                                    fontWeight: 'bold', 
                                    color: 'white', 
                                    margin: 0,
                                    fontFamily: 'BoldPixels, monospace',
                                    fontSize: '16px',
                                  }}>
                                    {category}
                                  </h4>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{
                                    fontSize: '14px',
                                    color: completedInCategory === quests.length ? '#7ed321' : 
                                           completedInCategory > 0 ? '#f5a623' : '#666666',
                                    fontFamily: 'BoldPixels, monospace',
                                  }}>
                                    {completedInCategory === quests.length ? 'COMPLETE' : 
                                     completedInCategory > 0 ? 'IN PROGRESS' : 'NOT STARTED'}
                                  </span>
                                  <span style={{
                                    fontSize: '14px',
                                    color: '#cccccc',
                                    fontFamily: 'BoldPixels, monospace',
                                    transition: 'transform 0.2s ease',
                                    transform: expandedTopic === categoryKey ? 'rotate(180deg)' : 'rotate(0deg)',
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
                                  width: `${(completedInCategory / quests.length) * 100}%`,
                                  backgroundColor: completedInCategory === quests.length ? '#7ed321' : '#007acc',
                                  borderRadius: '4px',
                                  transition: 'width 0.5s ease',
                                }} />
                              </div>
                              <p style={{ 
                                color: '#888888', 
                                fontSize: '14px', 
                                margin: 0,
                                fontFamily: 'BoldPixels, monospace',
                              }}>
                                {completedInCategory}/{quests.length} quests completed
                              </p>
                            </div>

                            {/* Expanded Quest List */}
                            {expandedTopic === categoryKey && (
                              <div style={{
                                backgroundColor: '#252526',
                                border: '2px solid #3c3c3c',
                                borderTop: 'none',
                                borderRadius: '0 0 8px 8px',
                                padding: '12px 16px',
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {quests.map((quest, questIndex) => {
                                    const isCompleted = allCompletedQuests.some(q => q.id === quest.id);
                                    const isActive = currentActiveQuest?.id === quest.id;
                                    const questStat = questStats.find(s => s.questId === quest.id);
                                    const questProgress = getQuestProgress(quest.id);

                                    let statusColor = '#00c9ff';
                                    let statusLabel = 'AVAILABLE';

                                    if (isActive) {
                                      statusColor = '#f5a623';
                                      statusLabel = 'ACTIVE';
                                    } else if (isCompleted) {
                                      statusColor = '#7ed321';
                                      statusLabel = 'COMPLETED';
                                    }

                                    // Determine if card should be expandable (has stats OR has progress)
                                    const hasExpandableContent = (questStat && questStat.totalAttempts > 0) || questProgress;

                                    return (
                                      <div 
                                        key={quest.id} 
                                        onClick={() => {
                                          if (hasExpandableContent) {
                                            setExpandedQuestStats(expandedQuestStats === quest.id ? null : quest.id);
                                          }
                                        }}
                                        style={{
                                          backgroundColor: '#1e1e1e',
                                          border: `1px solid ${statusColor}`,
                                          borderRadius: '6px',
                                          padding: '12px',
                                          cursor: questStat && questStat.totalAttempts > 0 ? 'pointer' : 'default',
                                          transition: 'background-color 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (hasExpandableContent) {
                                            e.currentTarget.style.backgroundColor = '#2a2a2a';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = '#1e1e1e';
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                                            <span style={{
                                              display: 'inline-block',
                                              padding: '4px 8px',
                                              backgroundColor: statusColor,
                                              color: 'white',
                                              borderRadius: '4px',
                                              fontSize: '12px',
                                              fontFamily: 'BoldPixels, monospace',
                                              fontWeight: 'bold',
                                              minWidth: '80px',
                                              textAlign: 'center',
                                              marginTop: '2px',
                                              whiteSpace: 'nowrap',
                                            }}>
                                              {statusLabel}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                              <h5 style={{ 
                                                fontWeight: 'bold', 
                                                color: 'white', 
                                                margin: '0 0 3px 0',
                                                fontFamily: 'BoldPixels, monospace',
                                                fontSize: '15px',
                                              }}>
                                                {quest.title}
                                              </h5>
                                              {quest.description && (
                                                <p style={{
                                                  color: '#888888',
                                                  fontSize: '13px',
                                                  margin: 0,
                                                  fontFamily: 'BoldPixels, monospace',
                                                }}>
                                                  {quest.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          {/* Expand/Collapse indicator */}
                                          {hasExpandableContent && (
                                            <span style={{
                                              color: '#888888',
                                              fontSize: '12px',
                                              transition: 'transform 0.2s ease',
                                              transform: expandedQuestStats === quest.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                            }}>
                                              ▼
                                            </span>
                                          )}
                                        </div>

                                        {/* Quest Progress Details - Collapsible */}
                                        {hasExpandableContent && expandedQuestStats === quest.id && (
                                          <div style={{ 
                                            marginTop: '8px', 
                                            paddingTop: '8px', 
                                            borderTop: '1px solid #3c3c3c',
                                            fontSize: '12px',
                                            color: '#999999',
                                            fontFamily: 'BoldPixels, monospace',
                                          }}>
                                            {/* Progress Details Row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: questStat && questStat.totalAttempts > 0 ? '12px' : '0' }}>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>STARTED</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '11px' }}>{formatDateTime(questProgress?.startedAt)}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>COMPLETED</div>
                                                <div style={{ color: isCompleted ? '#7ed321' : '#cccccc', fontWeight: 'bold', fontSize: '11px' }}>{formatDateTime(questProgress?.completedAt)}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>TIME SPENT</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '11px' }}>{formatTimeSpent(questProgress?.startedAt, questProgress?.completedAt)}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>ATTEMPTS</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '11px' }}>{questProgress?.attempts || 0}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>CURRENT PHASE</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '11px' }}>Phase {(questProgress?.currentPhaseIndex || 0) + 1}</div>
                                              </div>
                                            </div>
                                            
                                            {/* Execution Stats Row - if available */}
                                            {questStat && questStat.totalAttempts > 0 && (
                                              <div style={{ 
                                                paddingTop: '8px', 
                                                borderTop: '1px solid #3c3c3c',
                                              }}>
                                                <div style={{ color: '#888888', marginBottom: '6px', fontSize: '10px' }}>CODE EXECUTION STATS</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                  <div>
                                                    <div style={{ color: '#666666', marginBottom: '1px' }}>Runs</div>
                                                    <div style={{ color: '#cccccc', fontWeight: 'bold' }}>{questStat.totalAttempts}</div>
                                                  </div>
                                                  <div>
                                                    <div style={{ color: '#666666', marginBottom: '1px' }}>Success</div>
                                                    <div style={{ color: '#7ed321', fontWeight: 'bold' }}>{questStat.successfulRuns}</div>
                                                  </div>
                                                  <div>
                                                    <div style={{ color: '#666666', marginBottom: '1px' }}>Failed</div>
                                                    <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{questStat.failedRuns}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{
                        backgroundColor: '#1e1e1e',
                        border: '2px solid #3c3c3c',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center',
                        color: '#888888',
                        fontFamily: 'BoldPixels, monospace',
                      }}>
                        No quests available yet.
                      </div>
                    );
                  })()}
                </div>

                {/* Active Quest */}
                {currentActiveQuest && (
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
                      {currentActiveQuest?.title}
                    </h4>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#cccccc', 
                      margin: 0,
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      {currentActiveQuest?.description}
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
                      fontSize: '20px', 
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
                          fontSize: '36px', 
                          fontWeight: 'bold', 
                          color: '#7ed321',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {objectiveStats.objectivesCompleted}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
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
                          fontSize: '36px', 
                          fontWeight: 'bold', 
                          color: '#00c9ff',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {formatTime(objectiveStats.totalTimeSpent)}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
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
                          fontSize: '36px', 
                          fontWeight: 'bold', 
                          color: '#f5a623',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {objectiveStats.totalAttempts}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
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
                          fontSize: '36px', 
                          fontWeight: 'bold', 
                          color: '#b19cd9',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {objectiveStats.totalHintsUsed}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
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
                          fontSize: '36px', 
                          fontWeight: 'bold', 
                          color: '#00c9ff',
                          marginBottom: '4px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          {formatTime(objectiveStats.avgTimePerObjective)}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
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
                      fontSize: '18px',
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
                          fontSize: '16px',
                          lineHeight: '1.5',
                        }}>
                          {insight.message}
                        </p>
                      </div>
                    ))}

                    {/* Concepts Learned Section - Dynamic based on completed quests */}
                    {allCompletedQuests.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: 'white',
                          marginBottom: '12px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          Concepts Mastered
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(() => {
                            // Collect all unique concepts from completed quests
                            const allConcepts = new Set<string>();
                            allCompletedQuests.forEach(quest => {
                              if (quest.concepts && Array.isArray(quest.concepts)) {
                                quest.concepts.forEach((concept: string) => {
                                  allConcepts.add(concept);
                                });
                              }
                            });
                            
                            // Format concept names for display (e.g., "manual_controls" -> "Manual Controls")
                            const formatConcept = (concept: string) => {
                              return concept
                                .split(/[-_]/)
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                            };
                            
                            // Convert to array and sort alphabetically
                            const conceptList = Array.from(allConcepts).sort();
                            
                            if (conceptList.length === 0) {
                              return (
                                <span style={{
                                  color: '#666666',
                                  fontSize: '14px',
                                  fontFamily: 'BoldPixels, monospace',
                                }}>
                                  Complete quests to learn new concepts!
                                </span>
                              );
                            }
                            
                            return conceptList.map((concept) => (
                              <span 
                                key={concept}
                                style={{
                                  padding: '6px 14px',
                                  backgroundColor: '#2d5016',
                                  color: '#7ed321',
                                  fontSize: '13px',
                                  borderRadius: '20px',
                                  fontFamily: 'BoldPixels, monospace',
                                  textTransform: 'uppercase',
                                  border: '1px solid #7ed321',
                                }}
                              >
                                {formatConcept(concept)}
                              </span>
                            ));
                          })()}
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
                {/* Refresh Button - Only show when there's an error */}
                {classStatsError && !loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => fetchClassStats(allCompletedQuests.length)}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: loading ? '#3c3c3c' : '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'BoldPixels, monospace',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = '#005a9e';
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = '#007acc';
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ 
                      color: '#cccccc',
                      fontFamily: 'BoldPixels, monospace',
                      fontSize: '16px',
                    }}>
                      Loading class statistics...
                    </p>
                  </div>
                ) : classStatsError ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{
                      backgroundColor: '#252526',
                      border: '1px solid #555555',
                      borderRadius: '8px',
                      padding: '24px',
                    }}>
                      <p style={{ 
                        color: '#cccccc',
                        fontFamily: 'BoldPixels, monospace',
                        fontSize: '16px',
                        marginBottom: '8px',
                      }}>
                        Unable to load class leaderboard
                      </p>
                      <p style={{ 
                        color: '#888888',
                        fontFamily: 'BoldPixels, monospace',
                        fontSize: '14px',
                        margin: 0,
                      }}>
                        Please check your connection and try again.
                      </p>
                    </div>
                  </div>
                ) : classStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ 
                      color: '#666666',
                      fontFamily: 'BoldPixels, monospace',
                      fontSize: '16px',
                    }}>
                      No class statistics available yet.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Your Percentile Card */}
                    {(() => {
                      const yourRank = classStats.find(s => s.studentName === 'You')?.rank || classStats.length;
                      const totalStudents = classStats.length;
                      // Calculate what percentage of students you're ahead of
                      // Rank 1 of 9 = beat 8/9 = 89% → Top 11%
                      // Rank 5 of 9 = beat 4/9 = 44% → Top 56%
                      const topPercentage = totalStudents > 0 ? Math.round((yourRank / totalStudents) * 100) : 100;
                      const beatPercentage = totalStudents > 0 ? Math.round(((totalStudents - yourRank) / totalStudents) * 100) : 0;
                      
                      const percentileLabel = topPercentage <= 10 ? 'Top 10%!' : 
                                             topPercentage <= 25 ? 'Top 25%!' : 
                                             topPercentage <= 50 ? 'Top 50%' :
                                             topPercentage <= 75 ? 'Top 75%' : 'Keep pushing!';
                      const percentileColor = topPercentage <= 10 ? '#f5a623' : 
                                             topPercentage <= 25 ? '#7ed321' :
                                             topPercentage <= 50 ? '#00c9ff' :
                                             topPercentage <= 75 ? '#888888' : '#666666';
                      
                      return (
                        <div style={{
                          backgroundColor: '#1e1e1e',
                          borderRadius: '8px',
                          border: `2px solid ${percentileColor}`,
                          padding: '16px',
                          textAlign: 'center',
                          marginBottom: '8px',
                        }}>
                          <div style={{
                            fontSize: '14px',
                            color: '#888888',
                            fontFamily: 'BoldPixels, monospace',
                            marginBottom: '4px',
                          }}>
                            YOUR RANKING
                          </div>
                          <div style={{
                            fontSize: '36px',
                            fontWeight: 'bold',
                            color: percentileColor,
                            fontFamily: 'BoldPixels, monospace',
                          }}>
                            Top {topPercentage}%
                          </div>
                          <div style={{
                            fontSize: '16px',
                            color: percentileColor,
                            fontFamily: 'BoldPixels, monospace',
                            marginTop: '4px',
                          }}>
                            {topPercentage <= 10 ? 'Outstanding!' : 
                             topPercentage <= 25 ? 'Excellent!' :
                             topPercentage <= 50 ? 'Good job!' :
                             topPercentage <= 75 ? 'Keep climbing!' : 'Keep pushing!'}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#666666',
                            fontFamily: 'BoldPixels, monospace',
                            marginTop: '8px',
                          }}>
                            Rank #{yourRank} of {totalStudents} students
                          </div>
                        </div>
                      );
                    })()}
                    
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
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Rank</span>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Student</span>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Quests</span>
                        <span style={{ 
                          fontSize: '16px', 
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
                            color: student.rank === 1 ? '#f5a623' : student.rank === 2 ? '#c0c0c0' : student.rank === 3 ? '#cd7f32' : 'white',
                            fontFamily: 'BoldPixels, monospace',
                            fontSize: '16px',
                          }}>
                            #{student.rank}
                          </span>
                          <span style={{
                            color: student.studentName === 'You' ? '#007acc' : 'white',
                            fontWeight: student.studentName === 'You' ? 'bold' : 'normal',
                            fontFamily: 'BoldPixels, monospace',
                            fontSize: '16px',
                          }}>
                            {student.studentName}
                          </span>
                          <span style={{ 
                            color: '#cccccc',
                            fontFamily: 'BoldPixels, monospace',
                            fontSize: '16px',
                          }}>
                            {student.questsCompleted}
                          </span>
                          <span style={{ 
                            color: '#cccccc',
                            fontFamily: 'BoldPixels, monospace',
                            fontSize: '16px',
                          }}>
                            {formatTime(student.totalTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p style={{
                      color: '#666666',
                      fontSize: '14px',
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
