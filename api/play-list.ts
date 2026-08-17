// api/play-list.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pgSelect } from './postgrest';

interface WordListRow {
  id: string;
  user_id: string;
  nom: string;
  ordre_aleatoire: boolean;
  distracteurs_actifs: boolean;
  nb_distracteurs: number;
  indices_actifs: boolean;
}

interface WordRow {
  mot: string;
}

interface StudentRow {
  id: string;
  code_anonyme: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Méthode non autorisée' });
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) {
      res.status(400).json({ error: 'Code manquant' });
      return;
    }

    const lists = await pgSelect<WordListRow[]>(
      'lexi_word_lists',
      `select=id,user_id,nom,ordre_aleatoire,distracteurs_actifs,nb_distracteurs,indices_actifs&share_code=eq.${encodeURIComponent(code)}`
    );
    const list = lists[0];
    if (!list) {
      res.status(404).json({ error: 'Lien invalide ou expiré' });
      return;
    }

    const words = await pgSelect<WordRow[]>(
      'lexi_words',
      `select=mot,position&list_id=eq.${list.id}&order=position.asc`
    );

    const students = await pgSelect<StudentRow[]>(
      'lexi_students',
      `select=id,code_anonyme&user_id=eq.${list.user_id}&order=code_anonyme.asc`
    );

    // `list.user_id` is used above only to scope the students query — it is
    // deliberately NOT included in the response object below.
    res.status(200).json({
      list: {
        id: list.id,
        nom: list.nom,
        ordre_aleatoire: list.ordre_aleatoire,
        distracteurs_actifs: list.distracteurs_actifs,
        nb_distracteurs: list.nb_distracteurs,
        indices_actifs: list.indices_actifs,
      },
      words: words.map((w) => w.mot),
      students,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inattendue' });
  }
}
