// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 5: createClient() now works
// (ws dependency fixed it). This step performs the actual first DB query
// from play-list.ts to see if the crash is instead in the network call.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('lexi_word_lists')
      .select('id, share_code')
      .eq('share_code', '3W7MZWNX')
      .maybeSingle();
    res.status(200).json({ ok: true, data, error: error?.message ?? null });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}
