// src/lib/wordLists.ts
import { supabase } from './supabase';
import type { Word, WordList } from './types';

export async function listWordLists(userId: string): Promise<WordList[]> {
  const { data, error } = await supabase
    .from('lexi_word_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as WordList[];
}

export async function getWords(listId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('lexi_words')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data as Word[];
}

export interface CreateWordListInput {
  userId: string;
  nom: string;
  words: string[];
  ordreAleatoire: boolean;
  distracteursActifs: boolean;
  nbDistracteurs: number;
}

export async function createWordList(input: CreateWordListInput): Promise<WordList> {
  const { data: list, error: listError } = await supabase
    .from('lexi_word_lists')
    .insert({
      user_id: input.userId,
      nom: input.nom,
      ordre_aleatoire: input.ordreAleatoire,
      distracteurs_actifs: input.distracteursActifs,
      nb_distracteurs: input.nbDistracteurs,
    })
    .select()
    .single();
  if (listError) throw listError;

  const rows = input.words.map((mot, index) => ({
    list_id: list.id,
    mot: mot.toUpperCase(),
    position: index,
  }));
  const { error: wordsError } = await supabase.from('lexi_words').insert(rows);
  if (wordsError) {
    await supabase.from('lexi_word_lists').delete().eq('id', list.id);
    throw wordsError;
  }

  return list as WordList;
}

export interface UpdateWordListInput {
  listId: string;
  nom: string;
  words: string[];
  ordreAleatoire: boolean;
  distracteursActifs: boolean;
  nbDistracteurs: number;
}

export async function updateWordList(input: UpdateWordListInput): Promise<WordList> {
  const { data: list, error: listError } = await supabase
    .from('lexi_word_lists')
    .update({
      nom: input.nom,
      ordre_aleatoire: input.ordreAleatoire,
      distracteurs_actifs: input.distracteursActifs,
      nb_distracteurs: input.nbDistracteurs,
    })
    .eq('id', input.listId)
    .select()
    .single();
  if (listError) throw listError;

  // Insert the new words BEFORE deleting the old ones, and only delete the old
  // rows we captured up front (by id) — if either step fails, the teacher's
  // existing list is never left empty.
  const { data: oldWords, error: oldWordsError } = await supabase
    .from('lexi_words')
    .select('id')
    .eq('list_id', input.listId);
  if (oldWordsError) throw oldWordsError;
  const oldIds = (oldWords ?? []).map((w) => w.id as string);

  const rows = input.words.map((mot, index) => ({
    list_id: input.listId,
    mot: mot.toUpperCase(),
    position: index,
  }));
  const { data: newWords, error: insertError } = await supabase.from('lexi_words').insert(rows).select('id');
  if (insertError) throw insertError;

  if (oldIds.length > 0) {
    const { error: deleteError } = await supabase.from('lexi_words').delete().in('id', oldIds);
    if (deleteError) {
      const newIds = (newWords ?? []).map((w) => w.id as string);
      await supabase.from('lexi_words').delete().in('id', newIds);
      throw deleteError;
    }
  }

  return list as WordList;
}

export async function deleteWordList(id: string): Promise<void> {
  const { error } = await supabase.from('lexi_word_lists').delete().eq('id', id);
  if (error) throw error;
}
