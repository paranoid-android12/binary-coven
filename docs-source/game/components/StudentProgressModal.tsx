import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { EventBus } from '../game/EventBus';
import { Quest, QuestDifficulty } from '../types/quest';
import analyticsService from '../services/analyticsService';
import { useUser, isStudentUser } from '../contexts/UserContext';
import {
  computeTopicMastery,
  getActiveMasteryTags,
  isFullyMastered,
  formatConceptLabel,
  MASTERY_COLORS,
  TOPIC_DESCRIPTIONS,
  TOPIC_PRIORITY,
  type TopicMastery,
  type QuestExecutionStatsInput,
} from '../utils/masteryComputation';

interface StudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ClassStats {
  studentId?: string;
  studentName: string;
  fullName?: string;
  questsCompleted: number;
  totalTime: number;
  rank: number;
  isCurrentUser?: boolean;
}

interface SessionInfo {
  code: string;
  createdAt: string;
  validityEnd: string;
  createdByAdmin: string | null;
  studentCount: number;
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

// Database-sourced quest progress item
interface DatabaseQuestProgress {
  questId: string;
  questTitle: string;
  state: 'locked' | 'available' | 'active' | 'completed' | 'failed';
  currentPhaseIndex: number;
  startedAt: string | null;
  completedAt: string | null;
  timeSpentSeconds: number;
  attempts: number;
  score: number | null;
}

// Database progress summary
interface ProgressSummary {
  totalQuests: number;
  completedQuests: number;
  inProgressQuests: number;
  totalTimeSpentSeconds: number;
  totalAttempts: number;
}

// Student detailed stats from API
interface StudentDetailedStats {
  student: {
    id: string;
    displayName: string;
    joinedAt: string;
  };
  summary: {
    completedQuests: number;
    totalQuests: number;
    totalTimeSpent: number;
    totalAttempts: number;
    avgTimePerQuest: number;
  };
  questProgress: Array<{
    questId: string;
    questTitle: string;
    state: string;
    currentPhaseIndex: number;
    startedAt: string | null;
    completedAt: string | null;
    timeSpentSeconds: number;
    attempts: number;
    score: number | null;
  }>;
}

type TabType = 'profile' | 'progress' | 'insights' | 'class';

export const StudentProgressModal: React.FC<StudentProgressModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user } = useUser();
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [questStats, setQuestStats] = useState<QuestExecutionStats[]>([]);
  const [objectiveStats, setObjectiveStats] = useState<ObjectiveStats | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedQuestStats, setExpandedQuestStats] = useState<string | null>(null); // Track which quest stats are expanded
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Force re-render on quest completion
  const [classStatsError, setClassStatsError] = useState<string | null>(null); // Error message for class stats
  const [hasLoadedSave, setHasLoadedSave] = useState(false); // Track if user has loaded their save
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null); // Selected student for detailed view
  const [selectedStudentStats, setSelectedStudentStats] = useState<StudentDetailedStats | null>(null); // Selected student's detailed stats
  const [studentStatsLoading, setStudentStatsLoading] = useState(false); // Loading state for student stats
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null); // Session info for header
  
  // LocalStorage-sourced progress data (real-time updates)
  const [localQuestProgress, setLocalQuestProgress] = useState<DatabaseQuestProgress[]>([]);
  const [localProgressSummary, setLocalProgressSummary] = useState<ProgressSummary | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  
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

  // Get learning insights based on completed quests - focused on quest topic groups
  const getLearningInsights = (avQuests: Quest[], compQuests: Quest[]) => {
    const insights: { message: string; type: 'success' | 'suggestion' | 'next' }[] = [];

    // Compute topic mastery from quest IDs
    const mastery = computeTopicMastery(avQuests, compQuests);

    // Generate insights for mastered / in-progress topics
    mastery.forEach(tm => {
      if (tm.level === 'mastered') {
        const desc = TOPIC_DESCRIPTIONS[tm.topic] || '';
        insights.push({
          message: `${tm.topic}: ${desc}`,
          type: 'success'
        });
      } else if (tm.level === 'in-progress') {
        insights.push({
          message: `${tm.topic}: Keep going — ${tm.completedQuests}/${tm.totalQuests} quests done!`,
          type: 'suggestion'
        });
      }
    });

    // If no insights yet but has completed quests, add general programming message
    if (insights.length === 0 && compQuests.length > 0) {
      insights.push({
        message: `You're making progress! Keep completing quests to learn more programming concepts.`,
        type: 'suggestion'
      });
    }

    // Find topics not yet started to suggest next steps
    const notStarted = mastery.filter(tm => tm.level === 'not-started');

    if (notStarted.length > 0 && compQuests.length > 0) {
      const nextTopic = notStarted[0].topic;
      insights.push({
        message: `Next: Continue learning to discover ${nextTopic}!`,
        type: 'next'
      });
    } else if (compQuests.length === 0) {
      insights.push({
        message: `Start your coding journey! Complete quests to learn programming fundamentals.`,
        type: 'next'
      });
    }

    // If fully complete
    if (compQuests.length > 0 && compQuests.length >= avQuests.length && avQuests.length > 0) {
      insights.push({
        message: `Amazing! You've mastered all available programming concepts!`,
        type: 'success'
      });
    }

    return insights;
  };

  // Fetch class statistics - always show full names
  const fetchClassStats = async (completedCount: number) => {
    setLoading(true);
    setClassStatsError(null);
    
    try {
      const response = await fetch('/api/analytics/class-stats?showFullNames=true');
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store session info if available
        if (data.sessionInfo) {
          setSessionInfo(data.sessionInfo);
        }
        
        const students = data.students || [];
        const currentStudentId = data.currentStudentId;
        
        // Mark current user's entry as "You" instead of adding a duplicate
        const allStudents = students.map((student: ClassStats) => {
          if (currentStudentId && student.studentId === currentStudentId) {
            return {
              ...student,
              studentName: 'You',
              isCurrentUser: true
            };
          }
          return student;
        });
        
        // If current user not found in list (no data yet), add them
        const hasCurrentUser = allStudents.some((s: ClassStats & { isCurrentUser?: boolean }) => s.isCurrentUser);
        if (!hasCurrentUser && currentStudentId) {
          allStudents.push({ 
            studentId: currentStudentId,
            studentName: 'You', 
            fullName: 'You', 
            questsCompleted: completedCount, 
            totalTime: 0, 
            rank: 0,
            isCurrentUser: true
          });
        }
        
        // Re-sort by quests completed (descending) and assign ranks
        allStudents.sort((a: ClassStats, b: ClassStats) => b.questsCompleted - a.questsCompleted);
        allStudents.forEach((student: ClassStats, index: number) => {
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

  // Fetch detailed stats for a specific student
  const fetchStudentStats = async (studentId: string) => {
    setStudentStatsLoading(true);
    try {
      const response = await fetch(`/api/analytics/student-stats/${studentId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSelectedStudentStats(data);
      } else {
        console.error('Failed to fetch student stats:', data.message);
        setSelectedStudentStats(null);
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
      setSelectedStudentStats(null);
    }
    setStudentStatsLoading(false);
  };

  // Fetch quest execution statistics - only if save has been loaded
  const fetchQuestStats = async () => {
    // Only fetch from database if user has loaded their save
    if (!hasLoadedSave) {
      setQuestStats([]);
      return;
    }
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

  // Fetch objective completion statistics - only if save has been loaded
  const fetchObjectiveStats = async () => {
    // Only fetch from database if user has loaded their save
    if (!hasLoadedSave) {
      setObjectiveStats(null);
      return;
    }
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

  // Get quest progress from localStorage (real-time updates)
  // Data only appears after user explicitly loads their save
  // Using useCallback to get a stable reference for event handlers
  const loadLocalProgress = useCallback(() => {
    setProgressLoading(true);
    try {
      // Get quest progress from localStorage via analyticsService
      // This will be empty until user loads their save, which syncs database → localStorage
      const localProgress = analyticsService.getQuestProgressData();
      const localSummary = analyticsService.getProgressSummary();
      
      // Transform to DatabaseQuestProgress format for compatibility
      const transformedProgress: DatabaseQuestProgress[] = localProgress.map(p => ({
        questId: p.questId,
        questTitle: p.questTitle,
        state: p.state,
        currentPhaseIndex: p.currentPhaseIndex || 0,
        startedAt: p.startedAt || null,
        completedAt: p.completedAt || null,
        timeSpentSeconds: p.timeSpentSeconds || 0,
        attempts: p.attempts || 0,
        score: p.score || null,
      }));
      
      setLocalQuestProgress(transformedProgress);
      setLocalProgressSummary({
        totalQuests: localSummary.totalQuests,
        completedQuests: localSummary.completed,
        inProgressQuests: localSummary.inProgress,
        totalTimeSpentSeconds: localSummary.totalTimeSpentSeconds,
        totalAttempts: localSummary.totalAttempts,
      });
    } catch (error) {
      console.error('Failed to load local progress:', error);
    }
    setProgressLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchQuestStats();
      fetchObjectiveStats();
      loadLocalProgress(); // Load from localStorage for real-time updates
    }
  }, [isOpen, refreshTrigger]);

  // Subscribe to quest completion events to refresh data
  useEffect(() => {
    const handleQuestUpdate = () => {
      // Refresh zustand store state (this updates currentActiveQuest, availableQuests, etc.)
      useGameStore.getState().refreshQuestState();
      // Increment trigger to force re-render and re-fetch
      setRefreshTrigger(prev => prev + 1);
      // Also immediately reload localStorage data if modal is open
      // This ensures we get the latest state right after quest events
      loadLocalProgress();
    };

    const handleProgressSynced = () => {
      setHasLoadedSave(true); // Mark that save has been loaded
      useGameStore.getState().refreshQuestState();
      setRefreshTrigger(prev => prev + 1);
      loadLocalProgress();
    };

    // Listen for various quest events to update UI immediately
    EventBus.on('quest-completed', handleQuestUpdate);
    EventBus.on('quest-started', handleQuestUpdate);
    EventBus.on('phase-completed', handleQuestUpdate);
    EventBus.on('quest-progress-synced', handleProgressSynced);

    return () => {
      EventBus.off('quest-completed', handleQuestUpdate);
      EventBus.off('quest-started', handleQuestUpdate);
      EventBus.off('phase-completed', handleQuestUpdate);
      EventBus.off('quest-progress-synced', handleProgressSynced);
    };
  }, [loadLocalProgress]);

  // Call store selectors to get fresh data (ensures dynamic updates on each render)
  // IMPORTANT: These hooks MUST be called before any conditional returns!
  const allLoadedQuests = useGameStore((state) => state.getAllLoadedQuests()); // All quests for display
  const currentActiveQuest = useGameStore((state) => state.getActiveQuest());

  // Create a set of completed quest IDs from localStorage for fast lookup
  const completedQuestIds = new Set(
    localQuestProgress
      .filter(q => q.state === 'completed')
      .map(q => q.questId)
  );

  // Create mock Quest objects for completed quests from localStorage
  // This allows existing functions like getOrganizedQuests to work
  const localCompletedQuests: Quest[] = localQuestProgress
    .filter(q => q.state === 'completed')
    .map(qp => {
      // Find matching quest from loaded quests, or create minimal object
      const loadedQuest = allLoadedQuests.find(q => q.id === qp.questId);
      if (loadedQuest) return loadedQuest;
      // Create minimal Quest object for display purposes (when quest JSON not loaded)
      return {
        id: qp.questId,
        title: qp.questTitle,
        description: '',
        category: 'Other',
        difficulty: 'beginner' as QuestDifficulty,
        phases: [],
        rewards: []
      } as Quest;
    });

  // Compute topic mastery (memoised for performance)
  const topicMastery = useMemo(
    () => computeTopicMastery(
      allLoadedQuests,
      localCompletedQuests,
      questStats as QuestExecutionStatsInput[],
    ),
    [allLoadedQuests, localCompletedQuests, questStats],
  );
  const activeMasteryTags = useMemo(() => getActiveMasteryTags(topicMastery), [topicMastery]);
  const fullyMastered = useMemo(() => isFullyMastered(topicMastery), [topicMastery]);

  // Fetch class stats when tab is active - needs to be after store hooks so we have completed count
  // Only fetch when we have loaded quests (to ensure data is ready)
  // Use localStorage completed count
  useEffect(() => {
    if (isOpen && activeTab === 'class' && allLoadedQuests.length > 0) {
      const completedCount = localProgressSummary?.completedQuests || 0;
      fetchClassStats(completedCount);
    }
  }, [isOpen, activeTab, localProgressSummary?.completedQuests, allLoadedQuests.length]);

  if (!isOpen) return null;

  // Use localStorage completed quests for insights
  const insights = getLearningInsights(allLoadedQuests, localCompletedQuests);
  const totalCompleted = localProgressSummary?.completedQuests || 0;
  const totalQuests = allLoadedQuests.length;
  const overallProgress = totalQuests > 0 ? Math.round((totalCompleted / totalQuests) * 100) : 0;

  // Helper to format timestamps (accepts string ISO date or number timestamp)
  const formatDateTime = (timestamp?: string | number | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to calculate time spent (from database seconds or from timestamps)
  const formatTimeSpentFromDb = (timeSpentSeconds?: number) => {
    if (!timeSpentSeconds || timeSpentSeconds <= 0) return '-';
    const minutes = Math.floor(timeSpentSeconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Helper to calculate time spent from ISO timestamps (legacy support)
  const formatTimeSpent = (startedAt?: string | number | null, completedAt?: string | number | null) => {
    if (!startedAt) return '-';
    const startTime = new Date(startedAt).getTime();
    if (isNaN(startTime)) return '-';
    const endTime = completedAt ? new Date(completedAt).getTime() : Date.now();
    const minutes = Math.floor((endTime - startTime) / 60000);
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

  // Profile summary stats
  const execStats = getOverallExecutionStats();
  const profileStats = {
    questsCompleted: totalCompleted,
    totalQuests,
    totalTimeSeconds: localProgressSummary?.totalTimeSpentSeconds || 0,
    totalCodeRuns: execStats?.totalRuns || 0,
    successRate: execStats && execStats.totalRuns > 0
      ? Math.round((execStats.successfulRuns / execStats.totalRuns) * 100)
      : 0,
  };

  // Student display info
  const studentUsername = user && isStudentUser(user) ? user.username : 'Student';
  const studentDisplayName = user && isStudentUser(user) ? user.displayName : '';
  const studentInitial = studentUsername.charAt(0).toUpperCase();

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
              onClick={() => setActiveTab('profile')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: activeTab === 'profile' ? '#007acc' : 'transparent',
                color: activeTab === 'profile' ? 'white' : '#cccccc',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '17px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'profile') e.currentTarget.style.backgroundColor = '#3c3c3c';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'profile') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Profile
            </button>
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
                fontSize: '17px',
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
                fontSize: '17px',
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
                fontSize: '17px',
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
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Avatar + Identity Card */}
                <div style={{
                  backgroundColor: '#1e1e1e',
                  border: '2px solid #3c3c3c',
                  borderRadius: '8px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}>
                  {/* Avatar Circle */}
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #007acc, #00c9ff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    fontFamily: 'BoldPixels, monospace',
                    flexShrink: 0,
                  }}>
                    {studentInitial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '23px',
                      fontWeight: 'bold',
                      color: 'white',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      {studentUsername}
                    </h3>
                    {studentDisplayName && studentDisplayName !== studentUsername && (
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '15px',
                        color: '#999999',
                        fontFamily: 'BoldPixels, monospace',
                      }}>
                        {studentDisplayName}
                      </p>
                    )}
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '8px',
                      flexWrap: 'wrap',
                    }}>
                      {sessionInfo && (
                        <span style={{ fontSize: '17px', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                          Session: <span style={{ color: '#00c9ff' }}>{sessionInfo.code}</span>
                        </span>
                      )}
                      <span style={{ fontSize: '17px', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                        {overallProgress}% Complete
                      </span>
                    </div>
                  </div>
                  {/* Mastery badge (compact) */}
                  {fullyMastered && (
                    <div style={{
                      padding: '6px 14px',
                      background: 'linear-gradient(135deg, #f5a623, #f7c948)',
                      borderRadius: '20px',
                      color: '#1e1e1e',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      fontFamily: 'BoldPixels, monospace',
                      whiteSpace: 'nowrap',
                    }}>
                      ALL MASTERED
                    </div>
                  )}
                </div>

                {/* Summary Stats Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                }}>
                  {[
                    { label: 'QUESTS DONE', value: `${profileStats.questsCompleted}/${profileStats.totalQuests}`, color: '#7ed321' },
                    { label: 'TOTAL TIME', value: formatTime(profileStats.totalTimeSeconds), color: '#00c9ff' },
                    { label: 'CODE RUNS', value: String(profileStats.totalCodeRuns), color: '#f5a623' },
                    { label: 'SUCCESS RATE', value: profileStats.totalCodeRuns > 0 ? `${profileStats.successRate}%` : 'N/A', color: '#b19cd9' },
                  ].map((stat) => (
                    <div key={stat.label} style={{
                      backgroundColor: '#252526',
                      border: '1px solid #3c3c3c',
                      borderRadius: '6px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: stat.color,
                        fontFamily: 'BoldPixels, monospace',
                        marginBottom: '4px',
                      }}>
                        {stat.value}
                      </div>
                      <div style={{
                        fontSize: '15px',
                        color: '#999999',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontFamily: 'BoldPixels, monospace',
                      }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mastery Tags */}
                <div style={{
                  backgroundColor: '#1e1e1e',
                  border: '2px solid #3c3c3c',
                  borderRadius: '8px',
                  padding: '20px',
                }}>
                  <h3 style={{
                    fontSize: '19px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: '0 0 14px 0',
                    fontFamily: 'BoldPixels, monospace',
                  }}>
                    Topic Mastery
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {topicMastery.map((tm) => {
                      const colors = MASTERY_COLORS[tm.level];
                      return (
                        <span
                          key={tm.topic}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '20px',
                            fontSize: '16px',
                            fontFamily: 'BoldPixels, monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {tm.level === 'mastered' ? '✓ ' : tm.level === 'in-progress' ? '◐ ' : '○ '}
                          {tm.topic}
                          {tm.totalQuests > 0 && (
                            <span style={{ opacity: 0.7, fontSize: '15px' }}>
                              ({tm.completedQuests}/{tm.totalQuests})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Performance Bar Chart */}
                <div style={{
                  backgroundColor: '#1e1e1e',
                  border: '2px solid #3c3c3c',
                  borderRadius: '8px',
                  padding: '20px',
                }}>
                  <h3 style={{
                    fontSize: '19px',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: '0 0 16px 0',
                    fontFamily: 'BoldPixels, monospace',
                  }}>
                    Proficiency by Topic
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topicMastery.filter(tm => tm.totalQuests > 0).map((tm) => {
                      const barColor = tm.level === 'mastered' ? '#7ed321'
                        : tm.level === 'in-progress' ? '#f5a623'
                        : '#555555';
                      return (
                        <div key={tm.topic}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '4px',
                          }}>
                            <span style={{
                              fontSize: '17px',
                              color: '#cccccc',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {tm.topic}
                            </span>
                            <span style={{
                              fontSize: '17px',
                              color: barColor,
                              fontWeight: 'bold',
                              fontFamily: 'BoldPixels, monospace',
                            }}>
                              {tm.proficiency}%
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '10px',
                            backgroundColor: '#3c3c3c',
                            borderRadius: '5px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${tm.proficiency}%`,
                              backgroundColor: barColor,
                              borderRadius: '5px',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                    {topicMastery.filter(tm => tm.totalQuests > 0).length === 0 && (
                      <p style={{
                        color: '#666666',
                        fontSize: '15px',
                        textAlign: 'center',
                        fontFamily: 'BoldPixels, monospace',
                        margin: 0,
                      }}>
                        Complete quests to see your proficiency breakdown!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                      fontSize: '21px', 
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
                    fontSize: '17px', 
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
                          fontSize: '21px', 
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
                              fontSize: '15px', 
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
                              fontSize: '15px', 
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
                              fontSize: '15px', 
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
                              fontSize: '15px', 
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
                    fontSize: '21px', 
                    fontWeight: 'bold', 
                    color: 'white', 
                    margin: '8px 0 0 0',
                    fontFamily: 'BoldPixels, monospace',
                  }}>
                    Quests
                  </h3>
                  {(() => {
                    const organized = getOrganizedQuests(allLoadedQuests, localCompletedQuests);
                    const categories = Object.keys(organized).filter(cat => organized[cat].length > 0);
                    
                    return categories.length > 0 ? (
                      categories.map((category, catIndex) => {
                        const quests = organized[category];
                        const completedInCategory = quests.filter(q => completedQuestIds.has(q.id)).length;
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
                                    fontSize: '15px',
                                    fontFamily: 'BoldPixels, monospace',
                                  }}>
                                    {catIndex + 1}
                                  </span>
                                  <h4 style={{ 
                                    fontWeight: 'bold', 
                                    color: 'white', 
                                    margin: 0,
                                    fontFamily: 'BoldPixels, monospace',
                                    fontSize: '17px',
                                  }}>
                                    {category}
                                  </h4>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{
                                    fontSize: '15px',
                                    color: completedInCategory === quests.length ? '#7ed321' : 
                                           completedInCategory > 0 ? '#f5a623' : '#666666',
                                    fontFamily: 'BoldPixels, monospace',
                                  }}>
                                    {completedInCategory === quests.length ? 'COMPLETE' : 
                                     completedInCategory > 0 ? 'IN PROGRESS' : 'NOT STARTED'}
                                  </span>
                                  <span style={{
                                    fontSize: '15px',
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
                                fontSize: '15px', 
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
                                    const isCompleted = completedQuestIds.has(quest.id);
                                    const isActive = currentActiveQuest?.id === quest.id;
                                    const questStat = questStats.find(s => s.questId === quest.id);
                                    // Get quest progress from localStorage
                                    const questProgress = localQuestProgress.find(p => p.questId === quest.id);

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
                                              fontSize: '13px',
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
                                                fontSize: '16px',
                                              }}>
                                                {quest.title}
                                              </h5>
                                              {quest.description && (
                                                <p style={{
                                                  color: '#888888',
                                                  fontSize: '14px',
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
                                              fontSize: '13px',
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
                                            fontSize: '13px',
                                            color: '#999999',
                                            fontFamily: 'BoldPixels, monospace',
                                          }}>
                                            {/* Progress Details Row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: questStat && questStat.totalAttempts > 0 ? '12px' : '0' }}>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>STARTED</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '12px' }}>{formatDateTime(questProgress?.startedAt)}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>COMPLETED</div>
                                                <div style={{ color: isCompleted ? '#7ed321' : '#cccccc', fontWeight: 'bold', fontSize: '12px' }}>{formatDateTime(questProgress?.completedAt)}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>TIME SPENT</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '12px' }}>{formatTimeSpentFromDb(questProgress?.timeSpentSeconds)}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>ATTEMPTS</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '12px' }}>{questProgress?.attempts || 0}</div>
                                              </div>
                                              <div>
                                                <div style={{ color: '#666666', marginBottom: '1px' }}>CURRENT PHASE</div>
                                                <div style={{ color: '#cccccc', fontWeight: 'bold', fontSize: '12px' }}>Phase {(questProgress?.currentPhaseIndex || 0) + 1}</div>
                                              </div>
                                            </div>
                                            
                                            {/* Execution Stats Row - if available */}
                                            {questStat && questStat.totalAttempts > 0 && (
                                              <div style={{ 
                                                paddingTop: '8px', 
                                                borderTop: '1px solid #3c3c3c',
                                              }}>
                                                <div style={{ color: '#888888', marginBottom: '6px', fontSize: '11px' }}>CODE EXECUTION STATS</div>
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
                        fontSize: '13px',
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
                      fontSize: '15px', 
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
                      fontSize: '21px', 
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
                          fontSize: '15px', 
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
                          fontSize: '15px', 
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
                          fontSize: '15px', 
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
                          fontSize: '15px', 
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
                          fontSize: '15px', 
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
                      fontSize: '17px',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Complete quests to unlock learning insights!
                    </p>
                    <p style={{ 
                      color: '#555555', 
                      fontSize: '15px', 
                      marginTop: '8px',
                      fontFamily: 'BoldPixels, monospace',
                    }}>
                      Start with the Tutorial to get started.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3 style={{
                      fontSize: '19px',
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
                          fontSize: '17px',
                          lineHeight: '1.5',
                        }}>
                          {insight.message}
                        </p>
                      </div>
                    ))}

                    {/* Concepts Learned Section - Dynamic based on completed quests */}
                    {localCompletedQuests.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <h3 style={{
                          fontSize: '19px',
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
                            localCompletedQuests.forEach(quest => {
                              if (quest.concepts && Array.isArray(quest.concepts)) {
                                quest.concepts.forEach((concept: string) => {
                                  allConcepts.add(concept);
                                });
                              }
                            });
                            
                            // Convert to array and sort alphabetically
                            const conceptList = Array.from(allConcepts).sort();
                            
                            if (conceptList.length === 0) {
                              return (
                                <span style={{
                                  color: '#666666',
                                  fontSize: '15px',
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
                                  fontSize: '17px',
                                  borderRadius: '20px',
                                  fontFamily: 'BoldPixels, monospace',
                                  textTransform: 'uppercase',
                                  border: '1px solid #7ed321',
                                }}
                              >
                                {formatConceptLabel(concept)}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Per-Topic Proficiency Breakdown */}
                    {topicMastery.filter(tm => tm.totalQuests > 0).length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <h3 style={{
                          fontSize: '19px',
                          fontWeight: 'bold',
                          color: 'white',
                          marginBottom: '14px',
                          fontFamily: 'BoldPixels, monospace',
                        }}>
                          Topic Proficiency
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {topicMastery.filter(tm => tm.totalQuests > 0).map((tm) => {
                            const barColor = tm.level === 'mastered' ? '#7ed321'
                              : tm.level === 'in-progress' ? '#f5a623'
                              : '#555555';
                            // Get per-topic execution stats
                            const topicExecStats = questStats.filter(qs =>
                              tm.concepts.some(c => qs.questId.toLowerCase().includes(c))
                            );
                            const topicTotalRuns = topicExecStats.reduce((s, e) => s + e.totalAttempts, 0);
                            const topicSuccessRuns = topicExecStats.reduce((s, e) => s + e.successfulRuns, 0);
                            const topicSuccessRate = topicTotalRuns > 0
                              ? Math.round((topicSuccessRuns / topicTotalRuns) * 100) : 0;
                            // Get average time per quest in this topic
                            const topicQuestProgress = localQuestProgress.filter(qp =>
                              allLoadedQuests.some(q =>
                                q.id === qp.questId &&
                                q.concepts?.some((c: string) => {
                                  const norm = c.toLowerCase().replace(/[ -]/g, '_');
                                  return tm.concepts.includes(norm);
                                })
                              )
                            );
                            const completedInTopic = topicQuestProgress.filter(qp => qp.state === 'completed');
                            const avgTime = completedInTopic.length > 0
                              ? Math.round(completedInTopic.reduce((s, q) => s + (q.timeSpentSeconds || 0), 0) / completedInTopic.length)
                              : 0;

                            return (
                              <div key={tm.topic} style={{
                                backgroundColor: '#252526',
                                border: '1px solid #3c3c3c',
                                borderRadius: '6px',
                                padding: '14px',
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{
                                    fontSize: '15px',
                                    color: 'white',
                                    fontFamily: 'BoldPixels, monospace',
                                    fontWeight: 'bold',
                                  }}>
                                    {tm.topic}
                                  </span>
                                  <span style={{
                                    fontSize: '17px',
                                    color: barColor,
                                    fontWeight: 'bold',
                                    fontFamily: 'BoldPixels, monospace',
                                  }}>
                                    {tm.proficiency}%
                                  </span>
                                </div>
                                {/* Proficiency bar */}
                                <div style={{
                                  width: '100%',
                                  height: '8px',
                                  backgroundColor: '#3c3c3c',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                  marginBottom: '10px',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${tm.proficiency}%`,
                                    backgroundColor: barColor,
                                    borderRadius: '4px',
                                    transition: 'width 0.5s ease',
                                  }} />
                                </div>
                                {/* Per-topic stats row */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(4, 1fr)',
                                  gap: '8px',
                                  fontSize: '15px',
                                  fontFamily: 'BoldPixels, monospace',
                                }}>
                                  <div>
                                    <div style={{ color: '#666666', marginBottom: '2px' }}>QUESTS</div>
                                    <div style={{ color: '#cccccc', fontWeight: 'bold' }}>
                                      {tm.completedQuests}/{tm.totalQuests}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#666666', marginBottom: '2px' }}>SUCCESS RATE</div>
                                    <div style={{ color: topicSuccessRate > 70 ? '#7ed321' : topicSuccessRate > 40 ? '#f5a623' : '#cccccc', fontWeight: 'bold' }}>
                                      {topicTotalRuns > 0 ? `${topicSuccessRate}%` : '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#666666', marginBottom: '2px' }}>AVG TIME</div>
                                    <div style={{ color: '#cccccc', fontWeight: 'bold' }}>
                                      {avgTime > 0 ? formatTime(avgTime) : '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#666666', marginBottom: '2px' }}>CODE RUNS</div>
                                    <div style={{ color: '#cccccc', fontWeight: 'bold' }}>
                                      {topicTotalRuns > 0 ? topicTotalRuns : '-'}
                                    </div>
                                  </div>
                                </div>
                                {/* Description */}
                                <p style={{
                                  color: '#777777',
                                  fontSize: '15px',
                                  margin: '8px 0 0 0',
                                  fontFamily: 'BoldPixels, monospace',
                                  fontStyle: 'italic',
                                }}>
                                  {TOPIC_DESCRIPTIONS[tm.topic]}
                                </p>
                              </div>
                            );
                          })}
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
                {/* Session Info Header */}
                {sessionInfo && (
                  <div style={{
                    backgroundColor: '#252526',
                    borderRadius: '8px',
                    border: '1px solid #3c3c3c',
                    padding: '16px 20px',
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}>
                      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ color: '#888888', fontSize: '14px', fontFamily: 'BoldPixels, monospace' }}>SESSION CODE</span>
                          <div style={{ color: '#00c9ff', fontSize: '19px', fontFamily: 'BoldPixels, monospace', fontWeight: 'bold' }}>{sessionInfo.code}</div>
                        </div>
                        {sessionInfo.createdByAdmin && (
                          <div>
                            <span style={{ color: '#888888', fontSize: '14px', fontFamily: 'BoldPixels, monospace' }}>CREATED BY</span>
                            <div style={{ color: '#cccccc', fontSize: '19px', fontFamily: 'BoldPixels, monospace' }}>{sessionInfo.createdByAdmin}</div>
                          </div>
                        )}
                        <div>
                          <span style={{ color: '#888888', fontSize: '14px', fontFamily: 'BoldPixels, monospace' }}>STUDENTS</span>
                          <div style={{ color: '#cccccc', fontSize: '19px', fontFamily: 'BoldPixels, monospace' }}>{classStats.length}</div>
                        </div>
                        <div>
                          <span style={{ color: '#888888', fontSize: '14px', fontFamily: 'BoldPixels, monospace' }}>EXPIRES</span>
                          <div style={{ color: '#cccccc', fontSize: '17px', fontFamily: 'BoldPixels, monospace' }}>
                            {new Date(sessionInfo.validityEnd).toLocaleDateString()} {new Date(sessionInfo.validityEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Refresh Button - Only show when there's an error */}
                {classStatsError && !loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => fetchClassStats(localProgressSummary?.completedQuests || 0)}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: loading ? '#3c3c3c' : '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'BoldPixels, monospace',
                        fontSize: '15px',
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
                      fontSize: '17px',
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
                        fontSize: '17px',
                        marginBottom: '8px',
                      }}>
                        Unable to load class leaderboard
                      </p>
                      <p style={{ 
                        color: '#888888',
                        fontFamily: 'BoldPixels, monospace',
                        fontSize: '15px',
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
                      fontSize: '17px',
                    }}>
                      No class statistics available yet.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Your Percentile Card */}
                    {(() => {
                      const yourRank = classStats.find(s => s.isCurrentUser)?.rank || classStats.length;
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
                            fontSize: '15px',
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
                            fontSize: '17px',
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
                            fontSize: '14px',
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
                          fontSize: '17px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Rank</span>
                        <span style={{ 
                          fontSize: '17px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Student</span>
                        <span style={{ 
                          fontSize: '17px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Quests</span>
                        <span style={{ 
                          fontSize: '17px', 
                          fontWeight: 'bold', 
                          color: '#cccccc',
                          fontFamily: 'BoldPixels, monospace',
                        }}>Time</span>
                      </div>
                      {/* Table Rows */}
                      {classStats.map((student, index) => {
                        const isYou = student.isCurrentUser === true;
                        const isClickable = !isYou && student.studentId;
                        const isExpanded = selectedStudentId === student.studentId;
                        
                        return (
                          <React.Fragment key={index}>
                            <div 
                              onClick={() => {
                                if (isClickable && student.studentId) {
                                  if (isExpanded) {
                                    setSelectedStudentId(null);
                                    setSelectedStudentStats(null);
                                  } else {
                                    setSelectedStudentId(student.studentId);
                                    fetchStudentStats(student.studentId);
                                  }
                                }
                              }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '80px 1fr 100px 100px',
                              gap: '16px',
                              padding: '12px 16px',
                              borderBottom: index < classStats.length - 1 ? '1px solid #3c3c3c' : 'none',
                              backgroundColor: isYou ? 'rgba(0, 122, 204, 0.2)' : 
                                             selectedStudentId === student.studentId ? 'rgba(245, 166, 35, 0.2)' : 'transparent',
                              cursor: isClickable ? 'pointer' : 'default',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              if (isClickable && selectedStudentId !== student.studentId) {
                                e.currentTarget.style.backgroundColor = 'rgba(60, 60, 60, 0.5)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isClickable && selectedStudentId !== student.studentId) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <span style={{ 
                              fontWeight: 'bold', 
                              color: student.rank === 1 ? '#f5a623' : student.rank === 2 ? '#c0c0c0' : student.rank === 3 ? '#cd7f32' : 'white',
                              fontFamily: 'BoldPixels, monospace',
                              fontSize: '17px',
                            }}>
                              #{student.rank}
                            </span>
                            <span style={{
                              color: isYou ? '#007acc' : 'white',
                              fontWeight: isYou ? 'bold' : 'normal',
                              fontFamily: 'BoldPixels, monospace',
                              fontSize: '17px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}>
                              {student.studentName}
                              {isClickable && (
                                <span style={{ color: '#666666', fontSize: '13px' }}>
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              )}
                            </span>
                            <span style={{ 
                              color: '#cccccc',
                              fontFamily: 'BoldPixels, monospace',
                              fontSize: '17px',
                            }}>
                              {student.questsCompleted}
                            </span>
                            <span style={{ 
                              color: '#cccccc',
                              fontFamily: 'BoldPixels, monospace',
                              fontSize: '17px',
                            }}>
                              {formatTime(student.totalTime)}
                            </span>
                          </div>
                          
                          {/* Expanded Student Stats Dropdown */}
                          {isExpanded && (
                            <div style={{
                              backgroundColor: '#1a1a1a',
                              borderBottom: index < classStats.length - 1 ? '1px solid #3c3c3c' : 'none',
                              padding: '12px 16px',
                            }}>
                              {studentStatsLoading ? (
                                <div style={{ textAlign: 'center', padding: '12px', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                                  Loading...
                                </div>
                              ) : selectedStudentStats ? (
                                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                                  <div>
                                    <span style={{ color: '#888888', fontSize: '13px', fontFamily: 'BoldPixels, monospace' }}>JOINED</span>
                                    <div style={{ color: '#cccccc', fontSize: '16px', fontFamily: 'BoldPixels, monospace' }}>
                                      {new Date(selectedStudentStats.student.joinedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ color: '#888888', fontSize: '13px', fontFamily: 'BoldPixels, monospace' }}>COMPLETED</span>
                                    <div style={{ color: '#7ed321', fontSize: '16px', fontFamily: 'BoldPixels, monospace' }}>
                                      {selectedStudentStats.summary.completedQuests}/{selectedStudentStats.summary.totalQuests} quests
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ color: '#888888', fontSize: '13px', fontFamily: 'BoldPixels, monospace' }}>TOTAL TIME</span>
                                    <div style={{ color: '#cccccc', fontSize: '16px', fontFamily: 'BoldPixels, monospace' }}>
                                      {formatTime(selectedStudentStats.summary.totalTimeSpent)}
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ color: '#888888', fontSize: '13px', fontFamily: 'BoldPixels, monospace' }}>ATTEMPTS</span>
                                    <div style={{ color: '#cccccc', fontSize: '16px', fontFamily: 'BoldPixels, monospace' }}>
                                      {selectedStudentStats.summary.totalAttempts}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center', padding: '12px', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                                  Unable to load stats
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                    </div>
                    <p style={{
                      color: '#666666',
                      fontSize: '15px',
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
                fontSize: '17px',
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
