import React, { useState, useEffect } from 'react';
import { Lesson, LessonProgress, LessonDifficulty, ProgrammingConcept } from '../types/game';
import { useGameStore } from '../stores/gameStore';
import { EventBus } from '../game/EventBus';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ isOpen, onClose }) => {
  const {
    activeLesson,
    availableLessons,
    getLessonProgress,
    startLesson,
    endLesson,
    getNextLesson
  } = useGameStore();

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonDetail, setShowLessonDetail] = useState(false);

  useEffect(() => {
    if (isOpen && !showLessonDetail) {
      setSelectedLesson(null);
    }
  }, [isOpen, showLessonDetail]);

  if (!isOpen) return null;

  const getDifficultyColor = (difficulty: LessonDifficulty): string => {
    switch (difficulty) {
      case LessonDifficulty.BEGINNER: return '#7ed321';
      case LessonDifficulty.INTERMEDIATE: return '#f5a623';
      case LessonDifficulty.ADVANCED: return '#e81123';
      default: return '#007acc';
    }
  };

  const getConceptColor = (concept: ProgrammingConcept): string => {
    switch (concept) {
      case ProgrammingConcept.FUNCTIONS: return '#7ed321';
      case ProgrammingConcept.VARIABLES: return '#50e3c2';
      case ProgrammingConcept.LOOPS: return '#bd10e0';
      case ProgrammingConcept.CONDITIONALS: return '#f5a623';
      case ProgrammingConcept.ARRAYS: return '#ff6b6b';
      case ProgrammingConcept.OBJECTS: return '#4ecdc4';
      case ProgrammingConcept.MOVEMENT: return '#45b7d1';
      case ProgrammingConcept.INTERACTION: return '#96ceb4';
      case ProgrammingConcept.LOGIC: return '#ffeaa7';
      case ProgrammingConcept.DEBUGGING: return '#dda0dd';
      default: return '#007acc';
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleStartLesson = (lesson: Lesson) => {
    const success = startLesson(lesson.id);
    if (success) {
      setShowLessonDetail(false);
      onClose();
    }
  };

  const handleEndLesson = () => {
    endLesson();
    setShowLessonDetail(false);
    setSelectedLesson(null);
  };

  const LessonCard: React.FC<{ lesson: Lesson; progress?: LessonProgress }> = ({ lesson, progress }) => (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        border: `1px solid ${progress?.completed ? '#7ed321' : '#3c3c3c'}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = getDifficultyColor(lesson.difficulty);
        e.currentTarget.style.backgroundColor = '#252526';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = progress?.completed ? '#7ed321' : '#3c3c3c';
        e.currentTarget.style.backgroundColor = '#1e1e1e';
      }}
      onClick={() => {
        setSelectedLesson(lesson);
        setShowLessonDetail(true);
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            color: 'white',
            fontFamily: 'BoldPixels'
          }}>
            {lesson.title}
          </h3>
          <p style={{
            margin: '4px 0',
            fontSize: '14px',
            color: '#cccccc',
            lineHeight: '1.3'
          }}>
            {lesson.description}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '2px 8px',
            backgroundColor: getDifficultyColor(lesson.difficulty),
            color: 'white',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {lesson.difficulty}
          </span>
          {progress?.completed && (
            <span style={{
              padding: '2px 8px',
              backgroundColor: '#7ed321',
              color: 'white',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              ✓ Complete
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
        <span>⏱️ {formatTime(lesson.estimatedTime)}</span>
        <span>🎯 {lesson.challenges.length} challenge{lesson.challenges.length !== 1 ? 's' : ''}</span>
        <span>🏆 {lesson.objectives.length} objective{lesson.objectives.length !== 1 ? 's' : ''}</span>
      </div>

      {progress && !progress.completed && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#2d2d30',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#ccc'
        }}>
          Progress: {progress.challengeCompletions.size}/{lesson.challenges.length} challenges completed
          {progress.score > 0 && ` • Score: ${progress.score}%`}
        </div>
      )}
    </div>
  );

  const LessonDetailView: React.FC<{ lesson: Lesson; progress?: LessonProgress }> = ({ lesson, progress }) => (
    <div style={{
      backgroundColor: '#1e1e1e',
      border: '1px solid #3c3c3c',
      borderRadius: '8px',
      padding: '20px',
      color: 'white'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            color: getDifficultyColor(lesson.difficulty),
            fontFamily: 'BoldPixels'
          }}>
            {lesson.title}
          </h2>
          <span style={{
            padding: '4px 12px',
            backgroundColor: getDifficultyColor(lesson.difficulty),
            color: 'white',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {lesson.difficulty}
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: '16px',
          color: '#cccccc',
          lineHeight: '1.4'
        }}>
          {lesson.description}
        </p>
      </div>

      {/* Learning Objectives */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          color: '#16c60c',
          marginBottom: '12px',
          fontFamily: 'BoldPixels'
        }}>
          Learning Objectives
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {lesson.objectives.map((objective, index) => (
            <div
              key={objective.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#2d2d30',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <span style={{
                color: objective.completed ? '#7ed321' : '#888',
                fontWeight: 'bold'
              }}>
                {objective.completed ? '✓' : `${index + 1}.`}
              </span>
              <span style={{ color: '#cccccc' }}>
                {objective.description}
              </span>
              <span style={{
                marginLeft: 'auto',
                padding: '2px 6px',
                backgroundColor: getConceptColor(objective.concept),
                color: 'white',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {objective.concept}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Concepts Covered */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          color: '#16c60c',
          marginBottom: '12px',
          fontFamily: 'BoldPixels'
        }}>
          Concepts You'll Learn
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {lesson.concepts.map(concept => (
            <span
              key={concept}
              style={{
                padding: '4px 8px',
                backgroundColor: getConceptColor(concept),
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {concept}
            </span>
          ))}
        </div>
      </div>

      {/* Lesson Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#2d2d30',
        borderRadius: '4px',
        marginBottom: '20px',
        fontSize: '14px',
        color: '#888'
      }}>
        <span>⏱️ Estimated time: {formatTime(lesson.estimatedTime)}</span>
        <span>🎯 Challenges: {lesson.challenges.length}</span>
        <span>🏆 Objectives: {lesson.objectives.length}</span>
      </div>

      {/* Introduction */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          color: '#16c60c',
          marginBottom: '12px',
          fontFamily: 'BoldPixels'
        }}>
          About This Lesson
        </h3>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#cccccc',
          lineHeight: '1.5',
          backgroundColor: '#2d2d30',
          padding: '12px',
          borderRadius: '4px'
        }}>
          {lesson.introduction}
        </p>
      </div>

      {/* Progress (if started) */}
      {progress && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            color: '#16c60c',
            marginBottom: '12px',
            fontFamily: 'BoldPixels'
          }}>
            Your Progress
          </h3>
          <div style={{
            padding: '12px',
            backgroundColor: '#2d2d30',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#cccccc'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Status:</strong> {progress.completed ? 'Completed' : 'In Progress'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Challenges:</strong> {progress.challengeCompletions.size}/{lesson.challenges.length} completed
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Score:</strong> {progress.score}%
            </div>
            <div>
              <strong>Time spent:</strong> {Math.round(progress.totalExecutionTime / 1000 / 60)} minutes
            </div>
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {lesson.prerequisites.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            color: '#f5a623',
            marginBottom: '12px',
            fontFamily: 'BoldPixels'
          }}>
            Prerequisites
          </h3>
          <div style={{
            padding: '12px',
            backgroundColor: '#2d2d30',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#cccccc'
          }}>
            Complete these lessons first:
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {lesson.prerequisites.map(prereqId => {
                const prereqLesson = availableLessons.find(l => l.id === prereqId);
                const prereqProgress = getLessonProgress(prereqId);
                return (
                  <li key={prereqId} style={{ marginBottom: '4px' }}>
                    {prereqLesson?.title || prereqId}
                    {prereqProgress?.completed && (
                      <span style={{ color: '#7ed321', marginLeft: '8px' }}>✓</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowLessonDetail(false)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3c3c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Back
        </button>

        {activeLesson?.id === lesson.id ? (
          <button
            onClick={handleEndLesson}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e81123',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            End Lesson
          </button>
        ) : (
          <button
            onClick={() => handleStartLesson(lesson)}
            style={{
              padding: '8px 16px',
              backgroundColor: getDifficultyColor(lesson.difficulty),
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {progress?.completed ? 'Review Lesson' : 'Start Lesson'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 4500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'BoldPixels',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: 'relative',
          width: showLessonDetail ? '700px' : '600px',
          maxWidth: '90vw',
          height: showLessonDetail ? '600px' : '500px',
          maxHeight: '90vh',
          backgroundColor: '#2d2d30',
          border: '2px solid #007acc',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#007acc',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontFamily: 'BoldPixels'
            }}>
              {showLessonDetail ? 'Lesson Details' : 'Programming Lessons'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: showLessonDetail ? '0' : '20px'
        }}>
          {showLessonDetail && selectedLesson ? (
            <LessonDetailView lesson={selectedLesson} progress={getLessonProgress(selectedLesson.id)} />
          ) : (
            <div>
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                border: '1px solid #3c3c3c'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  color: '#16c60c',
                  marginBottom: '8px',
                  fontFamily: 'BoldPixels'
                }}>
                  Learning Path: Programming Fundamentals
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#cccccc',
                  lineHeight: '1.4'
                }}>
                  Follow this structured path to learn programming concepts through hands-on farming challenges.
                  Each lesson builds on the previous one, teaching you essential programming skills.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {availableLessons.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#888',
                    fontSize: '16px',
                    padding: '40px'
                  }}>
                    No lessons available yet. Complete the tutorial first!
                  </div>
                ) : (
                  availableLessons.map(lesson => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      progress={getLessonProgress(lesson.id)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showLessonDetail && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: '#252526',
            borderTop: '1px solid #3c3c3c',
            color: '#888',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            {availableLessons.length} lesson{availableLessons.length !== 1 ? 's' : ''} available
            {activeLesson && ` • Currently in: ${activeLesson.title}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonModal;

