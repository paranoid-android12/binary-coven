// Admin dashboard aggregate stats (admin only).
// Computes platform-wide learning metrics in one pass so the dashboard can show
// real engagement data without N+1 per-session fetches.
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminAuth'

type DashboardResponse = {
  success: boolean
  message?: string
  stats?: {
    totalStudents: number
    activeToday: number
    questsCompleted: number
    questsActive: number
    totalTimeSeconds: number
    codeExecutions: number
    avgQuestsPerStudent: number
  }
  questStateCounts?: Record<string, number>
  signups?: Array<{ label: string; count: number }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse>
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const admin = await requireAdmin(req, res)
  if (!admin) return // requireAdmin already responded

  try {
    const supabase = getSupabaseAdminClient()

    // Pull every active student with their quest progress in one query.
    const { data: studentsData, error } = await supabase
      .from('student_profiles')
      .select('id, created_at, last_login, quest_progress (state, time_spent_seconds)')
      .eq('is_active', true) as { data: any[] | null; error: any }

    if (error) {
      console.error('[admin/dashboard] Error fetching students:', error)
      return res.status(500).json({ success: false, message: 'Failed to load dashboard stats' })
    }

    const rows = studentsData || []
    const now = new Date()
    const todayStr = now.toDateString()
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000
    const WEEKS = 8

    let questsCompleted = 0
    let questsActive = 0
    let totalTimeSeconds = 0
    let activeToday = 0
    const questStateCounts: Record<string, number> = {}
    const signupBuckets = new Array(WEEKS).fill(0)

    for (const s of rows) {
      if (s.last_login && new Date(s.last_login).toDateString() === todayStr) {
        activeToday++
      }

      if (s.created_at) {
        const diffWeeks = Math.floor((now.getTime() - new Date(s.created_at).getTime()) / WEEK_MS)
        if (diffWeeks >= 0 && diffWeeks < WEEKS) {
          signupBuckets[WEEKS - 1 - diffWeeks]++
        }
      }

      const progress = s.quest_progress || []
      for (const q of progress) {
        questStateCounts[q.state] = (questStateCounts[q.state] || 0) + 1
        if (q.state === 'completed') questsCompleted++
        else if (q.state === 'active') questsActive++
        totalTimeSeconds += q.time_spent_seconds || 0
      }
    }

    // Total code executions across the platform (count only — no payload).
    const { count: codeExecutions } = await supabase
      .from('code_executions')
      .select('id', { count: 'exact', head: true })

    const totalStudents = rows.length

    // Label each 7-day window by its start date (oldest → newest).
    const signups = signupBuckets.map((count, i) => {
      const weeksAgo = WEEKS - i // window start is this many weeks before now
      const start = new Date(now.getTime() - weeksAgo * WEEK_MS)
      return {
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      }
    })

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeToday,
        questsCompleted,
        questsActive,
        totalTimeSeconds,
        codeExecutions: codeExecutions || 0,
        avgQuestsPerStudent: totalStudents ? Math.round((questsCompleted / totalStudents) * 10) / 10 : 0,
      },
      questStateCounts,
      signups,
    })
  } catch (err) {
    console.error('[admin/dashboard] Error:', err)
    return res.status(500).json({ success: false, message: 'An error occurred while loading dashboard stats' })
  }
}
