// src/components/ShareLinkPanel.tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { WordList } from '../lib/types';
import { regenerateShareCode } from '../lib/wordLists';

interface ShareLinkPanelProps {
  list: WordList;
  onListUpdated: (list: WordList) => void;
}

export function ShareLinkPanel({ list, onListUpdated }: ShareLinkPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = list.share_code ? `${window.location.origin}/jouer/${list.share_code}` : null;

  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(shareUrl, { width: 200 })
      .then(setQrDataUrl)
      .catch(() => setError('Impossible de générer le QR code.'));
  }, [shareUrl]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Impossible de copier automatiquement — sélectionnez et copiez le lien manuellement.');
    }
  };

  const handleGenerate = async () => {
    setError(null);
    try {
      const updated = await regenerateShareCode(list.id);
      onListUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du lien.');
    }
  };

  return (
    <li className="py-3 border-b border-[var(--border)]" style={{ background: 'var(--surface2)' }}>
      <p className="text-sm font-semibold mb-2">Lien élève — {list.nom}</p>
      {error && <div className="plai-error mb-2" role="alert">{error}</div>}
      {shareUrl ? (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              className="plai-input"
              readOnly
              value={shareUrl}
              style={{ maxWidth: 320 }}
              onFocus={(e) => e.target.select()}
              aria-label="Lien de partage"
            />
            <button type="button" className="plai-btn" onClick={handleCopy}>
              {copied ? 'Copié !' : 'Copier le lien'}
            </button>
            <button type="button" className="text-sm text-[var(--text3)]" onClick={handleGenerate}>
              Régénérer le lien
            </button>
          </div>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt={`QR code pour rejoindre la liste ${list.nom}`}
              className="mt-3"
              width={200}
              height={200}
            />
          )}
        </>
      ) : (
        <button type="button" className="plai-btn" onClick={handleGenerate}>
          Générer le lien
        </button>
      )}
    </li>
  );
}
