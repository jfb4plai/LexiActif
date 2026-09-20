// src/components/PublicPlay.tsx
import { useEffect, useMemo, useState } from 'react';
import { Game } from './Game';
import { FormField } from './FormField';
import { fetchHubStudent, fetchPlayList, publicGameDataSource, type PublicPlayData } from '../lib/publicPlay';
import { captureHubToken, forgetHubToken } from '../lib/hubToken';
import type { GameStudent } from '../lib/gameDataSource';

interface PublicPlayProps {
  code: string;
}

export function PublicPlay({ code }: PublicPlayProps) {
  const [data, setData] = useState<PublicPlayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [student, setStudent] = useState<GameStudent | null>(null);
  // Élève arrivé par un lien de HubActif : son code est dans le jeton du lien, il n'a pas à le choisir.
  const [hubToken, setHubToken] = useState<string | null>(() => captureHubToken(code));
  const [hubPending, setHubPending] = useState(hubToken !== null);
  const [hubNote, setHubNote] = useState<string | null>(null);
  // Memoized so Game's effects (which depend on `dataSource` by reference)
  // don't re-fire every time PublicPlay re-renders for an unrelated reason.
  const dataSource = useMemo(() => publicGameDataSource(code, hubToken ?? undefined), [code, hubToken]);

  useEffect(() => {
    if (!hubToken) return;
    let live = true;
    fetchHubStudent(code, hubToken)
      .then((found) => {
        if (!live) return;
        setStudent(found);
        setHubPending(false);
      })
      .catch(() => {
        if (!live) return;
        forgetHubToken(code);
        setHubToken(null);
        setHubPending(false);
        setHubNote(
          "Ton lien HubActif n'est plus valable. Choisis ton code dans la liste, ou demande un nouveau lien à ton enseignant."
        );
      });
    return () => {
      live = false;
    };
  }, [code, hubToken]);

  useEffect(() => {
    fetchPlayList(code)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Lien invalide ou expiré.'));
  }, [code]);

  if (error) {
    return (
      <div className="plai-card" style={{ maxWidth: 400, margin: '80px auto' }}>
        <div className="plai-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return <p aria-live="polite">Chargement...</p>;

  if (student) {
    return <Game list={data.list} student={student} dataSource={dataSource} onExit={() => setStudent(null)} />;
  }

  if (hubPending) return <p aria-live="polite">Connexion avec ton code…</p>;

  const handleStart = () => {
    const found = data.students.find((s) => s.id === selectedId);
    if (found) setStudent(found);
  };

  return (
    <div className="plai-card" style={{ maxWidth: 400, margin: '80px auto' }}>
      <h1 className="font-serif text-xl mb-1">{data.list.nom}</h1>
      <h2 className="font-serif text-lg mb-3">Qui joue ?</h2>
      {hubNote && (
        <div className="plai-error mb-3" role="alert">
          {hubNote}
        </div>
      )}
      <FormField label="Ton code" required help="Choisis le code que ton/ta enseignant(e) t'a donné.">
        <select className="plai-input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— Choisir —</option>
          {data.students.map((s) => (
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
