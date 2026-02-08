/**
 * Mastery Computation Utility
 * 
 * Shared logic for computing topic mastery tags and proficiency levels
 * from quest progress data. Used by both student-side (StudentProgressModal,
 * ExploreModal) and admin-side (students/[id]) views.
 * 
 * Approach: Client-side computation from quest concepts.
 * - No schema migration needed
 * - Real-time updates as quests complete
 * - Small dataset (~10 quests per session)
 */

import type { Quest } from '../types/quest';

// ─── Topic Definitions ──────────────────────────────────────────────────────

/** Broad programming topic categories */
export type TopicName =
  | 'Basic Programming'
  | 'Functions'
  | 'Control Flow'
  | 'Automation'
  | 'Applied Programming';

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

// ─── Concept → Topic Mapping ────────────────────────────────────────────────

/**
 * Maps individual quest concept strings (normalised: lowercase, underscores)
 * to broad topic categories.
 * 
 * Keep this in sync with quest JSON `concepts` arrays.
 */
const CONCEPT_TO_TOPIC: Record<string, TopicName> = {
  // Control Flow & Iteration
  loops: 'Control Flow',
  iteration: 'Control Flow',
  for: 'Control Flow',
  range: 'Control Flow',
  conditionals: 'Control Flow',

  // Functions & Code Organisation
  functions: 'Functions',
  def: 'Functions',
  parameters: 'Functions',
  return: 'Functions',
  code_organization: 'Functions',
  harvest_function: 'Functions',
  plant_function: 'Functions',
  sleep_function: 'Functions',

  // Automation & Advanced Programming
  automation: 'Automation',
  full_automation: 'Automation',
  programming: 'Automation',
  drones: 'Automation',

  // Basic Programming Fundamentals
  code_terminal: 'Basic Programming',
  movement_commands: 'Basic Programming',
  movement: 'Basic Programming',
  manual_controls: 'Basic Programming',
  manual_buttons: 'Basic Programming',
  interaction: 'Basic Programming',

  // Domain/Applied Concepts
  planting: 'Applied Programming',
  harvesting: 'Applied Programming',
  wheat: 'Applied Programming',
  farming: 'Applied Programming',
};

/** Ordered list of topics from foundational → advanced */
export const TOPIC_PRIORITY: TopicName[] = [
  'Basic Programming',
  'Functions',
  'Control Flow',
  'Automation',
  'Applied Programming',
];

/** Human-friendly descriptions per topic */
export const TOPIC_DESCRIPTIONS: Record<TopicName, string> = {
  'Basic Programming': 'These fundamentals are the building blocks of all programming!',
  'Functions': 'Functions let you organise code into reusable blocks — a key programming skill!',
  'Control Flow': 'Control Flow helps you repeat actions and make decisions in your code.',
  'Automation': 'Automation allows your programs to run tasks independently.',
  'Applied Programming': "You're applying programming concepts to solve real problems!",
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

/** Normalise a concept string to match mapping keys */
function normaliseConcept(concept: string): string {
  return concept.toLowerCase().replace(/[ -]/g, '_');
}

/** Convert a normalised concept key to a display label */
export function formatConceptLabel(concept: string): string {
  return concept
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Core Computation ───────────────────────────────────────────────────────

/**
 * Resolve which TopicName a concept belongs to.
 * Returns `null` for unmapped concepts.
 */
export function getTopicForConcept(concept: string): TopicName | null {
  return CONCEPT_TO_TOPIC[normaliseConcept(concept)] ?? null;
}

/**
 * Compute topic mastery data for a given set of quests and completion state.
 *
 * @param allQuests       All quests available in the session
 * @param completedQuests Quests the student has completed
 * @param executionStats  Optional per-quest execution stats for weighting
 * @returns Array of TopicMastery sorted by TOPIC_PRIORITY
 */
export function computeTopicMastery(
  allQuests: Quest[],
  completedQuests: Quest[],
  executionStats?: QuestExecutionStatsInput[],
): TopicMastery[] {
  const completedIds = new Set(completedQuests.map((q) => q.id));

  // Build a map: topic → { allQuestIds, completedQuestIds, concepts }
  const topicMap = new Map<
    TopicName,
    { questIds: Set<string>; completedIds: Set<string>; concepts: Set<string> }
  >();

  for (const quest of allQuests) {
    const concepts = quest.concepts ?? [];
    for (const rawConcept of concepts) {
      const topic = getTopicForConcept(rawConcept);
      if (!topic) continue;

      if (!topicMap.has(topic)) {
        topicMap.set(topic, { questIds: new Set(), completedIds: new Set(), concepts: new Set() });
      }
      const entry = topicMap.get(topic)!;
      entry.questIds.add(quest.id);
      entry.concepts.add(normaliseConcept(rawConcept));
      if (completedIds.has(quest.id)) {
        entry.completedIds.add(quest.id);
      }
    }
  }

  // Build execution stats lookup
  const execMap = new Map<string, QuestExecutionStatsInput>();
  if (executionStats) {
    for (const stat of executionStats) {
      execMap.set(stat.questId, stat);
    }
  }

  // Assemble results in priority order
  return TOPIC_PRIORITY.map((topic): TopicMastery => {
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
      concepts: Array.from(entry.concepts),
    };
  });
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
