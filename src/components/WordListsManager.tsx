// src/components/WordListsManager.tsx
import { useEffect, useState } from 'react';
import type { WordList } from '../lib/types';
import { createWordList, listWordLists } from '../lib/wordLists';
import { FormField } from './FormField';

const LONG_WORD_THRESHOLD = 10;

interface WordListsManagerProps {
  userId: string;
  onOpenList: (list: WordList) => void;
  onPlayList: (list: WordList) => void;
}

function parseWords(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.toUpperCase());
}

export function WordListsManager({ userId, onOpenList, onPlayList }: WordListsManagerProps) {
  const [lists, setLists] = useState<WordList[]>([]);
  const [nom, setNom] = useState('');
  const [rawWords, setRawWords] = useState('');
  const [ordreAleatoire, setOrdreAleatoire] = useState(false);
  const [distracteursActifs, setDistracteursActifs] = useState(false);
  const [nbDistracteurs, setNbDistracteurs] = useState(1);
  const [showRissNote, setShowRissNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWordLists(userId).then(setLists).catch((e) => setError(e.message));
  }, [userId]);

  const words = parseWords(rawWords);
  const longWords = words.filter((w) => w.length > LONG_WORD_THRESHOLD);

  const handleCreate = async () => {
    setError(null);
    if (!nom.trim()) {
      setError('Le nom de la liste est obligatoire.');
      return;
    }
    if (words.length === 0) {
      setError('Ajoutez au moins un mot.');
      return;
    }
    try {
      const list = await createWordList({
        userId,
        nom: nom.trim(),
        words,
        ordreAleatoire,
        distracteursActifs,
        nbDistracteurs: distracteursActifs ? nbDistracteurs : 0,
      });
      setLists((prev) => [list, ...prev]);
      setNom('');
      setRawWords('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.');
    }
  };

  return (
    <div className="plai-card">
      <h2 className="font-serif text-lg mb-3">Listes de mots</h2>

      <FormField label="Nom de la liste" required help="Ex. « Animaux de la ferme », « Semaine 3 »." style={{ marginBottom: 12 }}>
        <input className="plai-input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Animaux de la ferme" />
      </FormField>

      <FormField
        label="Mots (un par ligne)"
        required
        help="L'ordre des mots dans la liste est respecté pendant la partie. Pour une difficulté progressive, placez les mots les plus courts/familiers en premier, les plus longs ou les moins fréquents ensuite."
        style={{ marginBottom: 4 }}
      >
        <textarea
          className="plai-input"
          rows={6}
          value={rawWords}
          onChange={(e) => setRawWords(e.target.value)}
          placeholder={'CHAT\nARBRE\nMAISON'}
        />
      </FormField>
      {longWords.length > 0 && (
        <p className="plai-banner" role="status">
          ⚠️ {longWords.length} mot(s) dépassent {LONG_WORD_THRESHOLD} lettres et risquent d'être peu lisibles sur la
          roue à l'écran : {longWords.join(', ')}
        </p>
      )}

      <label className="flex items-center gap-2 mt-3">
        <input type="checkbox" checked={ordreAleatoire} onChange={(e) => setOrdreAleatoire(e.target.checked)} />
        Ordre aléatoire des mots (désactivé : l'ordre de la liste ci-dessus est suivi)
      </label>

      <div className="flex items-center gap-2 mt-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={distracteursActifs}
            onChange={(e) => setDistracteursActifs(e.target.checked)}
          />
          Lettres distractrices
        </label>
        <button
          type="button"
          className="text-xs underline text-[var(--teal-text)]"
          onClick={() => setShowRissNote((v) => !v)}
          aria-expanded={showRissNote}
        >
          ⓘ pourquoi ?
        </button>
      </div>
      {showRissNote && (
        <p className="text-xs text-[var(--text3)] mt-1" role="note">
          Ajoute des lettres qui ne font pas partie du mot. Sans distracteurs, l'élève doit seulement retrouver
          l'ordre des lettres du mot (déjà toutes fournies) — un travail sur la structure orthographique séquentielle
          (Pacton, Fayol &amp; Perruchet). Avec distracteurs, l'élève doit aussi identifier quelles lettres composent
          le mot, ce qui se rapproche davantage d'un rappel en mémoire lexicale (Chaves, Bosse &amp; Largy, 2010).
          Aucune des deux versions n'est « la bonne » — à choisir selon l'objectif de la séance.
        </p>
      )}
      {distracteursActifs && (
        <FormField label="Nombre de lettres en trop" help="1 ou 2 lettres en plus de la roue, choisies au hasard." style={{ marginTop: 8, maxWidth: 200 }}>
          <select
            className="plai-input"
            value={nbDistracteurs}
            onChange={(e) => setNbDistracteurs(Number(e.target.value))}
          >
            <option value={1}>+1</option>
            <option value={2}>+2</option>
          </select>
        </FormField>
      )}

      {error && <div className="plai-error mt-2" role="alert">{error}</div>}
      <button className="plai-btn mt-3" type="button" onClick={handleCreate}>
        Créer la liste
      </button>

      <ul className="mt-4">
        {lists.length === 0 && <li className="plai-empty">Aucune liste créée.</li>}
        {lists.map((l) => (
          <li key={l.id} className="flex justify-between items-center py-1 border-b border-[var(--border)]">
            <span>{l.nom}</span>
            <span className="flex gap-3">
              <button type="button" className="text-sm text-[var(--teal-text)]" onClick={() => onPlayList(l)}>
                Jouer
              </button>
              <button type="button" className="text-sm text-[var(--teal-text)]" onClick={() => onOpenList(l)}>
                Progression
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
