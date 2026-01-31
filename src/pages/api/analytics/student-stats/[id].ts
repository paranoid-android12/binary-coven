import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Student ID is required' 
    });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get student info with quest progress
    const { data: studentData, error: studentError } = await supabase
      .from('student_profiles')
      .select(`
        id,
        display_name,
        username,
        created_at,
        quest_progress (
          quest_id,
          quest_title,
          state,
          current_phase_index,
          started_at,
          completed_at,
          time_spent_seconds,
          attempts,
          score
        )
      `)
      .eq('id', id)
      .single();

    if (studentError || !studentData) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Format the response
    const questProgress = (studentData.quest_progress || []).map((q: any) => ({
      questId: q.quest_id,
      questTitle: q.quest_title,
      state: q.state,
      currentPhaseIndex: q.current_phase_index,
      startedAt: q.started_at,
      completedAt: q.completed_at,
      timeSpentSeconds: q.time_spent_seconds,
      attempts: q.attempts,
      score: q.score
    }));

    // Calculate summary stats
    const completedQuests = questProgress.filter((q: any) => q.state === 'completed');
    const totalTimeSpent = questProgress.reduce((sum: number, q: any) => sum + (q.timeSpentSeconds || 0), 0);
    const totalAttempts = questProgress.reduce((sum: number, q: any) => sum + (q.attempts || 0), 0);

    return res.status(200).json({
      success: true,
      student: {
        id: studentData.id,
        displayName: studentData.display_name || studentData.username,
        joinedAt: studentData.created_at,
      },
      summary: {
        completedQuests: completedQuests.length,
        totalQuests: questProgress.length,
        totalTimeSpent,
        totalAttempts,
        avgTimePerQuest: completedQuests.length > 0 
          ? Math.round(totalTimeSpent / completedQuests.length) 
          : 0
      },
      questProgress: questProgress.sort((a: any, b: any) => {
        // Sort by completion status, then by completion date
        if (a.state === 'completed' && b.state !== 'completed') return -1;
        if (a.state !== 'completed' && b.state === 'completed') return 1;
        if (a.completedAt && b.completedAt) {
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        }
        return 0;
      })
    });

  } catch (error) {
    console.error('Error fetching student stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}
