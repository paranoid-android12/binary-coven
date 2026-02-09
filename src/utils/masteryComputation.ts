/**
 * Mastery Computation Utility
 * 
 * Shared logic for computing topic mastery tags and proficiency levels
 * from quest progress data. Used by both student-side (StudentProgressModal,
 * ExploreModal) and admin-side (students/[id]) views.
 * 
 * Approach: Client-side computation from quest ID prefixes.
 * - Topics derived from quest ID (e.g. "variables_counting" → Variables)
 * - No schema migration needed
 * - Real-time updates as quests complete
 * - Only shows categories that have assigned quests
 */

import type { Quest } from '../types/quest';

// ─── Topic Definitions ──────────────────────────────────────────────────────

/** Topic categories matching quest organisation */
export type TopicName =
  | 'Foundations'
  | 'Variables'
  | 'Conditionals'
  | 'Loops'
  | 'Functions'
  | 'Lists'
  | 'Tutorials'
  | 'Game Mechanics';

/** Mastery level for a topic */
export type MasteryLevel = 'mastered' | 'in-progress' | 'not-started';

/** Full mastery info for a single topic */
export interface TopicMastery {
  topic: TopicName;
  level: MasteryLevel;
  /** 0–100 proficiency score */
  proficiency: number;
  /** Number of quests completed that cover this topic */
  completedQuests: number;
  /** Total quests that cover this topic */
  totalQuests: number;
  /** Raw concepts from quest JSON that map to this topic */
  concepts: string[];
}

/** Summary stats for profile display */
export interface ProfileSummaryStats {
  questsCompleted: number;
  totalQuests: number;
  totalTimeSeconds: number;
  totalCodeRuns: number;
  successRate: number;
}

// ─── Quest Category → Topic Mapping ─────────────────────────────────────────

/**
 * Maps the quest's JSON `category` field to our TopicName display categories.
 * This ensures the mastery view matches the Progress tab's grouping exactly.
 */
const CATEGORY_TO_TOPIC: Record<string, TopicName> = {
  'Tutorial': 'Tutorials',
  'Tutorials': 'Tutorials',
  'Foundations': 'Foundations',
  'Game Mechanics': 'Game Mechanics',
  'Variables': 'Variables',
  'Conditionals': 'Conditionals',
  'Loops': 'Loops',
  'Functions': 'Functions',
  'Lists': 'Lists',
};

/**
 * Fallback: maps quest ID prefixes to topics when the quest has no category field.
 */
const QUEST_ID_PREFIX_TO_TOPIC: Record<string, TopicName> = {
  foundations: 'Foundations',
  variables: 'Variables',
  conditionals: 'Conditionals',
  loops: 'Loops',
  functions: 'Functions',
  lists: 'Lists',
  tutorial: 'Tutorials',
  game: 'Tutorials',
};

/**
 * Resolve which TopicName a quest belongs to, using its category field first,
 * then falling back to quest ID prefix matching.
 */
export function getTopicForQuest(questId: string, questCategory?: string): TopicName | null {
  // Prefer the quest's own category field (matches Progress tab grouping)
  if (questCategory && CATEGORY_TO_TOPIC[questCategory]) {
    return CATEGORY_TO_TOPIC[questCategory];
  }
  // Fallback to prefix match
  const prefix = questId.split('_')[0];
  return QUEST_ID_PREFIX_TO_TOPIC[prefix] ?? null;
}

/** Ordered list of topics from foundational → advanced */
export const TOPIC_PRIORITY: TopicName[] = [
  'Foundations',
  'Variables',
  'Conditionals',
  'Loops',
  'Functions',
  'Lists',
  'Tutorials',
  'Game Mechanics',
];

/** Human-friendly descriptions per topic */
export const TOPIC_DESCRIPTIONS: Record<TopicName, string> = {
  'Foundations': 'Learn the essential game functions and mechanics to get started.',
  'Variables': 'Store and manage data — the foundation of programming!',
  'Conditionals': 'Make decisions in your code with boolean logic and if/else.',
  'Loops': 'Repeat actions efficiently with while and for loops.',
  'Functions': 'Organise code into reusable blocks — a key programming skill!',
  'Lists': 'Collect and manage groups of data with lists.',
  'Tutorials': 'Introductory walkthroughs to learn the basics.',
  'Game Mechanics': 'Apply programming to farm automation and drone control.',
};

/** Colour tokens for mastery levels (used in both game & admin UI) */
export const MASTERY_COLORS: Record<MasteryLevel, { bg: string; text: string; border: string }> = {
  mastered: { bg: '#2d5016', text: '#7ed321', border: '#7ed321' },
  'in-progress': { bg: '#4a3600', text: '#f5a623', border: '#f5a623' },
  'not-started': { bg: '#333333', text: '#888888', border: '#555555' },
};

