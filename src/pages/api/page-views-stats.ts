import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST

// Normalize PostgreSQL "YYYY-MM-DD HH:mm:ss.xxx+00" → valid ISO string
function parseUTC(s: string): Date {
  return new Date(s.replace(" ", "T").replace(/\+00$/, "Z").replace(/\+00:00$/, "Z"));
}

// Return YYYY-MM-DD in PHT
function toPHTDate(utcStr: string): string {
  const pht = new Date(parseUTC(utcStr).getTime() + PHT_OFFSET_MS);
  return pht.toISOString().slice(0, 10);
}

// Return hour 0–23 in PHT
function toPHTHour(utcStr: string): number {
  const pht = new Date(parseUTC(utcStr).getTime() + PHT_OFFSET_MS);
  return pht.getUTCHours();
}

// Advance a YYYY-MM-DD string by one day
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Today's date in PHT as YYYY-MM-DD
function todayPHT(): string {
  return new Date(Date.now() + PHT_OFFSET_MS).toISOString().slice(0, 10);
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseAdminClient();

  const PAGE = 1000;
  const rows: { created_at: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("page_views")
      .select("created_at")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const total = rows.length;

  // Build day buckets in PHT from first view through today
  const dayCounts: Record<string, number> = {};

  if (rows.length > 0) {
    const firstDay = toPHTDate(rows[0].created_at);
    const today = todayPHT();
    for (let d = firstDay; d <= today; d = nextDay(d)) {
      dayCounts[d] = 0;
    }
  }

  for (const row of rows) {
    const day = toPHTDate(row.created_at);
    if (day in dayCounts) dayCounts[day]++;
  }

  const daily = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

  // Views by hour of day (0–23) in PHT
  const hourCounts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const row of rows) {
    const h = toPHTHour(row.created_at);
    if (h >= 0 && h < 24) hourCounts[h].count++;
  }

  const firstView = rows[0]?.created_at ?? null;

  res.status(200).json({ total, daily, hourly: hourCounts, firstView });
}
