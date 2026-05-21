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
    
    // Check query params
    const showFullNames = req.query.showFullNames === 'true';

    // Get the current student's session code ID from cookie
    const studentSessionId = req.cookies.student_session_id;
    let sessionCodeId: string | null = null;
    let sessionInfo: {
      code: string;
      createdAt: string;
      validityEnd: string;
      createdByAdmin: string | null;
      studentCount: number;
    } | null = null;

    // Get current student's active session code ID via student_sessions
    if (studentSessionId) {
      // First try junction table
      const { data: sessionLink } = await supabase
        .from('student_sessions')
        .select('session_code_id')
        .eq('student_profile_id', studentSessionId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionLink) {
        sessionCodeId = sessionLink.session_code_id;
      } else {
        // Fallback to legacy field on student_profiles
        const { data: studentData } = await supabase
          .from('student_profiles')
          .select('session_code_id')
          .eq('id', studentSessionId)
          .single();

        if (studentData) {
          sessionCodeId = studentData.session_code_id;
        }
      }
    }

    // If we have a session code, get session info
    if (sessionCodeId) {
      const { data: sessionData } = await supabase
        .from('session_codes')
        .select(`
          code,
          created_at,
          validity_end,
          created_by_admin_id
        `)
        .eq('id', sessionCodeId)
        .single();

      if (sessionData) {
        // Get admin name if available
        let adminName: string | null = null;
        if (sessionData.created_by_admin_id) {
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('username')
            .eq('id', sessionData.created_by_admin_id)
            .single();
          
          if (adminData) {
            adminName = adminData.username;
          }
        }

        // Count students in this session (via junction table)
        const { count } = await supabase
          .from('student_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('session_code_id', sessionCodeId)
          .eq('is_active', true);

        sessionInfo = {
          code: sessionData.code,
          createdAt: sessionData.created_at,
          validityEnd: sessionData.validity_end,
          createdByAdmin: adminName,
          studentCount: count || 0
        };
      }
    }

    // SECURITY: Require a valid session - don't return all students if no session
    if (!sessionCodeId) {
      return res.status(200).json({
        success: true,
        students: [],
        sessionInfo: null,
        currentStudentId: null,
        message: 'No active session - please log in with a session code'
      });
    }

    // Build query - fetch students linked to this session via student_sessions
    // First get student IDs from the junction table
    const { data: sessionStudents, error: sessionStudentsError } = await supabase
      .from('student_sessions')
      .select('student_profile_id')
      .eq('session_code_id', sessionCodeId)
      .eq('is_active', true);

    if (sessionStudentsError || !sessionStudents || sessionStudents.length === 0) {
      return res.status(200).json({
        success: true,
        students: [],
        sessionInfo,
        message: 'No students found in this session'
      });
    }

    const studentIds = sessionStudents.map((s: any) => s.student_profile_id);

    let query = supabase
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
      .in('id', studentIds)
      .order('created_at', { ascending: false });

    const { data: studentsWithProgress, error: studentsError } = await query;

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
        sessionInfo,
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

      const fullName = student.display_name || student.username || 'Student';
      
      return {
        studentId: student.id,
        studentName: showFullNames ? fullName : anonymizeName(fullName),
        fullName: fullName, // Always include for potential reveal
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

    return res.status(200).json({
      success: true,
      students: classStats,
      sessionInfo,
      currentStudentId: studentSessionId || null, // Return current user's ID so frontend can identify them
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
