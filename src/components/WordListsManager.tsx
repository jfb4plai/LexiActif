// src/components/WordListsManager.tsx
import { Fragment, useEffect, useState } from 'react';
import type { WordList } from '../lib/types';
import { createWordList, deleteWordList, getWords, listWordLists, updateWordList } from '../lib/wordLists';
import { FormField } from './FormField';
import { ShareLinkPanel } from './ShareLinkPanel';

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
  const [indicesActifs, setIndicesActifs] = useState(false);
  const [showRissNote, setShowRissNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sharingListId, setSharingListId] = useState<string | null>(null);

  useEffect(() => {
    listWordLists(userId).then(setLists).catch((e) => setError(e.message));
  }, [userId]);

  const words = parseWords(rawWords);
  const longWords = words.filter((w) => w.length > LONG_WORD_THRESHOLD);

  const resetForm = () => {
    setEditingId(null);
    setNom('');
    setRawWords('');
    setOrdreAleatoire(false);
    setDistracteursActifs(false);
    setNbDistracteurs(1);
    setIndicesActifs(false);
  };

  const handleEdit = async (list: WordList) => {
    setError(null);
    try {
      const listWords = await getWords(list.id);
      setEditingId(list.id);
      setNom(list.nom);
      setRawWords(listWords.map((w) => w.mot).join('\n'));
      setOrdreAleatoire(list.ordre_aleatoire);
      setDistracteursActifs(list.distracteurs_actifs);
      setNbDistracteurs(list.nb_distracteurs || 1);
      setIndicesActifs(list.indices_actifs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement de la liste.');
    }
  };

  const handleDelete = async (list: WordList) => {
    if (
      !window.confirm(
        `Supprimer la liste « ${list.nom} » ? Cette action supprime aussi tout l'historique de parties liées à cette liste.`
      )
    ) {
      return;
    }
    setError(null);
    try {
      await deleteWordList(list.id);
      setLists((prev) => prev.filter((l) => l.id !== list.id));
      if (editingId === list.id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
    }
  };

  const handleSubmit = async () => {
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
      if (editingId) {
        const updated = await updateWordList({
          listId: editingId,
          nom: nom.trim(),
          words,
          ordreAleatoire,
          distracteursActifs,
          nbDistracteurs: distracteursActifs ? nbDistracteurs : 0,
          indicesActifs,
        });
        setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const list = await createWordList({
          userId,
          nom: nom.trim(),
          words,
          ordreAleatoire,
          distracteursActifs,
          nbDistracteurs: distracteursActifs ? nbDistracteurs : 0,
          indicesActifs,
        });
        setLists((prev) => [list, ...prev]);
      }
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’enregistrement.');
    }
  };

  return (
    <div className="plai-card">
      <h2 className="font-serif text-lg mb-3">
        {editingId ? 'Modifier la liste' : 'Listes de mots'}
      </h2>

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

      <label className="flex items-center gap-2 mt-2">
        <input type="checkbox" checked={indicesActifs} onChange={(e) => setIndicesActifs(e.target.checked)} />
        Indices disponibles pour l'élève (💡 révèle la lettre suivante, coûte 5 points)
      </label>

      {error && <div className="plai-error mt-2" role="alert">{error}</div>}
      <div className="flex gap-3 mt-3">
        <button className="plai-btn" type="button" onClick={handleSubmit}>
          {editingId ? 'Enregistrer les modifications' : 'Créer la liste'}
        </button>
        {editingId && (
          <button type="button" className="text-sm text-[var(--text3)]" onClick={resetForm}>
            Annuler
          </button>
        )}
      </div>

      <ul className="mt-4">
        {lists.length === 0 && <li className="plai-empty">Aucune liste créée.</li>}
        {lists.map((l) => (
          <Fragment key={l.id}>
            <li className="flex justify-between items-center py-1 border-b border-[var(--border)]">
              <span>{l.nom}</span>
              <span className="flex gap-3">
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => onPlayList(l)}
                  aria-label={`Jouer à la liste ${l.nom}`}
                >
                  Jouer
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => onOpenList(l)}
                  aria-label={`Voir la progression de la liste ${l.nom}`}
                >
                  Progression
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => setSharingListId((id) => (id === l.id ? null : l.id))}
                  aria-expanded={sharingListId === l.id}
                  aria-label={`Partager la liste ${l.nom}`}
                >
                  Partager
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => handleEdit(l)}
                  aria-label={`Modifier la liste ${l.nom}`}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="text-sm text-[var(--text3)]"
                  onClick={() => handleDelete(l)}
                  aria-label={`Supprimer la liste ${l.nom}`}
                >
                  Supprimer
                </button>
              </span>
            </li>
            {sharingListId === l.id && (
              <ShareLinkPanel
                list={l}
                onListUpdated={(updated) => setLists((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
              />
            )}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
