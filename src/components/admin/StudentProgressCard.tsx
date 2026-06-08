import { useMemo } from 'react';
import Link from 'next/link';
import { Clock, Play } from 'lucide-react';
import {
  computeTopicMastery,
  MASTERY_ADMIN_CLASSES,
  type TopicMastery,
} from '../../utils/masteryComputation';
import type { Quest } from '../../types/quest';

interface QuestProgressEntry {
  questId: string;
  state: string;
}

interface StudentData {
  id: string;
  username: string;
  displayName: string;
  sessionCode?: string;
  lastLogin: string;
  questsCompleted: number;
  questsActive: number;
  totalTimeSpentSeconds: number;
  totalCodeExecutions: number;
  questProgress: QuestProgressEntry[];
}

interface StudentProgressCardProps {
  student: StudentData;
  questDefinitions: Quest[];
  showSessionCode?: boolean;
  formatTime: (seconds: number) => string;
  formatDate: (dateString: string | null) => string;
}

export default function StudentProgressCard({
  student,
  questDefinitions,
  showSessionCode = false,
  formatTime,
  formatDate,
}: StudentProgressCardProps) {
  // Compute mastery for this student
  const topicMastery = useMemo(() => {
    if (questDefinitions.length === 0 || student.questProgress.length === 0) return [];

    const studentQuestIds = new Set(student.questProgress.map((qp) => qp.questId));
    const studentQuestDefs = questDefinitions.filter((q) => studentQuestIds.has(q.id));

    const completedIds = new Set(
      student.questProgress
        .filter((qp) => qp.state === 'completed')
        .map((qp) => qp.questId)
    );
    const completedQuestDefs = studentQuestDefs.filter((q) => completedIds.has(q.id));

    return computeTopicMastery(studentQuestDefs, completedQuestDefs);
  }, [student.questProgress, questDefinitions]);

  const totalQuests = useMemo(() => {
    const studentQuestIds = new Set(student.questProgress.map((qp) => qp.questId));
    return questDefinitions.filter((q) => studentQuestIds.has(q.id)).length;
  }, [student.questProgress, questDefinitions]);

  const completionPercent = totalQuests > 0
    ? Math.round((student.questsCompleted / totalQuests) * 100)
    : 0;

  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-4 transition-colors duration-200 hover:border-admin-border-hover">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-admin-text">{student.username}</span>
            {student.displayName && student.displayName !== student.username && (
              <span className="text-xs text-admin-text-faint">{student.displayName}</span>
            )}
            {showSessionCode && student.sessionCode && (
              <Link
                href={`/admin/sessions/${student.sessionCode}/students`}
                className="text-admin-accent no-underline text-xs font-bold transition-colors duration-200 hover:text-admin-accent-hover"
              >
                {student.sessionCode}
              </Link>
            )}
          </div>
          <div className="text-xs text-admin-text-faint mt-1">
            Last active: {formatDate(student.lastLogin)}
          </div>
        </div>
        <Link
          href={`/admin/students/${student.id}`}
          className="inline-block border border-admin-accent text-admin-accent bg-transparent py-[6px] px-[14px] rounded-lg no-underline text-xs font-semibold transition-colors duration-200 hover:bg-admin-accent hover:text-white flex-shrink-0"
        >
          View Details
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-admin-text">
            {student.questsCompleted}/{totalQuests} quests completed
          </span>
          <span className="text-xs text-admin-text-faint">{completionPercent}%</span>
        </div>
        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completionPercent}%`,
              backgroundColor: completionPercent === 100 ? '#4d7c0f' : '#2563eb',
            }}
          />
        </div>
      </div>

      {/* Topic mastery badges */}
      {topicMastery.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topicMastery.map((tm) => (
            <span
              key={tm.topic}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${MASTERY_ADMIN_CLASSES[tm.level]}`}
              title={`${tm.topic}: ${tm.completedQuests}/${tm.totalQuests} quests (${tm.proficiency}%)`}
            >
              {tm.topic}
              <span className="opacity-70">{tm.completedQuests}/{tm.totalQuests}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs text-admin-text-faint italic mb-3">No quest progress yet</div>
      )}

      {/* Compact stats */}
      <div className="flex items-center gap-4 text-xs text-admin-text-muted">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatTime(student.totalTimeSpentSeconds)}
        </span>
        <span className="flex items-center gap-1">
          <Play size={12} />
          {student.totalCodeExecutions} runs
        </span>
      </div>
    </div>
  );
}
