// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 6: the query crashed even
// though createClient() alone worked. First, sanity-check the URL value
// itself (not secret, safe to echo) before investigating further.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL ?? null;
  res.status(200).json({
    ok: true,
    url,
    urlLength: url?.length ?? 0,
    urlTrimmedEqualsRaw: url === url?.trim(),
  });
}
