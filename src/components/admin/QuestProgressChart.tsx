import { BarChart3, CheckCircle, Play, AlertCircle, Circle, Lock } from 'lucide-react';

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
        return '#4d7c0f';
      case 'active':
        return '#2563eb';
      case 'failed':
        return '#b91c1c';
      case 'available':
        return '#78716c';
      case 'locked':
        return '#a8a29e';
      default:
        return '#a8a29e';
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
      <div className="text-center py-12 px-8 bg-admin-card border border-admin-border rounded-xl shadow-sm">
        <BarChart3 className="text-5xl mb-4 opacity-30 text-admin-text-faint" size={48} />
        <p className="text-admin-text-muted text-base m-0">No quest progress data yet</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Summary Cards */}
      {!showDetails && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-5">
          <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-center transition-all duration-300 shadow-sm">
            <div className="text-2xl text-admin-accent leading-none mb-2 font-bold">{completedQuests.length}</div>
            <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">Completed</div>
          </div>
          <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-center transition-all duration-300 shadow-sm">
            <div className="text-2xl text-admin-accent leading-none mb-2 font-bold">{activeQuests.length}</div>
            <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">In Progress</div>
          </div>
          <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-center transition-all duration-300 shadow-sm">
            <div className="text-2xl text-admin-accent leading-none mb-2 font-bold">{formatTime(totalTime)}</div>
            <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">Total Time</div>
          </div>
          <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-center transition-all duration-300 shadow-sm">
            <div className="text-2xl text-admin-accent leading-none mb-2 font-bold">{avgAttempts}</div>
            <div className="text-admin-text-muted text-[0.8rem] uppercase tracking-wider font-medium">Avg Attempts</div>
          </div>
        </div>
      )}

      {/* Quest List */}
      <div className="flex flex-col gap-3">
        {questProgress.map((quest) => {
          const IconComponent = getStateIcon(quest.state);
          return (
          <div key={quest.id} className="bg-admin-card border border-admin-border rounded-xl p-4 transition-all duration-300 shadow-sm">
            <div className="flex items-start gap-4 max-tablet:flex-col max-tablet:items-start">
              <div className="flex flex-col items-center gap-2 min-w-[80px] max-tablet:flex-row max-tablet:items-center max-tablet:min-w-0">
                <IconComponent
                  className="text-[2rem] leading-none"
                  size={24}
                  style={{ color: getStateColor(quest.state) }}
                />
                <div
                  className="text-[0.7rem] text-white py-1 px-2 rounded uppercase tracking-wider font-bold"
                  style={{ backgroundColor: getStateColor(quest.state) }}
                >
                  {quest.state}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl text-admin-text m-0 mb-2 font-bold">{quest.questTitle}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-admin-text-muted text-[0.85rem]">
                    Phase {quest.currentPhaseIndex + 1}
                  </span>
                  <span className="text-admin-border">•</span>
                  <span className="text-admin-text-muted text-[0.85rem]">
                    {quest.attempts} attempt{quest.attempts !== 1 ? 's' : ''}
                  </span>
                  <span className="text-admin-border">•</span>
                  <span className="text-admin-text-muted text-[0.85rem]">
                    {formatTime(quest.timeSpentSeconds)}
                  </span>
                  {quest.score > 0 && (
                    <>
                      <span className="text-admin-border">•</span>
                      <span className="text-admin-text-muted text-[0.85rem]">
                        Score: {quest.score}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {showDetails && (
              <div className="mt-4 pt-4 border-t border-admin-border">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 max-tablet:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <div className="text-admin-text-muted text-xs uppercase tracking-wider font-medium">Started</div>
                    <div className="text-admin-text text-[0.95rem] font-bold">{formatDate(quest.startedAt)}</div>
                  </div>
                  {quest.completedAt && (
                    <div className="flex flex-col gap-1">
                      <div className="text-admin-text-muted text-xs uppercase tracking-wider font-medium">Completed</div>
                      <div className="text-admin-text text-[0.95rem] font-bold">{formatDate(quest.completedAt)}</div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className="text-admin-text-muted text-xs uppercase tracking-wider font-medium">Time Spent</div>
                    <div className="text-admin-text text-[0.95rem] font-bold">{formatTime(quest.timeSpentSeconds)}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-admin-text-muted text-xs uppercase tracking-wider font-medium">Attempts</div>
                    <div className="text-admin-text text-[0.95rem] font-bold">{quest.attempts}</div>
                  </div>
                  {quest.score > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="text-admin-text-muted text-xs uppercase tracking-wider font-medium">Score</div>
                      <div className="text-admin-text text-[0.95rem] font-bold">{quest.score}</div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className="text-admin-text-muted text-xs uppercase tracking-wider font-medium">Current Phase</div>
                    <div className="text-admin-text text-[0.95rem] font-bold">Phase {quest.currentPhaseIndex + 1}</div>
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
