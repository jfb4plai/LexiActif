// src/components/Auth.tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { FormField } from './FormField';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="plai-section" style={{ maxWidth: 400, margin: '80px auto' }}>
      <div className="plai-card">
        <h1 className="font-serif text-xl mb-4">LexiActif</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FormField label="Email" required>
            <input
              className="plai-input"
              type="email"
              placeholder="votre.email@ecole.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Mot de passe" required>
            <input
              className="plai-input"
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </FormField>
          {error && <div className="plai-error" aria-live="polite">{error}</div>}
          <button className="plai-btn" type="submit" disabled={loading}>
            {loading ? 'Chargement...' : mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>
        <button
          type="button"
          className="text-sm text-[var(--text3)] mt-3"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  );
}
