import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  computeTopicMastery,
  getActiveMasteryTags,
  isFullyMastered,
  MASTERY_COLORS,
  TOPIC_DESCRIPTIONS,
  type TopicMastery,
} from '../utils/masteryComputation';
import type { Quest, QuestDifficulty } from '../types/quest';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  sessionCode: string;
  sessionStart: string | null;
  sessionEnd: string | null;
  joinedAt: string;
  questsCompleted: number;
  totalQuests: number;
  totalTimeSeconds: number;
}

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

type ViewMode = 'students' | 'student-detail';
type DetailTab = 'profile' | 'progress' | 'insights';

// ─── Component ──────────────────────────────────────────────────────────────

export const ExploreModal: React.FC<ExploreModalProps> = ({ isOpen, onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('students');
  const [allStudents, setAllStudents] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Student detail
  const [selectedStudent, setSelectedStudent] = useState<SearchResult | null>(null);
  const [detailStats, setDetailStats] = useState<StudentDetailedStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('profile');

  // All quest definitions (fetched dynamically from API, not hardcoded)
  const [questDefinitions, setQuestDefinitions] = useState<Quest[]>([]);

  // ─── Fetch All Students ───────────────────────────────────────────────

  const fetchAllStudents = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/students/search?page=1');
      const data = await resp.json();

      if (data.success) {
        let all = data.students as SearchResult[];
        const totalPages = Math.ceil(data.total / data.pageSize);
        for (let p = 2; p <= totalPages; p++) {
          const r = await fetch(`/api/students/search?page=${p}`);
          const d = await r.json();
          if (d.success) all = [...all, ...d.students];
        }
        setAllStudents(all);
      } else {
        setAllStudents([]);
      }
    } catch {
      setAllStudents([]);
    }
    setLoading(false);
  }, []);

  const fetchQuestDefinitions = useCallback(async () => {
    try {
      const resp = await fetch('/api/quests/definitions');
      const data = await resp.json();
      if (data.success) {
        setQuestDefinitions(data.quests as Quest[]);
      }
    } catch {
      // Silently fail — mastery will show empty
    }
  }, []);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      fetchAllStudents();
      fetchQuestDefinitions();
    } else {
      // Reset when closed
      setViewMode('students');
      setSelectedStudent(null);
      setDetailStats(null);
      setSearchQuery('');
    }
  }, [isOpen, fetchAllStudents, fetchQuestDefinitions]);

  // ─── Computed Data ────────────────────────────────────────────────────

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return allStudents;
    const q = searchQuery.trim().toLowerCase();
    return allStudents.filter(
      (s) =>
        s.username.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q),
    );
  }, [allStudents, searchQuery]);

  // ─── Navigation ───────────────────────────────────────────────────────

  const openStudentDetail = async (student: SearchResult) => {
    setSelectedStudent(student);
    setDetailTab('profile');
    setViewMode('student-detail');
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/analytics/student-stats/${student.id}`);
      const data = await response.json();
      if (data.success) {
        setDetailStats(data);
      } else {
        setDetailStats(null);
      }
    } catch {
      setDetailStats(null);
    }
    setDetailLoading(false);
  };

  const goBack = () => {
    setSelectedStudent(null);
    setDetailStats(null);
    setViewMode('students');
  };

  // Compute mastery for selected student
  const selectedMastery: TopicMastery[] = useMemo(() => {
    if (!detailStats || questDefinitions.length === 0) return [];
    const completedIds = new Set(
      detailStats.questProgress
        .filter((q) => q.state === 'completed')
        .map((q) => q.questId),
    );
    const completedDefs = questDefinitions.filter((q) => completedIds.has(q.id));
    return computeTopicMastery(questDefinitions, completedDefs);
  }, [detailStats, questDefinitions]);

  const selectedTags = useMemo(() => getActiveMasteryTags(selectedMastery), [selectedMastery]);

  // ─── Helpers ──────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Header title
  const headerTitle = viewMode === 'students'
    ? 'Explore'
    : `${selectedStudent?.username}'s Profile`;

  if (!isOpen) return null;

  // ─── Render ───────────────────────────────────────────────────────────

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
          <div style={{
            backgroundColor: '#007acc',
            color: 'white',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {viewMode === 'student-detail' && (
                <button
                  onClick={goBack}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'BoldPixels, monospace',
                    fontSize: '14px',
                  }}
                >
                  ←
                </button>
              )}
              <h2 style={{
                margin: 0,
                fontSize: '28px',
                fontFamily: 'BoldPixels, monospace',
                fontWeight: 'bold',
              }}>
                {headerTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '28px',
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

          {/* Search Bar (students view only) */}
          {viewMode === 'students' && (
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#252526',
              borderBottom: '1px solid #3c3c3c',
            }}>
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1e1e1e',
                  border: '2px solid #3c3c3c',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: 'white',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels, monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#007acc'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#3c3c3c'}
              />
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

            {/* ─── Students List ──────────────────────────────────── */}
            {viewMode === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#cccccc', fontFamily: 'BoldPixels, monospace', fontSize: '16px' }}>
                    Loading students...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#666666', fontFamily: 'BoldPixels, monospace', fontSize: '16px' }}>
                    {searchQuery.trim() ? 'No students match your search.' : 'No students found.'}
                  </div>
                ) : (
                  <>
                    <div style={{ color: '#888888', fontSize: '16px', fontFamily: 'BoldPixels, monospace' }}>
                      {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          onClick={() => openStudentDetail(student)}
                          style={{
                            backgroundColor: '#1e1e1e',
                            border: '2px solid #3c3c3c',
                            borderRadius: '8px',
                            padding: '14px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#252526';
                            e.currentTarget.style.borderColor = '#007acc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1e1e1e';
                            e.currentTarget.style.borderColor = '#3c3c3c';
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #007acc, #00c9ff)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '26px',
                            fontWeight: 'bold',
                            fontFamily: 'BoldPixels, monospace',
                            flexShrink: 0,
                          }}>
                            {student.username.charAt(0).toUpperCase()}
                          </div>
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', fontFamily: 'BoldPixels, monospace' }}>
                              {student.username}
                            </div>
                          </div>
                          {/* Quick Stats */}
                          <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7ed321', fontFamily: 'BoldPixels, monospace' }}>
                                {student.questsCompleted}
                              </div>
                              <div style={{ fontSize: '14px', color: '#999999', fontFamily: 'BoldPixels, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                                QUESTS
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00c9ff', fontFamily: 'BoldPixels, monospace' }}>
                                {formatTime(student.totalTimeSeconds)}
                              </div>
                              <div style={{ fontSize: '14px', color: '#999999', fontFamily: 'BoldPixels, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                                TIME
                              </div>
                            </div>
                          </div>
                          {/* Arrow */}
                          <span style={{ color: '#666666', fontSize: '14px' }}>▶</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── Student Detail View ────────────────────────────── */}
            {viewMode === 'student-detail' && selectedStudent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {detailLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#cccccc', fontFamily: 'BoldPixels, monospace' }}>
                    Loading student data...
                  </div>
                ) : !detailStats ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                    Unable to load student data.
                  </div>
                ) : (
                  <>
                    {/* ─── Student Info Card (mirrors admin header) ─── */}
                    <div style={{
                      backgroundColor: '#1e1e1e',
                      border: '2px solid #3c3c3c',
                      borderRadius: '8px',
                      padding: '24px',
                    }}>
                      {/* Top row: avatar + info */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '16px' }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #007acc, #00c9ff)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '28px',
                          fontWeight: 'bold',
                          fontFamily: 'BoldPixels, monospace',
                          flexShrink: 0,
                        }}>
                          {selectedStudent.username.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: 'white', fontFamily: 'BoldPixels, monospace' }}>
                            {selectedStudent.username}
                          </h3>
                          {detailStats.student.displayName !== selectedStudent.username && (
                            <p style={{ margin: '3px 0 0', fontSize: '14px', color: '#999999', fontFamily: 'BoldPixels, monospace' }}>
                              {detailStats.student.displayName}
                            </p>
                          )}
                          <div style={{ fontSize: '16px', color: '#888888', fontFamily: 'BoldPixels, monospace', marginTop: '6px' }}>
                            Joined: {formatDate(detailStats.student.joinedAt)}
                          </div>

                          {/* Mastery Tags (inline, like admin) */}
                          {selectedTags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                              {selectedTags.map((tag) => {
                                const colors = MASTERY_COLORS[tag.level];
                                return (
                                  <span key={tag.topic} style={{
                                    padding: '6px 14px',
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '20px',
                                    fontSize: '15px',
                                    fontFamily: 'BoldPixels, monospace',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}>
                                    {tag.level === 'mastered' ? '✓' : '◐'} {tag.topic}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Summary Stats Row (mirrors admin stats row) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '12px',
                        borderTop: '1px solid #3c3c3c',
                        paddingTop: '16px',
                      }}>
                        {[
                          { label: 'QUESTS COMPLETED', value: String(detailStats.summary.completedQuests) },
                          { label: 'TOTAL QUESTS', value: String(detailStats.summary.totalQuests) },
                          { label: 'TOTAL TIME', value: formatTime(detailStats.summary.totalTimeSpent) },
                          { label: 'ATTEMPTS', value: String(detailStats.summary.totalAttempts) },
                        ].map((stat) => (
                          <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', fontFamily: 'BoldPixels, monospace' }}>
                                {stat.value}
                              </div>
                              <div style={{ fontSize: '14px', color: '#999999', fontFamily: 'BoldPixels, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                                {stat.label}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ─── Tab Navigation (mirrors admin tabs) ─── */}
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      borderBottom: '2px solid #3c3c3c',
                      paddingBottom: '0',
                    }}>
                      {(['profile', 'progress', 'insights'] as DetailTab[]).map((tab) => {
                        const labelMap = { profile: 'Profile', progress: 'Quest Progress', insights: 'Topic Mastery' };
                        return (
                          <button
                            key={tab}
                            onClick={() => setDetailTab(tab)}
                            style={{
                              padding: '12px 20px',
                              backgroundColor: 'transparent',
                              color: detailTab === tab ? '#00c9ff' : '#888888',
                              border: 'none',
                              borderBottom: detailTab === tab ? '2px solid #00c9ff' : '2px solid transparent',
                              marginBottom: '-2px',
                              cursor: 'pointer',
                              fontFamily: 'BoldPixels, monospace',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                              if (detailTab !== tab) e.currentTarget.style.color = '#cccccc';
                            }}
                            onMouseLeave={(e) => {
                              if (detailTab !== tab) e.currentTarget.style.color = '#888888';
                            }}
                          >
                            {labelMap[tab]}
                          </button>
                        );
                      })}
                    </div>

                    {/* ─── Profile Tab (mirrors admin profile tab) ─── */}
                    {detailTab === 'profile' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                          {(() => {
                            const completionRate = detailStats.summary.totalQuests > 0
                              ? Math.round((detailStats.summary.completedQuests / detailStats.summary.totalQuests) * 100)
                              : 0;
                            return [
                              { label: 'Completion Rate', value: `${completionRate}%`, color: '#00c9ff' },
                              { label: 'Quests Done', value: String(detailStats.summary.completedQuests), color: '#00c9ff' },
                              { label: 'Total Time', value: formatTime(detailStats.summary.totalTimeSpent), color: '#00c9ff' },
                              { label: 'Attempts', value: String(detailStats.summary.totalAttempts), color: '#00c9ff' },
                            ];
                          })().map((card) => (
                            <div key={card.label} style={{
                              backgroundColor: '#1e1e1e',
                              border: '1px solid #3c3c3c',
                              borderRadius: '8px',
                              padding: '16px',
                              textAlign: 'center',
                            }}>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: card.color, fontFamily: 'BoldPixels, monospace', marginBottom: '4px' }}>
                                {card.value}
                              </div>
                              <div style={{ fontSize: '14px', color: '#999999', fontFamily: 'BoldPixels, monospace', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                                {card.label}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Topic Mastery Section (mirrors admin) */}
                        <div style={{
                          backgroundColor: '#1e1e1e',
                          border: '1px solid #3c3c3c',
                          borderRadius: '8px',
                          padding: '20px',
                        }}>
                          <h4 style={{ margin: '0 0 14px', fontSize: '18px', color: 'white', fontFamily: 'BoldPixels, monospace', fontWeight: 'bold' }}>
                            Topic Mastery
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {selectedMastery.filter(tm => tm.totalQuests > 0).map((tm) => {
                              const barColor = tm.level === 'mastered' ? '#22c55e'
                                : tm.level === 'in-progress' ? '#eab308'
                                : '#555555';
                              const levelLabel = tm.level === 'mastered' ? 'MASTERED'
                                : tm.level === 'in-progress' ? 'IN PROGRESS'
                                : 'NOT STARTED';
                              const levelBg = tm.level === 'mastered' ? 'rgba(34,197,94,0.15)'
                                : tm.level === 'in-progress' ? 'rgba(234,179,8,0.15)'
                                : 'rgba(85,85,85,0.15)';
                              return (
                                <div key={tm.topic}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#cccccc', fontFamily: 'BoldPixels, monospace' }}>
                                        {tm.topic}
                                      </span>
                                      <span style={{
                                        padding: '3px 10px',
                                        backgroundColor: levelBg,
                                        color: barColor,
                                        borderRadius: '20px',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        fontFamily: 'BoldPixels, monospace',
                                        border: `1px solid ${barColor}`,
                                      }}>
                                        {levelLabel}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: barColor, fontFamily: 'BoldPixels, monospace' }}>
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
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span style={{ fontSize: '14px', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                                      {tm.completedQuests}/{tm.totalQuests} quests
                                    </span>
                                    <span style={{ fontSize: '14px', color: '#888888', fontFamily: 'BoldPixels, monospace', fontStyle: 'italic' }}>
                                      {TOPIC_DESCRIPTIONS[tm.topic] || ''}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {selectedMastery.filter(tm => tm.totalQuests > 0).length === 0 && (
                              <div style={{ textAlign: 'center', padding: '20px 0', color: '#666666', fontFamily: 'BoldPixels, monospace' }}>
                                No quest data available to compute mastery.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recent Quest Activity (mirrors admin) */}
                        <div style={{
                          backgroundColor: '#1e1e1e',
                          border: '1px solid #3c3c3c',
                          borderRadius: '8px',
                          padding: '20px',
                        }}>
                          <h4 style={{ margin: '0 0 14px', fontSize: '18px', color: 'white', fontFamily: 'BoldPixels, monospace', fontWeight: 'bold' }}>
                            Recent Quest Activity
                          </h4>
                          {detailStats.questProgress.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {detailStats.questProgress.slice(0, 5).map((qp) => {
                                const statusColor = qp.state === 'completed' ? '#22c55e'
                                  : qp.state === 'active' ? '#eab308'
                                  : '#888888';
                                return (
                                  <div key={qp.questId} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    backgroundColor: '#252526',
                                    borderRadius: '6px',
                                  }}>
                                    <div>
                                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', fontFamily: 'BoldPixels, monospace' }}>
                                        {qp.questTitle || qp.questId}
                                      </div>
                                      <div style={{ fontSize: '14px', color: '#888888', fontFamily: 'BoldPixels, monospace', marginTop: '4px' }}>
                                        {qp.state === 'completed' && qp.completedAt
                                          ? `Completed ${formatDate(qp.completedAt)}`
                                          : qp.startedAt
                                          ? `Started ${formatDate(qp.startedAt)}`
                                          : ''}
                                      </div>
                                    </div>
                                    <span style={{
                                      padding: '4px 10px',
                                      backgroundColor: statusColor,
                                      color: 'white',
                                      borderRadius: '3px',
                                      fontSize: '13px',
                                      fontWeight: 'bold',
                                      fontFamily: 'BoldPixels, monospace',
                                      textTransform: 'uppercase',
                                    }}>
                                      {qp.state}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#666666', fontFamily: 'BoldPixels, monospace', fontSize: '14px' }}>
                              No quest activity yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ─── Quest Progress Tab ─────────────────────── */}
                    {detailTab === 'progress' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {detailStats.questProgress.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#666666', fontFamily: 'BoldPixels, monospace' }}>
                            No quest progress data.
                          </div>
                        ) : (
                          detailStats.questProgress.map((qp) => {
                            const statusColor = qp.state === 'completed' ? '#22c55e'
                              : qp.state === 'active' ? '#eab308'
                              : '#888888';
                            return (
                              <div key={qp.questId} style={{
                                backgroundColor: '#1e1e1e',
                                border: `1px solid ${statusColor}`,
                                borderRadius: '6px',
                                padding: '16px',
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 10px',
                                      backgroundColor: statusColor,
                                      color: 'white',
                                      fontSize: '13px',
                                      fontWeight: 'bold',
                                      borderRadius: '3px',
                                      fontFamily: 'BoldPixels, monospace',
                                      textTransform: 'uppercase',
                                      marginBottom: '6px',
                                    }}>
                                      {qp.state}
                                    </span>
                                    <h5 style={{ margin: '4px 0 0', fontSize: '18px', color: 'white', fontFamily: 'BoldPixels, monospace' }}>
                                      {qp.questTitle || qp.questId}
                                    </h5>
                                  </div>
                                </div>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(4, 1fr)',
                                  gap: '8px',
                                  marginTop: '12px',
                                  fontSize: '14px',
                                  fontFamily: 'BoldPixels, monospace',
                                }}>
                                  <div>
                                    <div style={{ color: '#888888', fontSize: '13px' }}>STARTED</div>
                                    <div style={{ color: '#cccccc', fontWeight: 'bold', marginTop: '2px' }}>{qp.startedAt ? formatDate(qp.startedAt) : '-'}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#888888', fontSize: '13px' }}>COMPLETED</div>
                                    <div style={{ color: qp.completedAt ? '#22c55e' : '#cccccc', fontWeight: 'bold', marginTop: '2px' }}>
                                      {qp.completedAt ? formatDate(qp.completedAt) : '-'}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#888888', fontSize: '13px' }}>TIME SPENT</div>
                                    <div style={{ color: '#cccccc', fontWeight: 'bold', marginTop: '2px' }}>{qp.timeSpentSeconds > 0 ? formatTime(qp.timeSpentSeconds) : '-'}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#888888', fontSize: '13px' }}>ATTEMPTS</div>
                                    <div style={{ color: '#cccccc', fontWeight: 'bold', marginTop: '2px' }}>{qp.attempts || 0}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* ─── Topic Mastery Tab (full detail) ─────────── */}
                    {detailTab === 'insights' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {selectedMastery.filter(tm => tm.totalQuests > 0).map((tm) => {
                          const barColor = tm.level === 'mastered' ? '#7ed321'
                            : tm.level === 'in-progress' ? '#f5a623'
                            : '#555555';
                          const levelLabel = tm.level === 'mastered' ? 'MASTERED'
                            : tm.level === 'in-progress' ? 'IN PROGRESS'
                            : 'NOT STARTED';
                          const levelBg = tm.level === 'mastered' ? 'rgba(34,197,94,0.15)'
                            : tm.level === 'in-progress' ? 'rgba(234,179,8,0.15)'
                            : 'rgba(85,85,85,0.15)';
                          return (
                            <div key={tm.topic} style={{
                              backgroundColor: '#1e1e1e',
                              border: '1px solid #3c3c3c',
                              borderRadius: '8px',
                              padding: '18px',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#cccccc', fontFamily: 'BoldPixels, monospace' }}>
                                    {tm.topic}
                                  </span>
                                  <span style={{
                                    padding: '3px 10px',
                                    backgroundColor: levelBg,
                                    color: barColor,
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    fontFamily: 'BoldPixels, monospace',
                                    border: `1px solid ${barColor}`,
                                  }}>
                                    {levelLabel}
                                  </span>
                                </div>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: barColor, fontFamily: 'BoldPixels, monospace' }}>
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span style={{ fontSize: '14px', color: '#888888', fontFamily: 'BoldPixels, monospace' }}>
                                  {tm.completedQuests}/{tm.totalQuests} quests
                                </span>
                                <span style={{ fontSize: '14px', color: '#888888', fontFamily: 'BoldPixels, monospace', fontStyle: 'italic' }}>
                                  {TOPIC_DESCRIPTIONS[tm.topic] || ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {selectedMastery.filter(tm => tm.totalQuests > 0).length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#666666', fontFamily: 'BoldPixels, monospace' }}>
                            No proficiency data available.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid #3c3c3c',
            backgroundColor: '#252526',
            textAlign: 'center',
          }}>
            <span style={{
              color: '#888888',
              fontFamily: 'BoldPixels, monospace',
              fontSize: '14px',
            }}>
              {viewMode === 'students'
                ? `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`
                : `Viewing ${selectedStudent?.username}'s profile`
              }
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExploreModal;
