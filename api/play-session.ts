// api/play-session.ts
//
// NOTE: self-contained, no shared helper import — see the comment at the
// top of api/play-list.ts for why.
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface WordListRow {
  id: string;
  user_id: string;
}

interface StudentRow {
  id: string;
}

interface SessionRow {
  id: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    const { code, studentId } = (req.body ?? {}) as { code?: unknown; studentId?: unknown };
    if (typeof code !== 'string' || typeof studentId !== 'string') {
      res.status(400).json({ error: 'Paramètres manquants' });
      return;
    }

    const baseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !serviceKey) {
      res.status(500).json({ error: 'Configuration serveur manquante' });
      return;
    }
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

    const listResponse = await fetch(
      `${baseUrl}/rest/v1/lexi_word_lists?select=id,user_id&share_code=eq.${encodeURIComponent(code)}`,
      { headers }
    );
    if (!listResponse.ok) {
      res.status(404).json({ error: 'Lien invalide ou expiré' });
      return;
    }
    const lists = (await listResponse.json()) as WordListRow[];
    const list = lists[0];
    if (!list) {
      res.status(404).json({ error: 'Lien invalide ou expiré' });
      return;
    }

    // The studentId-belongs-to-list.user_id check is the key defense here:
    // without it, a client could pass any student UUID it can guess/
    // enumerate and create a session — and later attempts — attributed to
    // a student under a different teacher's roster.
    const studentResponse = await fetch(
      `${baseUrl}/rest/v1/lexi_students?select=id&id=eq.${encodeURIComponent(studentId)}&user_id=eq.${list.user_id}`,
      { headers }
    );
    if (!studentResponse.ok) {
      res.status(403).json({ error: 'Élève invalide pour cette liste' });
      return;
    }
    const students = (await studentResponse.json()) as StudentRow[];
    if (!students[0]) {
      res.status(403).json({ error: 'Élève invalide pour cette liste' });
      return;
    }

    const sessionResponse = await fetch(`${baseUrl}/rest/v1/lexi_sessions`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ list_id: list.id, student_id: studentId }),
    });
    if (!sessionResponse.ok) {
      res.status(500).json({ error: 'Erreur lors de la création de la session' });
      return;
    }
    const sessions = (await sessionResponse.json()) as SessionRow[];
    const session = sessions[0];
    if (!session) {
      res.status(500).json({ error: 'Erreur lors de la création de la session' });
      return;
    }

    res.status(200).json({ sessionId: session.id });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inattendue' });
  }
}
