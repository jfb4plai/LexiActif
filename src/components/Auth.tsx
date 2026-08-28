// src/components/Auth.tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { FormField } from './FormField';

type Props = {
  passwordRecovery?: boolean;
  onPasswordUpdated?: () => void;
};

export function Auth({ passwordRecovery = false, onPasswordUpdated }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setError(error.message);
      else setInfo('Email envoyé ! Vérifiez votre boîte mail pour créer un nouveau mot de passe.');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) { setError('6 caractères minimum.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) setError(error.message);
    else onPasswordUpdated?.();
  };

  if (passwordRecovery) {
    return (
      <div className="plai-section" style={{ maxWidth: 400, margin: '80px auto' }}>
        <div className="plai-card">
          <h1 className="font-serif text-xl mb-4">Nouveau mot de passe</h1>
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3">
            <FormField label="Nouveau mot de passe" required>
              <input
                className="plai-input"
                type="password"
                placeholder="Au moins 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </FormField>
            {error && <div className="plai-error" aria-live="polite">{error}</div>}
            <button className="plai-btn" type="submit" disabled={loading}>
              {loading ? 'Chargement...' : 'Enregistrer'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="plai-section" style={{ maxWidth: 400, margin: '80px auto' }}>
      <div className="plai-card">
        <h1 className="font-serif text-xl mb-4">
          {mode === 'signin' ? 'LexiActif' : mode === 'reset' ? 'Mot de passe oublié' : 'LexiActif'}
        </h1>
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
          {mode !== 'reset' && (
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
          )}
          {error && <div className="plai-error" aria-live="polite">{error}</div>}
          {info && <div className="plai-success" aria-live="polite">{info}</div>}
          <button className="plai-btn" type="submit" disabled={loading}>
            {loading ? 'Chargement...' : mode === 'signin' ? 'Se connecter' : mode === 'reset' ? 'Envoyer le lien' : 'Créer un compte'}
          </button>
        </form>
        {mode !== 'reset' && (
          <button
            type="button"
            className="text-sm text-[var(--text3)] mt-3"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
          >
            {mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
          </button>
        )}
        {mode === 'signin' && (
          <button
            type="button"
            className="text-sm text-[var(--text3)] mt-2 block"
            onClick={() => { setMode('reset'); setError(null); setInfo(null); }}
          >
            Mot de passe oublié ?
          </button>
        )}
        {mode === 'reset' && (
          <button
            type="button"
            className="text-sm text-[var(--text3)] mt-3"
            onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
          >
            ← Retour à la connexion
          </button>
        )}
      </div>
    </div>
  );
}
