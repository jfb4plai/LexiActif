// api/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// NOTE: this file was originally named `_supabaseAdmin.ts` (underscore
// prefix, the documented Vercel convention to exclude a file from routing).
// That triggered a live FUNCTION_INVOCATION_FAILED crash on every endpoint
// that imported it — renaming without the underscore fixed it. It has no
// default export, so Vercel does not treat it as its own route regardless.
export function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role environment variables');
  }
  return createClient(url, serviceRoleKey);
}
