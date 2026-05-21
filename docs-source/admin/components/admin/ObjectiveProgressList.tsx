import { useState } from 'react';
import { Target, ChevronDown, ChevronRight, Calendar, Clock, RotateCcw, Lightbulb } from 'lucide-react';

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
      <div className="text-center py-12 px-8 bg-white border border-gray-200 rounded-xl shadow-sm">
        <Target className="text-5xl mb-4 opacity-30 text-gray-400" size={48} />
        <p className="text-gray-500 text-base m-0">No objective progress data yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
          <div className="font-pixel text-[1.75rem] text-admin-primary leading-none mb-2 font-bold">{stats.totalObjectives}</div>
          <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Objectives Completed</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
          <div className="font-pixel text-[1.75rem] text-admin-primary leading-none mb-2 font-bold">{formatTime(stats.totalTime)}</div>
          <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Total Time</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
          <div className="font-pixel text-[1.75rem] text-admin-primary leading-none mb-2 font-bold">{stats.totalAttempts}</div>
          <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Total Attempts</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
          <div className="font-pixel text-[1.75rem] text-admin-primary leading-none mb-2 font-bold">{stats.totalHints}</div>
          <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Hints Used</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5">
          <div className="font-pixel text-[1.75rem] text-admin-primary leading-none mb-2 font-bold">{formatTime(stats.avgTime)}</div>
          <div className="text-gray-500 text-xs uppercase tracking-wider font-medium">Avg Time/Objective</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap max-tablet:flex-col max-tablet:items-start">
        <div className="text-gray-500 font-pixel text-[0.9rem] font-medium">Sort by:</div>
        <div className="flex gap-2 flex-wrap max-tablet:w-full">
          <button
            className={`bg-white border border-gray-200 rounded-md py-2 px-4 text-gray-500 font-pixel text-[0.85rem] cursor-pointer transition-all duration-300 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 max-tablet:flex-1 max-tablet:text-center ${sortBy === 'completed' ? 'bg-admin-primary border-admin-primary text-white' : ''}`}
            onClick={() => setSortBy('completed')}
          >
            Recently Completed
          </button>
          <button
            className={`bg-white border border-gray-200 rounded-md py-2 px-4 text-gray-500 font-pixel text-[0.85rem] cursor-pointer transition-all duration-300 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 max-tablet:flex-1 max-tablet:text-center ${sortBy === 'time' ? 'bg-admin-primary border-admin-primary text-white' : ''}`}
            onClick={() => setSortBy('time')}
          >
            Time Spent
          </button>
          <button
            className={`bg-white border border-gray-200 rounded-md py-2 px-4 text-gray-500 font-pixel text-[0.85rem] cursor-pointer transition-all duration-300 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 max-tablet:flex-1 max-tablet:text-center ${sortBy === 'attempts' ? 'bg-admin-primary border-admin-primary text-white' : ''}`}
            onClick={() => setSortBy('attempts')}
          >
            Attempts
          </button>
        </div>
      </div>

      {/* Quest List */}
      <div className="flex flex-col gap-4">
        {Object.keys(objectivesByQuest).map((questId) => {
          const objectives = objectivesByQuest[questId];
          const isExpanded = expandedQuest === questId;
          const questTitle = getQuestTitle(questId);

          return (
            <div key={questId} className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-4 p-4 cursor-pointer select-none transition-colors duration-300 hover:bg-gray-50" onClick={() => toggleQuestExpand(questId)}>
                {isExpanded ? (
                  <ChevronDown className="text-admin-primary transition-transform duration-300" size={20} />
                ) : (
                  <ChevronRight className="text-admin-primary transition-transform duration-300" size={20} />
                )}
                <div className="flex-1">
                  <h3 className="font-pixel text-xl text-gray-800 m-0 mb-2 max-tablet:text-[1.1rem]">{questTitle}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500 text-[0.85rem]">
                      {objectives.length} objective{objectives.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500 text-[0.85rem]">
                      {formatTime(objectives.reduce((sum, obj) => sum + obj.timeSpentSeconds, 0))} total
                    </span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="py-0 px-4 pb-4 border-t border-gray-200 bg-gray-50">
                  {objectives.map((objective) => (
                    <div key={objective.id} className="py-4 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-start gap-4 max-tablet:flex-col">
                        <div className="bg-admin-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-pixel text-[0.9rem] font-bold flex-shrink-0 max-tablet:self-start">
                          {objective.objectiveIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-800 text-base mb-2 leading-relaxed">
                            {objective.objectiveDescription}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-500 text-[0.85rem]">
                              <Calendar size={14} className="inline mr-1" /> {formatDate(objective.completedAt)}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 text-[0.85rem]">
                              <Clock size={14} className="inline mr-1" /> {formatTime(objective.timeSpentSeconds)}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 text-[0.85rem]">
                              <RotateCcw size={14} className="inline mr-1" /> {objective.attempts} attempt{objective.attempts !== 1 ? 's' : ''}
                            </span>
                            {objective.hintsUsed > 0 && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-500 text-[0.85rem]">
                                  <Lightbulb size={14} className="inline mr-1" /> {objective.hintsUsed} hint{objective.hintsUsed !== 1 ? 's' : ''}
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
