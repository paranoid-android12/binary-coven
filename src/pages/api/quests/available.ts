// API route to list all available quests with metadata
// Used by admin UI for quest selection when creating sessions
import type { NextApiRequest, NextApiResponse } from 'next'
import { promises as fs } from 'fs'
import path from 'path'
import { getAllQuestFilePaths } from '../../../utils/questFileDiscovery'

// Quest metadata structure (subset of full quest data)
interface QuestMetadata {
  id: string
  title: string
  description: string
  difficulty: string
  category: string
  estimatedTime: number
  concepts: string[]
  prerequisites: string[]
  fileName: string
}

type AvailableQuestsResponse = {
  success: boolean
  message?: string
  quests?: QuestMetadata[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvailableQuestsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    // Get the quests directory path
    const questsDir = path.join(process.cwd(), 'public', 'quests')
    
    // Recursively discover all quest JSON files (top-level + subdirectories)
    const files = getAllQuestFilePaths()

    const quests: QuestMetadata[] = []

    // Read all quest files in parallel
    const questPromises = files.map(async (relPath) => {
      try {
        const filePath = path.join(questsDir, relPath)
        const content = await fs.readFile(filePath, 'utf-8')
        const questData = JSON.parse(content)

        // Validate required fields
        if (!questData.id || typeof questData.id !== 'string') {
          console.warn(`Quest file ${relPath} missing valid id, skipping`)
          return null
        }
        if (!questData.title || typeof questData.title !== 'string') {
          console.warn(`Quest file ${relPath} missing valid title, skipping`)
          return null
        }

        // Extract only the metadata we need
        return {
          id: questData.id,
          title: questData.title,
          description: questData.description || '',
          difficulty: questData.difficulty || 'unknown',
          category: questData.category || 'General',
          estimatedTime: questData.estimatedTime || 0,
          concepts: Array.isArray(questData.concepts) ? questData.concepts : [],
          prerequisites: Array.isArray(questData.prerequisites) ? questData.prerequisites : [],
          fileName: relPath,
        } as QuestMetadata
      } catch (parseError) {
        console.error(`Error parsing quest file ${relPath}:`, parseError)
        return null
      }
    })

    const results = await Promise.all(questPromises)
    
    // Filter out null results (failed parses)
    // Also exclude game_intro - it's the auto-start tutorial that runs for all new players
    for (const quest of results) {
      if (quest !== null && quest.id !== 'game_intro') {
        quests.push(quest)
      }
    }

    // Sort quests by a logical order (could be customized)
    // For now, sort by category then by title
    quests.sort((a, b) => {
      if (a.category !== b.category) {
        // Tutorials first
        if (a.category === 'Tutorial') return -1
        if (b.category === 'Tutorial') return 1
        return a.category.localeCompare(b.category)
      }
      return a.title.localeCompare(b.title)
    })

    return res.status(200).json({
      success: true,
      quests,
    })
  } catch (error) {
    console.error('Error listing available quests:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to list available quests',
    })
  }
}
