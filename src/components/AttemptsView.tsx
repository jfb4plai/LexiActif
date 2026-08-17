// src/components/AttemptsView.tsx
import { useEffect, useState } from 'react';
import type { WordList } from '../lib/types';
import { listAttemptsForWordList, type AttemptsForList } from '../lib/attempts';
import { getWords } from '../lib/wordLists';

interface AttemptsViewProps {
  list: WordList;
  onBack: () => void;
}

export function AttemptsView({ list, onBack }: AttemptsViewProps) {
  const [rows, setRows] = useState<AttemptsForList[]>([]);
  const [allWords, setAllWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    listAttemptsForWordList(list.id).then(setRows).catch((e) => setError(e.message));
    getWords(list.id)
      .then((words) => setAllWords(words.map((w) => w.mot)))
      .catch((e) => setError(e.message));
  }, [list.id]);

  return (
    <div className="plai-card">
      <button type="button" className="text-sm text-[var(--text3)] mb-3" onClick={onBack}>
        ← Retour
      </button>
      <h2 className="font-serif text-lg mb-3">Progression — {list.nom}</h2>
      {error && <div className="plai-error" role="alert">{error}</div>}
      {rows.length === 0 && !error && <p className="plai-empty">Aucune tentative enregistrée pour cette liste.</p>}
      {rows.map((row) => {
        const totalScore = row.attempts.reduce((sum, a) => sum + a.score, 0);
        const succeededWords = Array.from(new Set(row.attempts.filter((a) => a.reussi).map((a) => a.mot)));
        const remainingWords = allWords.filter((w) => !succeededWords.includes(w));
        const expanded = expandedStudent === row.studentCode;
        const detailId = `attempt-detail-${row.studentCode}`;
        return (
          <div key={row.studentCode} className="py-2 border-b border-[var(--border)]">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{row.studentCode}</p>
                <p className="text-sm text-[var(--text2)]">
                  {succeededWords.length} mot(s) réussi(s) — {totalScore} points
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-[var(--teal-text)]"
                onClick={() => setExpandedStudent(expanded ? null : row.studentCode)}
                aria-expanded={expanded}
                aria-controls={detailId}
              >
                {expanded ? 'Masquer le détail' : 'Voir le détail'}
              </button>
            </div>
            {expanded && (
              <div id={detailId} className="text-sm text-[var(--text2)] mt-2">
                <p>
                  <span className="font-semibold">Réussis :</span>{' '}
                  {succeededWords.length > 0 ? succeededWords.join(', ') : 'aucun'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Restants :</span>{' '}
                  {remainingWords.length > 0 ? remainingWords.join(', ') : 'aucun — liste terminée'}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
