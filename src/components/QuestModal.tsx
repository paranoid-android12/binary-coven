import React, { useState, useEffect } from 'react';
import { Quest, QuestDifficulty, QuestProgress, QuestPhase } from '../types/quest';
import { useGameStore } from '../stores/gameStore';
import { EventBus } from '../game/EventBus';

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'available' | 'active' | 'completed';

export const QuestModal: React.FC<QuestModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const gameStore = useGameStore();

  // Listen to quest events to refresh the UI
  useEffect(() => {
    const handleQuestEvent = () => {
      // Refresh quest state from QuestManager
      gameStore.refreshQuestState();
      setRefreshTrigger(prev => prev + 1);
    };

    EventBus.on('quest-started', handleQuestEvent);
    EventBus.on('quest-completed', handleQuestEvent);
    EventBus.on('quest-cancelled', handleQuestEvent);
    EventBus.on('quest-unlocked', handleQuestEvent);
    EventBus.on('quest-phase-started', handleQuestEvent);
    EventBus.on('quest-phase-completed', handleQuestEvent);
    EventBus.on('quest-objective-completed', handleQuestEvent);

    return () => {
      EventBus.removeListener('quest-started');
      EventBus.removeListener('quest-completed');
      EventBus.removeListener('quest-cancelled');
      EventBus.removeListener('quest-unlocked');
      EventBus.removeListener('quest-phase-started');
      EventBus.removeListener('quest-phase-completed');
      EventBus.removeListener('quest-objective-completed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh quest state when modal opens
  useEffect(() => {
    if (isOpen) {
      gameStore.refreshQuestState();
      setRefreshTrigger(prev => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Get quests for each tab
  const availableQuests = gameStore.getAvailableQuests();
  const activeQuest = gameStore.getActiveQuest();
  const completedQuests = gameStore.getCompletedQuests();

  // Reset selected quest when switching tabs or when quest state changes
  useEffect(() => {
    setSelectedQuest(null);
  }, [activeTab, refreshTrigger]);

  if (!isOpen) return null;

  const handleStartQuest = (questId: string) => {
    const success = gameStore.startQuest(questId);
    if (success) {
      setActiveTab('active');
      setSelectedQuest(null);
      onClose();
    }
  };

  const handleCancelQuest = () => {
    const success = gameStore.cancelQuest();
    if (success) {
      setSelectedQuest(null);
    }
  };

  const handleRestartQuest = () => {
    const success = gameStore.restartQuest();
    if (success) {
      setSelectedQuest(null);
      onClose();
      // Show a notification
      console.log('[QuestModal] Quest restarted successfully');
    }
  };

  const getDifficultyColor = (difficulty: QuestDifficulty): string => {
    switch (difficulty) {
      case 'beginner': return '#7ed321';
      case 'intermediate': return '#f5a623';
      case 'advanced': return '#e81123';
      default: return '#007acc';
    }
  };

  const getQuestProgress = (questId: string): QuestProgress | undefined => {
    return gameStore.getQuestProgress(questId);
  };

  const calculateQuestCompletion = (quest: Quest, progress?: QuestProgress): number => {
    if (!progress) return 0;
    const totalPhases = quest.phases.length;
    const completedPhases = progress.currentPhaseIndex;
    return Math.round((completedPhases / totalPhases) * 100);
  };

  const renderQuestCard = (quest: Quest, isActive = false) => {
    const progress = getQuestProgress(quest.id);
    const completionPercent = calculateQuestCompletion(quest, progress);

    return (
      <div
        key={quest.id}
        onClick={() => setSelectedQuest(quest)}
        style={{
          backgroundColor: '#1e1e1e',
          border: `2px solid ${isActive ? '#f5a623' : '#3c3c3c'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007acc';
          e.currentTarget.style.backgroundColor = '#252526';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isActive ? '#f5a623' : '#3c3c3c';
          e.currentTarget.style.backgroundColor = '#1e1e1e';
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {/* Quest Icon */}
          {quest.icon && (
            <div
              style={{
                width: '64px',
                height: '64px',
                minWidth: '64px',
                backgroundImage: `url(/assets/${quest.icon})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
                border: '2px solid #3c3c3c',
                borderRadius: '4px',
              }}
            />
          )}

          {/* Quest Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px',
                fontFamily: 'BoldPixels, monospace',
              }}
            >
              {quest.title}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {/* Difficulty Badge */}
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: getDifficultyColor(quest.difficulty),
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  fontFamily: 'BoldPixels, monospace',
                }}
              >
                {quest.difficulty}
              </span>

              {/* Category Badge */}
              {quest.category && (
                <span
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#3c3c3c',
                    color: '#cccccc',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'BoldPixels, monospace',
                  }}
                >
                  {quest.category}
                </span>
              )}

              {/* Estimated Time Badge */}
              {quest.estimatedTime && (
                <span
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#3c3c3c',
                    color: '#cccccc',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'BoldPixels, monospace',
                  }}
                >
                  {quest.estimatedTime} min
                </span>
              )}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: '14px',
                color: '#cccccc',
                marginBottom: '8px',
                fontFamily: 'BoldPixels, monospace',
                lineHeight: '1.5',
              }}
            >
              {quest.description}
            </div>

            {/* Progress Bar (for active quests) */}
            {isActive && progress && (
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#cccccc',
                    marginBottom: '4px',
                    fontFamily: 'BoldPixels, monospace',
                  }}
                >
                  <span>
                    Phase {progress.currentPhaseIndex + 1} / {quest.phases.length}
                  </span>
                  <span>{completionPercent}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#3c3c3c',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${completionPercent}%`,
                      height: '100%',
                      backgroundColor: '#007acc',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderQuestDetail = (quest: Quest) => {
    const progress = getQuestProgress(quest.id);
    const isActive = activeQuest?.id === quest.id;
    const isCompleted = completedQuests.some(q => q.id === quest.id);
    const stuckStatus = isActive ? gameStore.isQuestStuck() : { isStuck: false };

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Stuck Warning Banner */}
        {isActive && stuckStatus.isStuck && (
          <div
            style={{
              backgroundColor: '#e81123',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '4px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'BoldPixels, monospace',
              fontSize: '14px',
              border: '2px solid #ff4444',
            }}
          >
            <div style={{ fontSize: '24px' }}>⚠</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Quest May Be Stuck</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>{stuckStatus.reason}</div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => setSelectedQuest(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3c3c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'BoldPixels, monospace',
            marginBottom: '16px',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4c4c4c')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3c3c3c')}
        >
          ← Back to List
        </button>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          {/* Quest Header */}
          <div style={{ marginBottom: '24px' }}>
            {quest.icon && (
              <div
                style={{
                  width: '128px',
                  height: '128px',
                  backgroundImage: `url(/assets/${quest.icon})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  imageRendering: 'pixelated',
                  border: '2px solid #3c3c3c',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              />
            )}

            <h2
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '12px',
                fontFamily: 'BoldPixels, monospace',
              }}
            >
              {quest.title}
            </h2>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 12px',
                  backgroundColor: getDifficultyColor(quest.difficulty),
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  fontFamily: 'BoldPixels, monospace',
                }}
              >
                {quest.difficulty}
              </span>

              {quest.category && (
                <span
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#3c3c3c',
                    color: '#cccccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'BoldPixels, monospace',
                  }}
                >
                  {quest.category}
                </span>
              )}

              {quest.estimatedTime && (
                <span
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#3c3c3c',
                    color: '#cccccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'BoldPixels, monospace',
                  }}
                >
                  ⏱ {quest.estimatedTime} minutes
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: '16px',
                color: '#cccccc',
                lineHeight: '1.6',
                fontFamily: 'BoldPixels, monospace',
              }}
            >
              {quest.description}
            </p>
          </div>

          {/* Prerequisites */}
          {quest.prerequisites && quest.prerequisites.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  color: 'white',
                  marginBottom: '8px',
                  fontFamily: 'BoldPixels, monospace',
                }}
              >
                Prerequisites
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {quest.prerequisites.map((prereqId, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '14px',
                      color: '#cccccc',
                      marginBottom: '4px',
                      fontFamily: 'BoldPixels, monospace',
                    }}
                  >
                    • {prereqId}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quest Phases */}
          <div style={{ marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '18px',
                color: 'white',
                marginBottom: '12px',
                fontFamily: 'BoldPixels, monospace',
              }}
            >
              Quest Phases ({quest.phases.length})
            </h3>
            {quest.phases.map((phase, index) => {
              const isCurrentPhase = progress?.currentPhaseIndex === index;
              const isPhaseCompleted = progress ? progress.currentPhaseIndex > index : false;

              return (
                <div
                  key={phase.id}
                  style={{
                    backgroundColor: isCurrentPhase ? '#2d2d30' : '#1e1e1e',
                    border: `2px solid ${isCurrentPhase ? '#007acc' : '#3c3c3c'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {/* Phase Number/Status */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isPhaseCompleted ? '#7ed321' : isCurrentPhase ? '#007acc' : '#3c3c3c',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontFamily: 'BoldPixels, monospace',
                      }}
                    >
                      {isPhaseCompleted ? '✓' : index + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: 'white',
                          fontFamily: 'BoldPixels, monospace',
                        }}
                      >
                        {phase.title}
                      </div>
                    </div>
                  </div>

                  {phase.description && (
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#cccccc',
                        marginLeft: '32px',
                        fontFamily: 'BoldPixels, monospace',
                        lineHeight: '1.5',
                      }}
                    >
                      {phase.description}
                    </p>
                  )}

                  {/* Phase Objectives */}
                  {phase.objectives && phase.objectives.length > 0 && (
                    <div style={{ marginLeft: '32px', marginTop: '8px' }}>
                      {phase.objectives.map((objective, objIndex) => (
                        <div
                          key={objIndex}
                          style={{
                            fontSize: '13px',
                            color: '#999999',
                            marginBottom: '4px',
                            fontFamily: 'BoldPixels, monospace',
                          }}
                        >
                          • {objective.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rewards */}
          {quest.rewards && quest.rewards.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  color: 'white',
                  marginBottom: '8px',
                  fontFamily: 'BoldPixels, monospace',
                }}
              >
                Rewards
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {quest.rewards.map((reward, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '14px',
                      color: '#cccccc',
                      marginBottom: '4px',
                      fontFamily: 'BoldPixels, monospace',
                    }}
                  >
                    🎁 {reward.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Programming Concepts */}
          {quest.concepts && quest.concepts.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '18px',
                  color: 'white',
                  marginBottom: '8px',
                  fontFamily: 'BoldPixels, monospace',
                }}
              >
                What You'll Learn
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {quest.concepts.map((concept, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#3c3c3c',
                      color: '#cccccc',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'BoldPixels, monospace',
                    }}
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          {!isActive && !isCompleted && (
            <button
              onClick={() => handleStartQuest(quest.id)}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#007acc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontFamily: 'BoldPixels, monospace',
                fontWeight: 'bold',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#005a9e')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#007acc')}
            >
              Start Quest
            </button>
          )}

          {isActive && (
            <>
              <button
                onClick={() => {
                  console.log('[QuestModal] Continue Quest button clicked');
                  console.log(`[QuestModal] Active quest: ${activeQuest?.title} (${activeQuest?.id})`);
                  const progress = activeQuest ? getQuestProgress(activeQuest.id) : undefined;
                  if (progress) {
                    console.log(`[QuestModal] Current phase: ${progress.currentPhaseIndex + 1}/${activeQuest?.phases.length}`);
                  }
                  onClose(); // Close the modal to continue with the active quest
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#007acc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels, monospace',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#005a9e')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#007acc')}
              >
                Continue Quest
              </button>
              <button
                onClick={handleRestartQuest}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#f5a623',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels, monospace',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d48e1c')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5a623')}
              >
                Restart Quest
              </button>
              <button
                onClick={handleCancelQuest}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#e81123',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'BoldPixels, monospace',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c50011')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e81123')}
              >
                Cancel Quest
              </button>
            </>
          )}

          {isCompleted && (
            <div
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: '#7ed321',
                color: 'white',
                borderRadius: '4px',
                fontSize: '16px',
                fontFamily: 'BoldPixels, monospace',
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              ✓ Completed
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    // If a quest is selected, show detail view
    if (selectedQuest) {
      return renderQuestDetail(selectedQuest);
    }

    // Otherwise, show list view based on active tab
    switch (activeTab) {
      case 'available':
        if (availableQuests.length === 0) {
          return (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#999999',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '16px',
              }}
            >
              No available quests at the moment.
              <br />
              Complete active quests to unlock more!
            </div>
          );
        }
        return availableQuests.map(quest => renderQuestCard(quest, false));

      case 'active':
        if (!activeQuest) {
          return (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#999999',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '16px',
              }}
            >
              No active quest.
              <br />
              Start a quest from the Available tab!
            </div>
          );
        }
        return renderQuestCard(activeQuest, true);

      case 'completed':
        if (completedQuests.length === 0) {
          return (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#999999',
                fontFamily: 'BoldPixels, monospace',
                fontSize: '16px',
              }}
            >
              No completed quests yet.
              <br />
              Start your journey from the Available tab!
            </div>
          );
        }
        return completedQuests.map(quest => renderQuestCard(quest, false));

      default:
        return null;
    }
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
                fontSize: '24px',
                fontFamily: 'BoldPixels, monospace',
                fontWeight: 'bold',
              }}
            >
              Quest Log
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
              onClick={() => setActiveTab('available')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: activeTab === 'available' ? '#007acc' : 'transparent',
                color: activeTab === 'available' ? 'white' : '#cccccc',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontFamily: 'BoldPixels, monospace',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'available') e.currentTarget.style.backgroundColor = '#3c3c3c';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'available') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Available ({availableQuests.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: activeTab === 'active' ? '#007acc' : 'transparent',
                color: activeTab === 'active' ? 'white' : '#cccccc',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontFamily: 'BoldPixels, monospace',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'active') e.currentTarget.style.backgroundColor = '#3c3c3c';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'active') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Active ({activeQuest ? 1 : 0})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: activeTab === 'completed' ? '#007acc' : 'transparent',
                color: activeTab === 'completed' ? 'white' : '#cccccc',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontFamily: 'BoldPixels, monospace',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'completed') e.currentTarget.style.backgroundColor = '#3c3c3c';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'completed') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Completed ({completedQuests.length})
            </button>
          </div>

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            {renderTabContent()}
          </div>

          {/* Footer with Statistics */}
          <div
            style={{
              backgroundColor: '#252526',
              padding: '12px 24px',
              borderTop: '1px solid #3c3c3c',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#cccccc',
                fontFamily: 'BoldPixels, monospace',
              }}
            >
              {completedQuests.length} / {availableQuests.length + completedQuests.length + (activeQuest ? 1 : 0)} Quests Completed
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#cccccc',
                fontFamily: 'BoldPixels, monospace',
              }}
            >
              {activeQuest ? '⚡ Quest in Progress' : ''}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
