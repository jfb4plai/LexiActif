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
