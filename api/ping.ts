// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 3: import @supabase/supabase-js
// but don't call createClient at all — isolates whether the import itself
// (module resolution/bundling) is the crash, vs. the createClient() call.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, hasCreateClient: typeof createClient === 'function' });
}
