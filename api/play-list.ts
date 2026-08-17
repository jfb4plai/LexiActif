// api/play-list.ts
//
// NOTE: PostgREST access is inlined here rather than factored into a shared
// helper module. During deployment diagnosis, every api/*.ts function that
// imported an async operation (an `await fetch(...)`) from a sibling file
// crashed the whole Vercel Node.js function process with an uncatchable
// FUNCTION_INVOCATION_FAILED — bypassing top-level try/catch and even
// process-level uncaughtException/unhandledRejection handlers. The exact
// same fetch() call, written inline in the handler's own file, worked
// reliably in every test. This looks like a Vercel function-bundler quirk
// with cross-file async imports under this project's "type": "module"
// config, not a Supabase-specific issue (an earlier version of this file
// crashed identically using @supabase/supabase-js). Until that's root-
// caused, keep each api/*.ts file self-contained — do not extract this
// fetch logic into api/postgrest.ts or any other shared module.
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface WordListRow {
  id: string;
  user_id: string;
  nom: string;
  ordre_aleatoire: boolean;
  distracteurs_actifs: boolean;
  nb_distracteurs: number;
  indices_actifs: boolean;
  langue: string;
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

    const baseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !serviceKey) {
      res.status(500).json({ error: 'Configuration serveur manquante' });
      return;
    }
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

    const listResponse = await fetch(
      `${baseUrl}/rest/v1/lexi_word_lists?select=id,user_id,nom,ordre_aleatoire,distracteurs_actifs,nb_distracteurs,indices_actifs,langue&share_code=eq.${encodeURIComponent(code)}`,
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

    const wordsResponse = await fetch(
      `${baseUrl}/rest/v1/lexi_words?select=mot,position&list_id=eq.${list.id}&order=position.asc`,
      { headers }
    );
    if (!wordsResponse.ok) {
      res.status(500).json({ error: 'Erreur lors du chargement des mots' });
      return;
    }
    const words = (await wordsResponse.json()) as WordRow[];

    const studentsResponse = await fetch(
      `${baseUrl}/rest/v1/lexi_students?select=id,code_anonyme&user_id=eq.${list.user_id}&order=code_anonyme.asc`,
      { headers }
    );
    if (!studentsResponse.ok) {
      res.status(500).json({ error: 'Erreur lors du chargement des élèves' });
      return;
    }
    const students = (await studentsResponse.json()) as StudentRow[];

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
        langue: list.langue,
      },
      words: words.map((w) => w.mot),
      students,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inattendue' });
  }
}
