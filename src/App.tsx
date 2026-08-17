// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentSelect } from './components/StudentSelect';
import { Game } from './components/Game';
import type { Student, WordList } from './lib/types';

type View =
  | { name: 'dashboard' }
  | { name: 'select-student'; list: WordList }
  | { name: 'game'; list: WordList; student: Student };

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ name: 'dashboard' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p aria-live="polite">Chargement...</p>;
  if (!session) return <Auth />;

  if (view.name === 'select-student') {
    return (
      <StudentSelect
        userId={session.user.id}
        onSelect={(student) => setView({ name: 'game', list: view.list, student })}
      />
    );
  }

  if (view.name === 'game') {
    return <Game list={view.list} student={view.student} onExit={() => setView({ name: 'dashboard' })} />;
  }

  return (
    <TeacherDashboard
      userId={session.user.id}
      onStartGame={(list) => setView({ name: 'select-student', list })}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

export default App;
