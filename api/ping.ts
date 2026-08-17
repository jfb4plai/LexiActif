// api/ping.ts
// Temporary diagnostic endpoint — no imports besides erased types, so if
// this crashes too, the problem is not specific to Supabase/_supabaseAdmin.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    hasUrl: !!process.env.VITE_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
  });
}
