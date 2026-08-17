// api/ping.ts
// Step 13: with the correct latest deployment now live (no stale Node
// override), retry the actual supabase-js query.
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
