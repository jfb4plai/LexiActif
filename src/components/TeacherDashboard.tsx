// src/components/TeacherDashboard.tsx
import { useState } from 'react';
import type { WordList } from '../lib/types';
import { StudentsManager } from './StudentsManager';
import { WordListsManager } from './WordListsManager';
import { AttemptsView } from './AttemptsView';
import { StudentDashboard } from './StudentDashboard';

interface TeacherDashboardProps {
  userId: string;
  onStartGame: (list: WordList) => void;
  onSignOut: () => void;
}

type Tab = 'gestion' | 'dashboard';

export function TeacherDashboard({ userId, onStartGame, onSignOut }: TeacherDashboardProps) {
  const [openList, setOpenList] = useState<WordList | null>(null);
  const [tab, setTab] = useState<Tab>('gestion');

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
          <div className="flex gap-2 mb-4" role="tablist" aria-label="Sections du tableau de bord">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'gestion'}
              className={tab === 'gestion' ? 'plai-btn' : 'plai-btn-ghost'}
              onClick={() => setTab('gestion')}
            >
              Élèves &amp; listes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'dashboard'}
              className={tab === 'dashboard' ? 'plai-btn' : 'plai-btn-ghost'}
              onClick={() => setTab('dashboard')}
            >
              Tableau de bord
            </button>
          </div>

          {tab === 'gestion' ? (
            <>
              <StudentsManager userId={userId} />
              <div style={{ marginTop: 20 }}>
                <WordListsManager userId={userId} onOpenList={setOpenList} onPlayList={onStartGame} />
              </div>
            </>
          ) : (
            <StudentDashboard userId={userId} />
          )}
        </>
      )}
    </div>
  );
}
