import React, { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCheckConnection = async () => {
    setChecking(true);
    try {
      // Test direct avec un ping rapide
      await fetch('/favicon.svg', { method: 'HEAD', cache: 'no-store' });
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  if (online) return null;

  return (
    <div
      role="alert"
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#C94B33',
        color: '#FFFFFF',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(201, 75, 51, 0.4)',
        fontSize: '0.82rem',
        fontWeight: 600,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <WifiOff size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Hors connexion :</strong> Les enregistrements sont suspendus pour protéger vos données.
        </span>
      </div>

      <button
        type="button"
        onClick={handleCheckConnection}
        disabled={checking}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRadius: 'var(--radius-pill)',
          color: '#FFFFFF',
          padding: '4px 10px',
          fontSize: '0.74rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
          marginLeft: '8px',
        }}
      >
        <RefreshCw size={13} className={checking ? 'spinner' : ''} />
        {checking ? 'Test...' : 'Vérifier'}
      </button>
    </div>
  );
};
