// api/postgrest.ts
// Direct PostgREST access via fetch(), replacing @supabase/supabase-js for
// server-side use in these functions. @supabase/supabase-js's query builder
// reliably crashed the whole Vercel Node.js function process (bypassing
// even top-level try/catch and process-level uncaughtException/
// unhandledRejection handlers) when actually executing a query, while a
// raw fetch() to the same PostgREST endpoint worked correctly in every
// test during diagnosis. See commit history around 2026-08 for the full
// bisection trail if this needs revisiting.
const BASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(): { baseUrl: string; serviceKey: string } {
  if (!BASE_URL || !SERVICE_KEY) {
    throw new Error('Missing Supabase service-role environment variables');
  }
  return { baseUrl: BASE_URL, serviceKey: SERVICE_KEY };
}

function requestHeaders(serviceKey: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function pgSelect<T>(table: string, query: string): Promise<T> {
  const { baseUrl, serviceKey } = assertEnv();
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
    headers: requestHeaders(serviceKey),
  });
  if (!response.ok) {
    throw new Error(`PostgREST select on ${table} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export async function pgInsert<T>(table: string, body: unknown): Promise<T> {
  const { baseUrl, serviceKey } = assertEnv();
  const response = await fetch(`${baseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: requestHeaders(serviceKey, { Prefer: 'return=representation' }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`PostgREST insert on ${table} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}
