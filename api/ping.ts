// api/ping.ts
// Temporary diagnostic endpoint — bisecting a FUNCTION_INVOCATION_FAILED
// crash. Step 2: import the shared admin helper and construct the Supabase
// client, but don't query anything yet.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = supabaseAdmin();
    res.status(200).json({ ok: true, clientCreated: !!supabase });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}
