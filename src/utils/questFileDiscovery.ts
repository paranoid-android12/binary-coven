/**
 * Quest File Discovery Utility (Server-side only)
 *
 * Recursively scans public/quests/ for all .json quest files and builds
 * a questId → relative-file-path mapping. Used by API routes to resolve
 * quest IDs to their actual file paths (handles both top-level and
 * subdirectory quests).
 */
import fs from 'fs';
import path from 'path';

/** Cached mapping of questId → relative path from public/quests/ */
let cachedMap: Map<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Recursively collect all .json file paths under a directory.
 * Returns paths relative to `baseDir`.
 */
function walkJsonFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsonFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      // Use forward slashes for URL-safe relative paths
      results.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
    }
  }

  return results;
}

/**
 * Get a mapping of questId → relative file path (from public/quests/).
 *
 * Example: `"variables_introduction"` → `"variables/0_variables_introduction.json"`
 *
 * Cached in memory for 5 minutes.
 */
export function getQuestIdToPathMap(): Map<string, string> {
  const now = Date.now();
  if (cachedMap && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedMap;
  }

  const questsDir = path.join(process.cwd(), 'public', 'quests');
  const map = new Map<string, string>();

  if (!fs.existsSync(questsDir)) {
    cachedMap = map;
    cacheTimestamp = now;
    return map;
  }

  const files = walkJsonFiles(questsDir, questsDir);

  for (const relPath of files) {
    try {
      const fullPath = path.join(questsDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const quest = JSON.parse(content);
      if (quest.id && typeof quest.id === 'string') {
        map.set(quest.id, relPath);
      }
    } catch {
      // Skip malformed files
    }
  }

  cachedMap = map;
  cacheTimestamp = now;
  return map;
}

/**
 * Get all quest JSON file paths relative to public/quests/.
 * Example: `["game_intro.json", "variables/0_variables_introduction.json", ...]`
 */
export function getAllQuestFilePaths(): string[] {
  const questsDir = path.join(process.cwd(), 'public', 'quests');
  if (!fs.existsSync(questsDir)) return [];
  return walkJsonFiles(questsDir, questsDir);
}

/**
 * Resolve a quest ID to its file path relative to public/quests/.
 * Returns `null` if no matching quest file is found.
 */
export function resolveQuestFilePath(questId: string): string | null {
  const map = getQuestIdToPathMap();
  return map.get(questId) ?? null;
}
