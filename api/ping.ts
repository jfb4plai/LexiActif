// api/ping.ts
// Bisecting again: the new postgrest.ts (raw fetch) approach still
// crashes on the real endpoint. Test pgSelect directly, isolated from
// play-list.ts's control flow.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pgSelect } from './postgrest';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows = await pgSelect<unknown[]>('lexi_word_lists', 'select=id&limit=1');
    res.status(200).json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}
