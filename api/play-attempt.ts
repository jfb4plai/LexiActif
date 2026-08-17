// api/play-attempt.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pgInsert, pgSelect } from './postgrest';

interface PlayAttemptBody {
  code?: unknown;
  sessionId?: unknown;
  mot?: unknown;
  reussi?: unknown;
  lettresBienPlacees?: unknown;
  score?: unknown;
  distracteursActifs?: unknown;
}

interface SessionRow {
  id: string;
  lexi_word_lists: { share_code: string | null } | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    // The `typedSession.lexi_word_lists.share_code !== code` check is the
    // key defense here: it proves the sessionId the client is submitting an
    // attempt for was genuinely created against THIS share code's list, not
    // an arbitrary session UUID borrowed from elsewhere.
    const sessions = await pgSelect<SessionRow[]>(
      'lexi_sessions',
      `select=id,lexi_word_lists(share_code)&id=eq.${encodeURIComponent(sessionId)}`
    );
    const session = sessions[0];
    if (!session || session.lexi_word_lists?.share_code !== code) {
      res.status(403).json({ error: 'Session invalide pour ce lien' });
      return;
    }

    await pgInsert('lexi_attempts', {
      session_id: sessionId,
      mot,
      reussi,
      lettres_bien_placees: lettresBienPlacees,
      score,
      distracteurs_actifs: distracteursActifs,
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inattendue' });
  }
}
