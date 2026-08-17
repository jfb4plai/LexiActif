// api/ping.ts
// Step 12: check whether the engines.node pin actually changed the runtime.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, nodeVersion: process.version });
}
