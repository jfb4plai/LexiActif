// api/_supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// Prefixed with `_` so Vercel does not deploy this file as its own route —
// it's a shared helper for the other files in this directory, not an endpoint.
export function supabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role environment variables');
  }
  return createClient(url, serviceRoleKey);
}
