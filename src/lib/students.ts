// src/lib/students.ts
import { supabase } from './supabase';
import type { Student } from './types';

export async function listStudents(userId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('lexi_students')
    .select('*')
    .eq('user_id', userId)
    .order('code_anonyme', { ascending: true });
  if (error) throw error;
  return data as Student[];
}

export async function createStudent(
  userId: string,
  codeAnonyme: string,
  classe: string | null
): Promise<Student> {
  const { data, error } = await supabase
    .from('lexi_students')
    .insert({ user_id: userId, code_anonyme: codeAnonyme, classe })
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('lexi_students').delete().eq('id', id);
  if (error) throw error;
}
