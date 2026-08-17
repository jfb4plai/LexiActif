// src/components/StudentSelect.tsx
import { useEffect, useState } from 'react';
import type { Student } from '../lib/types';
import { listStudents } from '../lib/students';
import { FormField } from './FormField';

interface StudentSelectProps {
  userId: string;
  onSelect: (student: Student) => void;
}

export function StudentSelect({ userId, onSelect }: StudentSelectProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStudents(userId).then(setStudents).catch((e) => setError(e.message));
  }, [userId]);

  const handleStart = () => {
    const student = students.find((s) => s.id === selectedId);
    if (student) onSelect(student);
  };

  return (
    <div className="plai-card" style={{ maxWidth: 400, margin: '80px auto' }}>
      <h2 className="font-serif text-lg mb-3">Qui joue ?</h2>
      {error && <div className="plai-error" role="alert">{error}</div>}
      <FormField label="Ton code" required help="Choisis le code que ton/ta enseignant(e) t'a donné.">
        <select className="plai-input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— Choisir —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code_anonyme}
            </option>
          ))}
        </select>
      </FormField>
      <button className="plai-btn mt-3" type="button" disabled={!selectedId} onClick={handleStart}>
        Commencer
      </button>
    </div>
  );
}
