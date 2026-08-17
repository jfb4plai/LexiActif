// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 9: the crash bypasses even a
// top-level try/catch around an awaited call, which means it's very likely
// an uncaughtException/unhandledRejection firing outside our await chain.
// Registering process-level handlers prevents Node's default "terminate on
// uncaughtException with no listeners" behavior, so we can capture and
// report the real error instead of the process dying silently.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  let diag: unknown = null;

  const onUncaught = (err: unknown) => {
    diag = { type: 'uncaughtException', detail: err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err) };
  };
  const onRejection = (reason: unknown) => {
    diag = { type: 'unhandledRejection', detail: reason instanceof Error ? `${reason.name}: ${reason.message}\n${reason.stack}` : String(reason) };
  };
  process.on('uncaughtException', onUncaught);
  process.on('unhandledRejection', onRejection);

  let result: unknown = null;
  let caught: string | null = null;
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.from('lexi_word_lists').select('id').limit(1);
    result = { data, error: error?.message ?? null };
  } catch (e) {
    caught = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // Give any stray async exception a moment to land in `diag` before we
  // respond and the function instance potentially gets torn down.
  await new Promise((resolve) => setTimeout(resolve, 300));

  process.off('uncaughtException', onUncaught);
  process.off('unhandledRejection', onRejection);

  res.status(200).json({ ok: true, result, caught, diag });
}
