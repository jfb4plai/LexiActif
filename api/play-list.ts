// api/play-list.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin';

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

    const supabase = supabaseAdmin();

    const { data: list, error: listError } = await supabase
      .from('lexi_word_lists')
      .select('id, user_id, nom, ordre_aleatoire, distracteurs_actifs, nb_distracteurs, indices_actifs')
      .eq('share_code', code)
      .maybeSingle();

    if (listError || !list) {
      res.status(404).json({ error: 'Lien invalide ou expiré' });
      return;
    }

    const { data: words, error: wordsError } = await supabase
      .from('lexi_words')
      .select('mot, position')
      .eq('list_id', list.id)
      .order('position', { ascending: true });

    if (wordsError || !words) {
      res.status(500).json({ error: 'Erreur lors du chargement des mots' });
      return;
    }

    const { data: students, error: studentsError } = await supabase
      .from('lexi_students')
      .select('id, code_anonyme')
      .eq('user_id', list.user_id)
      .order('code_anonyme', { ascending: true });

    if (studentsError || !students) {
      res.status(500).json({ error: 'Erreur lors du chargement des élèves' });
      return;
    }

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
    // TEMP diagnostic: surfaces the real thrown error instead of a bare
    // FUNCTION_INVOCATION_FAILED crash with no message. Tighten back to a
    // generic message once the root cause of the 500 is confirmed.
    res.status(500).json({ error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  }
}
