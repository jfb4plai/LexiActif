// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 4: actually call createClient()
// with the real credentials, now that `ws` has been added as a dependency
// (Node's serverless runtime has no global WebSocket, and
// @supabase/realtime-js falls back to requiring `ws` when constructing the
// client — without it installed, that fallback crashes the whole process,
// bypassing any JS-level try/catch).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      res.status(500).json({ error: 'Missing env vars' });
      return;
    }
    const supabase = createClient(url, key);
    res.status(200).json({ ok: true, clientCreated: !!supabase });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}
