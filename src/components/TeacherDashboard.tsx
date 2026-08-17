// src/components/TeacherDashboard.tsx
import { useState } from 'react';
import type { WordList } from '../lib/types';
import { StudentsManager } from './StudentsManager';
import { WordListsManager } from './WordListsManager';
import { AttemptsView } from './AttemptsView';

interface TeacherDashboardProps {
  userId: string;
  onStartGame: (list: WordList) => void;
  onSignOut: () => void;
}

export function TeacherDashboard({ userId, onStartGame, onSignOut }: TeacherDashboardProps) {
  const [openList, setOpenList] = useState<WordList | null>(null);

  return (
    <div className="plai-section" style={{ maxWidth: 800, margin: '0 auto' }}>
      <nav className="plai-nav">
        <span className="plai-nav-logo">
          <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 32 }} />
          LexiActif
        </span>
        <button type="button" className="plai-nav-link" onClick={onSignOut}>
          Se déconnecter
        </button>
      </nav>

      {openList ? (
        <AttemptsView list={openList} onBack={() => setOpenList(null)} />
      ) : (
        <>
          <StudentsManager userId={userId} />
          <div style={{ marginTop: 20 }}>
            <WordListsManager userId={userId} onOpenList={setOpenList} onPlayList={onStartGame} />
          </div>
        </>
      )}
    </div>
  );
}
