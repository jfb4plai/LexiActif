// src/components/StudentsManager.tsx
import { useEffect, useState } from 'react';
import type { Student } from '../lib/types';
import { createStudent, deleteStudent, listStudents } from '../lib/students';
import { FormField } from './FormField';

interface StudentsManagerProps {
  userId: string;
}

export function StudentsManager({ userId }: StudentsManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [code, setCode] = useState('');
  const [classe, setClasse] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStudents(userId).then(setStudents).catch((e) => setError(e.message));
  }, [userId]);

  const handleAdd = async () => {
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Le code élève est obligatoire.');
      return;
    }
    try {
      const student = await createStudent(userId, trimmed, classe.trim() || null);
      setStudents((prev) => [...prev, student].sort((a, b) => a.code_anonyme.localeCompare(b.code_anonyme)));
      setCode('');
      setClasse('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.');
    }
  };

  const handleDelete = async (id: string, codeAnonyme: string) => {
    if (!window.confirm(`Supprimer l'élève ${codeAnonyme} ? Cette action supprime aussi tout son historique de parties.`)) {
      return;
    }
    setError(null);
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="plai-card">
      <h2 className="font-serif text-lg mb-3">Élèves</h2>
      <div className="flex gap-3 items-end flex-wrap">
        <FormField
          label="Code élève"
          help="Jamais le prénom réel de l'élève — un code que vous seul(e) pouvez relier à son identité, ex. EL-3B-07."
        >
          <input
            className="plai-input"
            placeholder="EL-3B-07"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
        <FormField label="Classe (facultatif)" help="Pour filtrer la liste, ex. 3B.">
          <input
            className="plai-input"
            placeholder="3B"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
          />
        </FormField>
        <button className="plai-btn" type="button" onClick={handleAdd}>
          Ajouter
        </button>
      </div>
      {error && <div className="plai-error mt-2" role="alert">{error}</div>}
      <ul className="mt-4">
        {students.length === 0 && <li className="plai-empty">Aucun élève enregistré.</li>}
        {students.map((s) => (
          <li key={s.id} className="flex justify-between items-center py-1 border-b border-[var(--border)]">
            <span>
              {s.code_anonyme}
              {s.classe ? ` — ${s.classe}` : ''}
            </span>
            <button
              type="button"
              className="text-sm text-[var(--text3)]"
              onClick={() => handleDelete(s.id, s.code_anonyme)}
              aria-label={`Supprimer l'élève ${s.code_anonyme}`}
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
