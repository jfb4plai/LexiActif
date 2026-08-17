// api/ping.ts
// Step 15: re-confirm inline fetch (same file as handler) still works,
// since step 7 proved this earlier but a lot has changed since. This does
// NOT import ./postgrest.ts or any other sibling module.
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
