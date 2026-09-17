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

  const studentTotals = rows.map((row) => row.attempts.reduce((sum, a) => sum + a.score, 0));
  const scoreMoyen =
    studentTotals.length > 0 ? Math.round(studentTotals.reduce((a, b) => a + b, 0) / studentTotals.length) : 0;

  const allAttempts = rows.flatMap((row) => row.attempts);
  const wordStats = allWords
    .map((word) => {
      const wordAttempts = allAttempts.filter((a) => a.mot === word);
      const total = wordAttempts.length;
      const errors = wordAttempts.filter((a) => !a.reussi).length;
      return { word, total, errors };
    })
    .filter((w) => w.total > 0)
    .sort((a, b) => b.errors / b.total - a.errors / a.total);

  return (
    <div className="plai-card">
      <button type="button" className="text-sm text-[var(--text3)] mb-3" onClick={onBack}>
        ← Retour
      </button>
      <h2 className="font-serif text-lg mb-3">Progression — {list.nom}</h2>
      {error && <div className="plai-error" role="alert">{error}</div>}
      {rows.length === 0 && !error && <p className="plai-empty">Aucune tentative enregistrée pour cette liste.</p>}

      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface2)] p-3 text-center">
            <p className="text-2xl font-bold">{rows.length}</p>
            <p className="text-xs text-[var(--text2)]">élève(s)</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface2)] p-3 text-center">
            <p className="text-2xl font-bold">{scoreMoyen}</p>
            <p className="text-xs text-[var(--text2)]">score moyen</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface2)] p-3 text-center">
            <p className="text-2xl font-bold">{allWords.length}</p>
            <p className="text-xs text-[var(--text2)]">mot(s) dans la liste</p>
          </div>
        </div>
      )}

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

      {wordStats.length > 0 && (
        <div className="mt-5">
          <h3 className="font-serif text-base mb-2">Statistiques par mot</h3>
          <p className="text-xs text-[var(--text3)] mb-3">
            Taux de réussite toutes tentatives et tous élèves confondus, triés du mot le plus difficile au plus
            facile.
          </p>
          <div className="space-y-2">
            {wordStats.map(({ word, total, errors }) => {
              const successRate = Math.round(((total - errors) / total) * 100);
              const barColor = successRate < 50 ? '#c0392b' : successRate < 80 ? '#e08e0b' : 'var(--teal)';
              return (
                <div key={word} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{word}</span>
                    <span className="text-[var(--text2)]">
                      {successRate}% ({total - errors}/{total})
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)]" role="presentation">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${successRate}%`, background: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
