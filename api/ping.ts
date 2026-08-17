// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 7: bypass @supabase/supabase-js
// entirely and hit the PostgREST endpoint with plain fetch(), to isolate
// whether this is a network/runtime fetch issue or specific to the library.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      res.status(500).json({ error: 'Missing env vars' });
      return;
    }
    const response = await fetch(`${url}/rest/v1/lexi_word_lists?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const body = await response.text();
    res.status(200).json({ ok: true, status: response.status, body });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}
