import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseAdminClient();

  if (req.method === "POST") {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      null;

    await supabase.from("page_views").insert({ ip });
  }

  const { count, error } = await supabase
    .from("page_views")
    .select("*", { count: "exact", head: true });

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ count: count ?? 0 });
}
