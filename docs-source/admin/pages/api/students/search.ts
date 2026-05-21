import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PAGE_SIZE = 20;

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  sessionCode: string;
  sessionStart: string | null;
  sessionEnd: string | null;
  joinedAt: string;
  questsCompleted: number;
  totalQuests: number;
  totalTimeSeconds: number;
}

interface SearchResponse {
  success: boolean;
  message?: string;
  students: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>,
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      students: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
    });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured',
        students: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const query = (req.query.q as string || '').trim();
    const sessionCode = (req.query.sessionCode as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);

    // Build the base query — join with session_codes for the code string
    let dbQuery = supabase
      .from('student_profiles')
      .select(`
        id,
        username,
        display_name,
        created_at,
        session_codes!inner (
          code,
          validity_start,
          validity_end
        ),
        quest_progress (
          quest_id,
          state,
          time_spent_seconds
        )
      `, { count: 'exact' });

    // Text search filter (username or display_name)
    if (query) {
      dbQuery = dbQuery.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
    }

    // Session code filter
    if (sessionCode) {
      dbQuery = dbQuery.eq('session_codes.code', sessionCode);
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      console.error('[students/search] DB error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database query failed',
        students: [],
        total: 0,
        page,
        pageSize: PAGE_SIZE,
      });
    }

    const students: SearchResult[] = (data || []).map((row: any) => {
      const questProgress: Array<{ state: string; time_spent_seconds: number }> = row.quest_progress || [];
      const completed = questProgress.filter((q) => q.state === 'completed').length;
      const totalTime = questProgress.reduce((s, q) => s + (q.time_spent_seconds || 0), 0);

      return {
        id: row.id,
        username: row.username,
        displayName: row.display_name || row.username,
        sessionCode: row.session_codes?.code || 'Unknown',
        sessionStart: row.session_codes?.validity_start || null,
        sessionEnd: row.session_codes?.validity_end || null,
        joinedAt: row.created_at,
        questsCompleted: completed,
        totalQuests: questProgress.length,
        totalTimeSeconds: totalTime,
      };
    });

    return res.status(200).json({
      success: true,
      students,
      total: count ?? students.length,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    console.error('[students/search] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      students: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
    });
  }
}
