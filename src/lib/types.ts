// src/lib/types.ts

export interface WordList {
  id: string;
  user_id: string;
  nom: string;
  ordre_aleatoire: boolean;
  distracteurs_actifs: boolean;
  nb_distracteurs: number;
  indices_actifs: boolean;
  created_at: string;
}

export interface Word {
  id: string;
  list_id: string;
  mot: string;
  position: number;
}

export interface Student {
  id: string;
  user_id: string;
  code_anonyme: string;
  classe: string | null;
  created_at: string;
}

export interface GameSession {
  id: string;
  list_id: string;
  student_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface Attempt {
  id: string;
  session_id: string;
  mot: string;
  reussi: boolean;
  lettres_bien_placees: number;
  score: number;
  distracteurs_actifs: boolean;
  created_at: string;
}
