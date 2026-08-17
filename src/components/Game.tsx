// src/components/Game.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Student, WordList } from '../lib/types';
import { getWords } from '../lib/wordLists';
import { createSession, recordAttempt } from '../lib/attempts';
import { buildWheelLetters, buildWordQueue, countWellPlaced, scoreForWord } from '../lib/gameEngine';

interface GameProps {
  list: WordList;
  student: Student;
  onExit: () => void;
}

export function Game({ list, student, onExit }: GameProps) {
  const [queue, setQueue] = useState<string[] | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [wheelLetters, setWheelLetters] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const advanceTimeoutRef = useRef<number | undefined>(undefined);

  const currentWord = queue ? queue[wordIndex] : null;
  const attempt = useMemo(() => selectedIndices.map((i) => wheelLetters[i]).join(''), [selectedIndices, wheelLetters]);

  useEffect(() => {
    createSession({ listId: list.id, studentId: student.id })
      .then(setSessionId)
      .catch(() => setError('Impossible de démarrer la partie. Réessayez.'));
  }, [list.id, student.id]);

  useEffect(() => {
    getWords(list.id)
      .then((words) => {
        const ordered = words.map((w) => w.mot);
        setQueue(buildWordQueue(ordered, list.ordre_aleatoire));
      })
      .catch(() => setError('Impossible de charger les mots. Réessayez.'));
  }, [list.id, list.ordre_aleatoire]);

  useEffect(() => {
    if (!currentWord) return;
    setWheelLetters(buildWheelLetters(currentWord, list.distracteurs_actifs, list.nb_distracteurs));
    setSelectedIndices([]);
    setFound(false);
  }, [wordIndex, currentWord, list.distracteurs_actifs, list.nb_distracteurs]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current !== undefined) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  if (!queue) return <p aria-live="polite">Chargement de la partie...</p>;
  if (!currentWord) return <p>Toutes les listes de mots sont terminées. Bravo !</p>;

  const selectLetter = (index: number) => {
    if (selectedIndices.includes(index) || found) return;
    setSelectedIndices((prev) => [...prev, index]);
  };

  const clearAttempt = () => setSelectedIndices([]);

  const submit = async () => {
    if (submitting) return;
    if (attempt.length === 0) {
      setMessage('Sélectionnez des lettres avant de valider.');
      return;
    }
    if (!sessionId) {
      setMessage('La partie démarre encore, patientez un instant...');
      return;
    }
    setSubmitting(true);
    const wellPlaced = countWellPlaced(attempt, currentWord);
    const success = attempt === currentWord;

    try {
      await recordAttempt({
        sessionId,
        mot: currentWord,
        reussi: success,
        lettresBienPlacees: wellPlaced,
        score: success ? scoreForWord(currentWord) : 0,
        distracteursActifs: list.distracteurs_actifs,
      });
    } catch {
      setSubmitting(false);
      setMessage("Erreur lors de l'enregistrement, réessayez.");
      return;
    }

    if (success) {
      const gained = scoreForWord(currentWord);
      setScore((s) => s + gained);
      setWordsFound((n) => n + 1);
      setFound(true);
      setMessage(`Bravo ! +${gained} points`);
      advanceTimeoutRef.current = window.setTimeout(() => {
        setWordIndex((i) => i + 1);
        setMessage('');
        setSubmitting(false);
      }, 1500);
    } else {
      setMessage(`${wellPlaced} lettre(s) sur ${currentWord.length} sont bien placée(s).`);
      setSelectedIndices([]);
      setSubmitting(false);
    }
  };

  const pronounce = () => {
    if (!found) {
      setMessage("Trouvez d'abord le mot pour entendre sa prononciation.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(currentWord);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="plai-section" style={{ maxWidth: 600, margin: '0 auto' }}>
      <button type="button" className="text-sm text-[var(--text3)] mb-3" onClick={onExit}>
        ← Quitter
      </button>
      {error && <div className="plai-error mb-3" role="alert">{error}</div>}
      <p className="text-sm text-[var(--text2)]">
        {student.code_anonyme} — {wordsFound} mot(s) réussi(s) — {score} points
      </p>

      <div className="flex justify-center gap-2 my-4" aria-label="Grille du mot">
        {currentWord.split('').map((letter, i) => (
          <div
            key={i}
            className="w-10 h-10 flex items-center justify-center rounded font-bold text-lg"
            style={{ background: found ? 'var(--teal)' : 'var(--surface2)', color: found ? 'white' : 'inherit' }}
          >
            {found ? letter : ''}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 my-4" role="group" aria-label="Roue de lettres">
        {wheelLetters.map((letter, i) => (
          <button
            key={i}
            type="button"
            className="w-12 h-12 rounded-full font-bold text-lg"
            style={{
              background: selectedIndices.includes(i) ? 'var(--teal)' : 'var(--surface)',
              color: selectedIndices.includes(i) ? 'white' : 'inherit',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            }}
            aria-label={`lettre ${letter}`}
            aria-pressed={selectedIndices.includes(i)}
            disabled={selectedIndices.includes(i) || found}
            onClick={() => selectLetter(i)}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <button type="button" className="plai-btn" onClick={clearAttempt} aria-label="Effacer la sélection">
          ⌫
        </button>
        <button type="button" className="plai-btn" onClick={submit} aria-label="Valider le mot" disabled={submitting}>
          ✓
        </button>
        <button
          type="button"
          className="plai-btn"
          onClick={pronounce}
          aria-label="Prononcer le mot"
          aria-disabled={!found}
          style={!found ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        >
          🔊
        </button>
      </div>

      <p role="status" aria-live="polite" className="text-center mt-4">
        {message}
      </p>
    </div>
  );
}
