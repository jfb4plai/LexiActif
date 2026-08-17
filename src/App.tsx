// src/App.tsx
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import type { WordList } from './lib/types';

type View = { name: 'dashboard' } | { name: 'game'; list: WordList };

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

  if (view.name === 'game') {
    return <p>Jeu à venir (Task 12) — liste : {view.list.nom}</p>;
  }

  return (
    <TeacherDashboard
      userId={session.user.id}
      onStartGame={(list) => setView({ name: 'game', list })}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

export default App;
