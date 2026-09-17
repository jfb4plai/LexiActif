// src/components/StudentDashboard.tsx
import { useEffect, useState } from 'react';
import { listStudentProgress, type StudentProgress } from '../lib/attempts';

interface StudentDashboardProps {
  userId: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'jamais';
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function StudentDashboard({ userId }: StudentDashboardProps) {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    listStudentProgress(userId).then(setStudents).catch((e) => setError(e.message));
  }, [userId]);

  const activeStudents = students.filter((s) => s.lists.length > 0);
  const listesTravaillees = new Set(activeStudents.flatMap((s) => s.lists.map((l) => l.listId))).size;
  const scoreMoyen =
    activeStudents.length > 0
      ? Math.round(activeStudents.reduce((sum, s) => sum + s.totalScore, 0) / activeStudents.length)
      : 0;

  return (
    <div className="plai-card">
      <h2 className="font-serif text-lg mb-3">Tableau de bord — vue par élève</h2>
      {error && (
        <div className="plai-error" role="alert">
          {error}
        </div>
      )}

      {students.length === 0 && !error && <p className="plai-empty">Aucun élève enregistré.</p>}

      {students.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface2)] p-3 text-center">
            <p className="text-2xl font-bold">{activeStudents.length}</p>
            <p className="text-xs text-[var(--text2)]">élève(s) actif(s)</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface2)] p-3 text-center">
            <p className="text-2xl font-bold">{listesTravaillees}</p>
            <p className="text-xs text-[var(--text2)]">liste(s) travaillée(s)</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface2)] p-3 text-center">
            <p className="text-2xl font-bold">{scoreMoyen}</p>
            <p className="text-xs text-[var(--text2)]">score moyen / élève</p>
          </div>
        </div>
      )}

      {students.map((student) => {
        const expanded = expandedStudent === student.studentId;
        const detailId = `student-progress-${student.studentId}`;
        return (
          <div key={student.studentId} className="py-2 border-b border-[var(--border)]">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  {student.studentCode}
                  {student.classe ? ` — ${student.classe}` : ''}
                </p>
                <p className="text-sm text-[var(--text2)]">
                  {student.lists.length === 0
                    ? "n'a encore joué à aucune liste"
                    : `${student.lists.length} liste(s) — ${student.totalSucceededWords} mot(s) réussi(s) — ${student.totalScore} points — dernière activité : ${formatDate(student.lastActivity)}`}
                </p>
              </div>
              {student.lists.length > 0 && (
                <button
                  type="button"
                  className="text-sm text-[var(--teal-text)]"
                  onClick={() => setExpandedStudent(expanded ? null : student.studentId)}
                  aria-expanded={expanded}
                  aria-controls={detailId}
                >
                  {expanded ? 'Masquer le détail' : 'Voir le détail'}
                </button>
              )}
            </div>
            {expanded && (
              <div id={detailId} className="mt-2 space-y-2">
                {student.lists.map((list) => (
                  <div
                    key={list.listId}
                    className="flex justify-between items-center text-sm bg-[var(--surface2)] rounded-[var(--radius-sm)] px-3 py-2"
                  >
                    <span>{list.listNom}</span>
                    <span className="text-[var(--text2)]">
                      {list.succeededWords}
                      {list.totalWords > 0 ? ` / ${list.totalWords}` : ''} mot(s) — {list.attemptsCount} tentative(s) —{' '}
                      {list.score} pts — {formatDate(list.lastActivity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
