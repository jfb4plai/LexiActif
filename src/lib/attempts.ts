// src/lib/attempts.ts
import { supabase } from './supabase';
import type { Attempt } from './types';

export interface CreateSessionInput {
  listId: string;
  studentId: string;
}

export async function createSession(input: CreateSessionInput): Promise<string> {
  const { data, error } = await supabase
    .from('lexi_sessions')
    .insert({ list_id: input.listId, student_id: input.studentId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface RecordAttemptInput {
  sessionId: string;
  mot: string;
  reussi: boolean;
  lettresBienPlacees: number;
  score: number;
  distracteursActifs: boolean;
}

export async function recordAttempt(input: RecordAttemptInput): Promise<void> {
  const { error } = await supabase.from('lexi_attempts').insert({
    session_id: input.sessionId,
    mot: input.mot,
    reussi: input.reussi,
    lettres_bien_placees: input.lettresBienPlacees,
    score: input.score,
    distracteurs_actifs: input.distracteursActifs,
  });
  if (error) throw error;
}

export interface AttemptsForList {
  studentCode: string;
  attempts: Attempt[];
}

export async function listAttemptsForWordList(listId: string): Promise<AttemptsForList[]> {
  const { data, error } = await supabase
    .from('lexi_sessions')
    .select('id, lexi_students(code_anonyme), lexi_attempts(*)')
    .eq('list_id', listId);
  if (error) throw error;

  type Row = {
    id: string;
    lexi_students: { code_anonyme: string } | null;
    lexi_attempts: Attempt[];
  };

  const byStudent = new Map<string, Attempt[]>();
  for (const row of data as unknown as Row[]) {
    const code = row.lexi_students?.code_anonyme ?? '(élève supprimé)';
    const existing = byStudent.get(code) ?? [];
    byStudent.set(code, existing.concat(row.lexi_attempts));
  }

  return Array.from(byStudent.entries()).map(([studentCode, attempts]) => ({ studentCode, attempts }));
}

export interface StudentListProgress {
  listId: string;
  listNom: string;
  totalWords: number;
  succeededWords: number;
  attemptsCount: number;
  score: number;
  lastActivity: string;
}

export interface StudentProgress {
  studentId: string;
  studentCode: string;
  classe: string | null;
  lists: StudentListProgress[];
  totalScore: number;
  totalSucceededWords: number;
  lastActivity: string | null;
}

export async function listStudentProgress(userId: string): Promise<StudentProgress[]> {
  const { data, error } = await supabase
    .from('lexi_students')
    .select(
      'id, code_anonyme, classe, lexi_sessions(id, list_id, started_at, lexi_word_lists(id, nom), lexi_attempts(mot, reussi, score, created_at))'
    )
    .eq('user_id', userId)
    .order('code_anonyme', { ascending: true });
  if (error) throw error;

  type SessionRow = {
    id: string;
    list_id: string;
    started_at: string;
    lexi_word_lists: { id: string; nom: string } | null;
    lexi_attempts: { mot: string; reussi: boolean; score: number; created_at: string }[];
  };
  type StudentRow = {
    id: string;
    code_anonyme: string;
    classe: string | null;
    lexi_sessions: SessionRow[];
  };

  const rows = data as unknown as StudentRow[];

  const allListIds = new Set<string>();
  for (const row of rows) {
    for (const session of row.lexi_sessions) allListIds.add(session.list_id);
  }

  const wordCountByList = new Map<string, number>();
  if (allListIds.size > 0) {
    const { data: wordsData, error: wordsError } = await supabase
      .from('lexi_words')
      .select('list_id')
      .in('list_id', Array.from(allListIds));
    if (wordsError) throw wordsError;
    for (const w of wordsData as unknown as { list_id: string }[]) {
      wordCountByList.set(w.list_id, (wordCountByList.get(w.list_id) ?? 0) + 1);
    }
  }

  return rows.map((student) => {
    const byList = new Map<
      string,
      { nom: string; attempts: SessionRow['lexi_attempts']; lastActivity: string }
    >();
    for (const session of student.lexi_sessions) {
      const nom = session.lexi_word_lists?.nom ?? '(liste supprimée)';
      const existing = byList.get(session.list_id);
      const attempts = existing ? existing.attempts.concat(session.lexi_attempts) : session.lexi_attempts;
      const activityDates = attempts.map((a) => a.created_at).concat(session.started_at);
      const lastActivity = activityDates.reduce((latest, d) => (d > latest ? d : latest), session.started_at);
      byList.set(session.list_id, { nom, attempts, lastActivity });
    }

    const lists: StudentListProgress[] = Array.from(byList.entries())
      .map(([listId, { nom, attempts, lastActivity }]) => ({
        listId,
        listNom: nom,
        totalWords: wordCountByList.get(listId) ?? 0,
        succeededWords: new Set(attempts.filter((a) => a.reussi).map((a) => a.mot)).size,
        attemptsCount: attempts.length,
        score: attempts.reduce((sum, a) => sum + a.score, 0),
        lastActivity,
      }))
      .sort((a, b) => a.listNom.localeCompare(b.listNom));

    const totalScore = lists.reduce((sum, l) => sum + l.score, 0);
    const totalSucceededWords = lists.reduce((sum, l) => sum + l.succeededWords, 0);
    const lastActivity =
      lists.length > 0 ? lists.reduce((latest, l) => (l.lastActivity > latest ? l.lastActivity : latest), lists[0].lastActivity) : null;

    return {
      studentId: student.id,
      studentCode: student.code_anonyme,
      classe: student.classe,
      lists,
      totalScore,
      totalSucceededWords,
      lastActivity,
    };
  });
}
