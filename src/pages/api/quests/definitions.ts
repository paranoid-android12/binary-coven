import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/quests/definitions
 *
 * Dynamically discovers and returns all quest definition JSON files
 * from the public/quests/ directory. No hardcoded list required.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const questsDir = path.join(process.cwd(), 'public', 'quests');

    if (!fs.existsSync(questsDir)) {
      return res.status(200).json({ success: true, quests: [] });
    }

    const files = fs.readdirSync(questsDir).filter((f) => f.endsWith('.json'));
    const quests: any[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(questsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const quest = JSON.parse(content);
        quests.push(quest);
      } catch {
        // Skip malformed quest files
      }
    }

    // Cache for 5 minutes — quest definitions rarely change at runtime
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.status(200).json({ success: true, quests });
  } catch (error) {
    console.error('[quests/definitions] Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
