// api/play-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const { code, studentId } = (req.body ?? {}) as { code?: unknown; studentId?: unknown };
  if (typeof code !== 'string' || typeof studentId !== 'string') {
    res.status(400).json({ error: 'Paramètres manquants' });
    return;
  }

  const supabase = supabaseAdmin();

  const { data: list, error: listError } = await supabase
    .from('lexi_word_lists')
    .select('id, user_id')
    .eq('share_code', code)
    .maybeSingle();
  if (listError || !list) {
    res.status(404).json({ error: 'Lien invalide ou expiré' });
    return;
  }

  const { data: student, error: studentError } = await supabase
    .from('lexi_students')
    .select('id')
    .eq('id', studentId)
    .eq('user_id', list.user_id)
    .maybeSingle();
  if (studentError || !student) {
    res.status(403).json({ error: 'Élève invalide pour cette liste' });
    return;
  }

  const { data: session, error: sessionError } = await supabase
    .from('lexi_sessions')
    .insert({ list_id: list.id, student_id: studentId })
    .select('id')
    .single();
  if (sessionError || !session) {
    res.status(500).json({ error: 'Erreur lors de la création de la session' });
    return;
  }

  res.status(200).json({ sessionId: session.id });
}
