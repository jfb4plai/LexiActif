// api/play-attempt.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin';

interface PlayAttemptBody {
  code?: unknown;
  sessionId?: unknown;
  mot?: unknown;
  reussi?: unknown;
  lettresBienPlacees?: unknown;
  score?: unknown;
  distracteursActifs?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const { code, sessionId, mot, reussi, lettresBienPlacees, score, distracteursActifs } = (req.body ??
    {}) as PlayAttemptBody;

  if (
    typeof code !== 'string' ||
    typeof sessionId !== 'string' ||
    typeof mot !== 'string' ||
    typeof reussi !== 'boolean' ||
    typeof lettresBienPlacees !== 'number' ||
    typeof score !== 'number' ||
    typeof distracteursActifs !== 'boolean'
  ) {
    res.status(400).json({ error: 'Paramètres invalides' });
    return;
  }

  const supabase = supabaseAdmin();

  const { data: session, error: sessionError } = await supabase
    .from('lexi_sessions')
    .select('id, lexi_word_lists(share_code)')
    .eq('id', sessionId)
    .maybeSingle();

  type SessionRow = { id: string; lexi_word_lists: { share_code: string | null } | null };
  const typedSession = session as unknown as SessionRow | null;

  if (sessionError || !typedSession || typedSession.lexi_word_lists?.share_code !== code) {
    res.status(403).json({ error: 'Session invalide pour ce lien' });
    return;
  }

  const { error: attemptError } = await supabase.from('lexi_attempts').insert({
    session_id: sessionId,
    mot,
    reussi,
    lettres_bien_placees: lettresBienPlacees,
    score,
    distracteurs_actifs: distracteursActifs,
  });
  if (attemptError) {
    res.status(500).json({ error: "Erreur lors de l'enregistrement" });
    return;
  }

  res.status(200).json({ ok: true });
}
