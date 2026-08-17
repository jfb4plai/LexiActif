// api/ping.ts
// Bisecting FUNCTION_INVOCATION_FAILED. Step 10: check whether this
// function is actually running on the Edge runtime instead of Node.js
// (which would explain why `ws`/postgrest-js's Node-specific code paths
// crash uncatchably instead of throwing a normal JS error).
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    isEdgeRuntime: typeof (globalThis as unknown as { EdgeRuntime?: unknown }).EdgeRuntime !== 'undefined',
    processType: typeof process,
    nodeVersion: typeof process !== 'undefined' ? process.version : null,
    hasRequire: typeof require !== 'undefined',
  });
}
