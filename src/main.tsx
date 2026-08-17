import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './plai-style.css';

const App = lazy(() => import('./App.tsx'));
const PublicPlay = lazy(() =>
  import('./components/PublicPlay.tsx').then((module) => ({ default: module.PublicPlay }))
);

const playMatch = window.location.pathname.match(/^\/jouer\/([A-Za-z0-9]+)\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p aria-live="polite">Chargement...</p>}>
      {playMatch ? <PublicPlay code={playMatch[1]} /> : <App />}
    </Suspense>
  </StrictMode>
);
