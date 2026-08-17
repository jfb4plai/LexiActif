// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 8: raw fetch worked, so
// network/keys/RLS are all fine. Now retry via supabase-js but WITHOUT
// .maybeSingle(), to isolate whether that specific method is the crash.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.from('lexi_word_lists').select('id, share_code').limit(1);
    res.status(200).json({ ok: true, data, error: error?.message ?? null });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}