/** Admin-side Tailwind-friendly class names for mastery badges */
export const MASTERY_ADMIN_CLASSES: Record<MasteryLevel, string> = {
  mastered: 'bg-green-100 text-green-700 border-green-300',
  'in-progress': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'not-started': 'bg-gray-100 text-gray-500 border-gray-300',
};

// ─── Normalisation ──────────────────────────────────────────────────────────

/** Convert a normalised concept key to a display label */
export function formatConceptLabel(concept: string): string {
  return concept
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Core Computation ───────────────────────────────────────────────────────

/**
 * @deprecated Use getTopicForQuest instead. Kept for backward compatibility.
 */
export function getTopicForConcept(concept: string): TopicName | null {
  return null;
}

/**
 * Compute topic mastery data for a given set of quests and completion state.
 * 
 * Topics are determined by quest ID prefix (e.g. "variables_counting" → Variables).
 * Only topics that have at least one assigned quest will appear in the result.
 *
 * @param allQuests       All quests available in the session
 * @param completedQuests Quests the student has completed
 * @param executionStats  Optional per-quest execution stats for weighting
 * @returns Array of TopicMastery sorted by TOPIC_PRIORITY, filtered to topics with quests
 */
export function computeTopicMastery(
  allQuests: Quest[],
  completedQuests: Quest[],
  executionStats?: QuestExecutionStatsInput[],
): TopicMastery[] {
  const completedIds = new Set(completedQuests.map((q) => q.id));

  // Build a map: topic → { allQuestIds, completedQuestIds }
  const topicMap = new Map<
    TopicName,
    { questIds: Set<string>; completedIds: Set<string> }
  >();

  for (const quest of allQuests) {
    const topic = getTopicForQuest(quest.id, quest.category);
    if (!topic) continue;

    if (!topicMap.has(topic)) {
      topicMap.set(topic, { questIds: new Set(), completedIds: new Set() });
    }
    const entry = topicMap.get(topic)!;
    entry.questIds.add(quest.id);
    if (completedIds.has(quest.id)) {
      entry.completedIds.add(quest.id);
    }
  }

  // Build execution stats lookup
  const execMap = new Map<string, QuestExecutionStatsInput>();
  if (executionStats) {
    for (const stat of executionStats) {
      execMap.set(stat.questId, stat);
    }
  }

  // Assemble results in priority order, only including topics that have quests
  return TOPIC_PRIORITY
    .map((topic): TopicMastery => {
      const entry = topicMap.get(topic);

      if (!entry || entry.questIds.size === 0) {
        return {
          topic,
          level: 'not-started',
          proficiency: 0,
          completedQuests: 0,
          totalQuests: 0,
          concepts: [],
        };
      }

      const total = entry.questIds.size;
      const completed = entry.completedIds.size;

      // Base proficiency from completion ratio
      let baseProficiency = total > 0 ? (completed / total) * 100 : 0;

      // Weight by success rate if execution stats are available
      if (executionStats && completed > 0) {
        let totalSuccessRate = 0;
        let statCount = 0;
        for (const qid of entry.completedIds) {
          const stat = execMap.get(qid);
          if (stat && stat.totalAttempts > 0) {
            totalSuccessRate += stat.successfulRuns / stat.totalAttempts;
            statCount++;
          }
        }
        if (statCount > 0) {
          const avgSuccess = totalSuccessRate / statCount;
          // Blend: 70% completion, 30% success rate
          baseProficiency = baseProficiency * 0.7 + avgSuccess * 100 * 0.3;
        }
      }

      const proficiency = Math.round(Math.min(100, Math.max(0, baseProficiency)));

      let level: MasteryLevel = 'not-started';
      if (completed >= total && total > 0) {
        level = 'mastered';
      } else if (completed > 0) {
        level = 'in-progress';
      }

      return {
        topic,
        level,
        proficiency,
        completedQuests: completed,
        totalQuests: total,
        concepts: [],
      };
    })
    .filter((tm) => tm.totalQuests > 0);
}

/**
 * Get only the mastery tags that have any progress (mastered or in-progress).
 * Useful for compact badge displays.
 */
export function getActiveMasteryTags(mastery: TopicMastery[]): TopicMastery[] {
  return mastery.filter((m) => m.level !== 'not-started');
}

/**
 * Check if all available topics are mastered.
 */
export function isFullyMastered(mastery: TopicMastery[]): boolean {
  const withQuests = mastery.filter((m) => m.totalQuests > 0);
  return withQuests.length > 0 && withQuests.every((m) => m.level === 'mastered');
}

// ─── Input Types ────────────────────────────────────────────────────────────

/** Minimal execution stats shape accepted by computeTopicMastery */
export interface QuestExecutionStatsInput {
  questId: string;
  totalAttempts: number;
  successfulRuns: number;
  failedRuns: number;
}
