import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const {
    session, profile, loading, networkError,
    isUnauthorized, unauthorizedCountdown,
    refreshProfile, signOut,
  } = useAuth();
  const location = useLocation();

  /* ── 1. Chargement initial de la session ────────────────────────────────── */
  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            className="spinner spinner-dark"
            style={{ margin: '0 auto 20px', width: '2rem', height: '2rem' }}
          />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
            ZADRI
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Vérification de la session sécurisée…
          </p>
        </div>
      </div>
    );
  }

  /* ── 2. Non connecté → login ────────────────────────────────────────────── */
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  /* ── 3. Authentifié mais absent de profiles (hors liste blanche) ────────── */
  if (isUnauthorized) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: 'var(--color-accent-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'var(--color-accent)',
          }}>
            <ShieldAlert size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text)' }}>
            Accès non autorisé
          </h2>
          <div className="alert-box alert-unauthorized" style={{ textAlign: 'left', marginBottom: '16px' }}>
            <p>Ce compte ne figure pas sur la liste blanche autorisée de ZADRI Luxe.</p>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Déconnexion automatique dans{' '}
            <strong style={{ color: 'var(--color-accent)' }}>{unauthorizedCountdown ?? 4} s</strong>…
          </p>
          <button onClick={() => signOut()} className="btn-secondary" style={{ width: '100%' }}>
            Se déconnecter maintenant
          </button>
        </div>
      </div>
    );
  }

  /* ── 4. Erreur réseau lors de la récupération du profil ─────────────────── */
  if (networkError && !profile) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: 'var(--color-danger-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: 'var(--color-danger)',
          }}>
            <AlertCircle size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '10px', color: 'var(--color-text)' }}>
            Erreur de connexion
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {networkError}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => refreshProfile()} className="btn-primary">
              <RefreshCw size={17} /> Réessayer
            </button>
            <button onClick={() => signOut()} className="btn-secondary">
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── 5. Session confirmée mais profil pas encore résolu ─────────────────── */
  // Outlet n'est JAMAIS atteint sans profile non-null
  if (session && !profile && !isUnauthorized && !networkError) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            className="spinner spinner-dark"
            style={{ margin: '0 auto 20px', width: '2rem', height: '2rem' }}
          />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
            ZADRI
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Vérification des droits d'accès…
          </p>
        </div>
      </div>
    );
  }

  /* ── 6. Tout est bon : profile confirmé ─────────────────────────────────── */
  return <Outlet />;
};
