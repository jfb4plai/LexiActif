// src/components/Game.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameDataSource, GameStudent, GameWordList } from '../lib/gameDataSource';
import { buildWheelLetters, buildWordQueue, countWellPlaced, scoreForWord } from '../lib/gameEngine';
import { speechLangFor } from '../lib/languages';

interface GameProps {
  list: GameWordList;
  student: GameStudent;
  dataSource: GameDataSource;
  onExit: () => void;
}

const WHEEL_SIZE = 260;
const WHEEL_RADIUS = 100;
const HINT_COST = 5;

function speak(word: string, lang: string) {
  try {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  } catch {
    // synthèse vocale non prise en charge par ce navigateur — pas bloquant
  }
}

export function Game({ list, student, dataSource, onExit }: GameProps) {
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
  const [hintsUsed, setHintsUsed] = useState(0);
  const advanceTimeoutRef = useRef<number | undefined>(undefined);

  const currentWord = queue ? queue[wordIndex] : null;
  const attempt = useMemo(() => selectedIndices.map((i) => wheelLetters[i]).join(''), [selectedIndices, wheelLetters]);

  useEffect(() => {
    dataSource
      .createSession(list.id, student.id)
      .then(setSessionId)
      .catch(() => setError('Impossible de démarrer la partie. Réessayez.'));
  }, [dataSource, list.id, student.id]);

  useEffect(() => {
    dataSource
      .getWords(list.id)
      .then((ordered) => {
        setQueue(buildWordQueue(ordered, list.ordre_aleatoire));
      })
      .catch(() => setError('Impossible de charger les mots. Réessayez.'));
  }, [dataSource, list.id, list.ordre_aleatoire]);

  useEffect(() => {
    if (!currentWord) return;
    setWheelLetters(
      buildWheelLetters(currentWord, list.distracteurs_actifs, list.nb_distracteurs, undefined, list.langue)
    );
    setSelectedIndices([]);
    setFound(false);
    setHintsUsed(0);
  }, [wordIndex, currentWord, list.distracteurs_actifs, list.nb_distracteurs, list.langue]);

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
    if (selectedIndices.length >= currentWord.length) return;
    setSelectedIndices((prev) => [...prev, index]);
  };

  const clearAttempt = () => setSelectedIndices([]);

  const getHint = () => {
    if (!list.indices_actifs || found) return;
    if (score < HINT_COST) {
      setMessage(`Score insuffisant pour un indice (${HINT_COST} points nécessaires).`);
      return;
    }
    const nextPos = attempt.length;
    if (nextPos >= currentWord.length) {
      setMessage('Vous avez déjà toutes les lettres.');
      return;
    }
    const neededLetter = currentWord[nextPos];
    const wheelIndex = wheelLetters.findIndex((l, i) => l === neededLetter && !selectedIndices.includes(i));
    if (wheelIndex === -1) {
      setMessage("Indice indisponible pour cette lettre — essayez d'effacer votre sélection.");
      return;
    }
    setSelectedIndices((prev) => [...prev, wheelIndex]);
    setScore((s) => s - HINT_COST);
    setHintsUsed((h) => h + 1);
    setMessage(`Indice utilisé (-${HINT_COST} points)`);
  };

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
    const netScore = Math.max(0, scoreForWord(currentWord) - hintsUsed * HINT_COST);

    try {
      await dataSource.recordAttempt({
        sessionId,
        mot: currentWord,
        reussi: success,
        lettresBienPlacees: wellPlaced,
        score: success ? netScore : 0,
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
      speak(currentWord, speechLangFor(list.langue));
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
    speak(currentWord, speechLangFor(list.langue));
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
        {currentWord.split('').map((_, i) => {
          const shownLetter = found ? currentWord[i] : attempt[i];
          return (
            <div
              key={i}
              className="w-10 h-10 flex items-center justify-center rounded font-bold text-lg"
              style={{
                background: found ? 'var(--teal)' : shownLetter ? 'var(--surface)' : 'var(--surface2)',
                color: found ? 'white' : 'inherit',
                border: shownLetter && !found ? '2px solid var(--teal)' : undefined,
              }}
            >
              {shownLetter ?? ''}
            </div>
          );
        })}
      </div>

      <div
        className="relative mx-auto my-4"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, border: '2px dashed var(--teal)', borderRadius: '50%' }}
        role="group"
        aria-label="Roue de lettres"
      >
        {wheelLetters.map((letter, i) => {
          const angle = ((i * (360 / wheelLetters.length)) - 90) * (Math.PI / 180);
          const center = WHEEL_SIZE / 2;
          const x = center + WHEEL_RADIUS * Math.cos(angle);
          const y = center + WHEEL_RADIUS * Math.sin(angle);
          const letterSize = wheelLetters.length > 8 ? 40 : 48;
          return (
            <button
              key={i}
              type="button"
              className="absolute rounded-full font-bold text-lg flex items-center justify-center"
              style={{
                width: letterSize,
                height: letterSize,
                left: x - letterSize / 2,
                top: y - letterSize / 2,
                background: selectedIndices.includes(i) ? 'var(--teal)' : 'var(--surface)',
                color: selectedIndices.includes(i) ? 'white' : 'inherit',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              }}
              aria-label={`lettre ${letter}`}
              aria-pressed={selectedIndices.includes(i)}
              disabled={selectedIndices.includes(i) || found || selectedIndices.length >= currentWord.length}
              onClick={() => selectLetter(i)}
            >
              {letter}
            </button>
          );
        })}
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
        {list.indices_actifs && (
          <button
            type="button"
            className="plai-btn"
            style={{ background: '#f7b731' }}
            onClick={getHint}
            aria-label={`Obtenir un indice (coûte ${HINT_COST} points)`}
            disabled={found}
          >
            💡
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="text-center mt-4">
        {message}
      </p>
    </div>
  );
}
