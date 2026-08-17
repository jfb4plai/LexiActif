// src/components/AttemptsView.tsx
import { useEffect, useState } from 'react';
import type { WordList } from '../lib/types';
import { listAttemptsForWordList, type AttemptsForList } from '../lib/attempts';

interface AttemptsViewProps {
  list: WordList;
  onBack: () => void;
}

export function AttemptsView({ list, onBack }: AttemptsViewProps) {
  const [rows, setRows] = useState<AttemptsForList[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAttemptsForWordList(list.id).then(setRows).catch((e) => setError(e.message));
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
        const wordsFound = row.attempts.filter((a) => a.reussi).length;
        return (
          <div key={row.studentCode} className="py-2 border-b border-[var(--border)]">
            <p className="font-semibold">{row.studentCode}</p>
            <p className="text-sm text-[var(--text2)]">
              {wordsFound} mot(s) réussi(s) — {totalScore} points
            </p>
          </div>
        );
      })}
    </div>
  );
}
