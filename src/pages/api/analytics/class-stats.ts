import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers - prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // If Supabase is not configured, return error
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(503).json({
        success: false,
        students: [],
        message: 'Supabase not configured - please check environment variables'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Single optimized query: get students with their quest progress using join
    // This avoids N+1 query problem by fetching all data in one request
    const { data: studentsWithProgress, error: studentsError } = await supabase
      .from('student_profiles')
      .select(`
        id,
        display_name,
        username,
        quest_progress (
          state,
          time_spent_seconds
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return res.status(500).json({
        success: false,
        students: [],
        message: `Database error: ${studentsError.message}`
      });
    }

    if (!studentsWithProgress || studentsWithProgress.length === 0) {
      return res.status(200).json({
        success: true,
        students: [],
        message: 'No students found in database'
      });
    }

    // Aggregate stats for each student in memory
    const classStats = studentsWithProgress.map((student: any) => {
      const questProgress = student.quest_progress || [];
      
      // Count completed quests
      const completedQuests = questProgress.filter(
        (q: any) => q.state === 'completed'
      ).length;

      // Calculate total time
      const totalTime = questProgress.reduce(
        (sum: number, q: any) => sum + (q.time_spent_seconds || 0),
        0
      );

      return {
        studentName: student.display_name || student.username || 'Student',
        questsCompleted: completedQuests,
        totalTime: totalTime,
        rank: 0 // Will be calculated after sorting
      };
    });

    // Sort by quests completed and assign ranks
    classStats.sort((a, b) => b.questsCompleted - a.questsCompleted);
    classStats.forEach((student, index) => {
      student.rank = index + 1;
    });

    // Anonymize names for privacy (show first letter + asterisks)
    const anonymizedStats = classStats.map(student => ({
      ...student,
      studentName: anonymizeName(student.studentName)
    }));

    return res.status(200).json({
      success: true,
      students: anonymizedStats,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching class stats:', error);
    return res.status(500).json({
      success: false,
      students: [],
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

function anonymizeName(name: string): string {
  if (!name || name.length <= 1) return 'Student';
  return `${name[0]}${'*'.repeat(Math.min(name.length - 1, 5))}`;
}
