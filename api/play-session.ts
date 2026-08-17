// api/play-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pgInsert, pgSelect } from './postgrest';

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

    const lists = await pgSelect<WordListRow[]>(
      'lexi_word_lists',
      `select=id,user_id&share_code=eq.${encodeURIComponent(code)}`
    );
    const list = lists[0];
    if (!list) {
      res.status(404).json({ error: 'Lien invalide ou expiré' });
      return;
    }

    // The studentId-belongs-to-list.user_id check is the key defense here:
    // without it, a client could pass any student UUID it can guess/
    // enumerate and create a session — and later attempts — attributed to
    // a student under a different teacher's roster.
    const students = await pgSelect<StudentRow[]>(
      'lexi_students',
      `select=id&id=eq.${encodeURIComponent(studentId)}&user_id=eq.${list.user_id}`
    );
    if (!students[0]) {
      res.status(403).json({ error: 'Élève invalide pour cette liste' });
      return;
    }

    const sessions = await pgInsert<SessionRow[]>('lexi_sessions', {
      list_id: list.id,
      student_id: studentId,
    });
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
