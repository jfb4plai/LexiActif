// api/play-attempt.ts
//
// NOTE: self-contained, no shared helper import — see the comment at the
// top of api/play-list.ts for why.
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    const baseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !serviceKey) {
      res.status(500).json({ error: 'Configuration serveur manquante' });
      return;
    }
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

    // The `share_code !== code` check is the key defense here: it proves
    // the sessionId the client is submitting an attempt for was genuinely
    // created against THIS share code's list, not an arbitrary session
    // UUID borrowed from elsewhere.
    const sessionResponse = await fetch(
      `${baseUrl}/rest/v1/lexi_sessions?select=id,lexi_word_lists(share_code)&id=eq.${encodeURIComponent(sessionId)}`,
      { headers }
    );
    if (!sessionResponse.ok) {
      res.status(403).json({ error: 'Session invalide pour ce lien' });
      return;
    }
    const sessions = (await sessionResponse.json()) as SessionRow[];
    const session = sessions[0];
    if (!session || session.lexi_word_lists?.share_code !== code) {
      res.status(403).json({ error: 'Session invalide pour ce lien' });
      return;
    }

    const attemptResponse = await fetch(`${baseUrl}/rest/v1/lexi_attempts`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        session_id: sessionId,
        mot,
        reussi,
        lettres_bien_placees: lettresBienPlacees,
        score,
        distracteurs_actifs: distracteursActifs,
      }),
    });
    if (!attemptResponse.ok) {
      res.status(500).json({ error: "Erreur lors de l'enregistrement" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inattendue' });
  }
}
