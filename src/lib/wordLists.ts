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
