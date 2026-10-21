import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ShieldCheck, UserCheck, KeyRound, LogOut, Sun, Moon, Package, Plus, ArrowRight } from 'lucide-react';
import { BottomNav } from '../components/ui/BottomNav';

export const Home: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: '20px 16px 80px', /* 80px pour la BottomNav */
      width: '100%',
    }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div>
          <span className="zadri-logo-label">ZADRI</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>
            Tableau de bord
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={() => signOut()}
            className="btn-secondary"
            style={{ width: 'auto', minHeight: '36px', padding: '0 12px', fontSize: '0.82rem' }}
            title="Se déconnecter"
          >
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      {/* ── Carte profil ──────────────────────────────────────────────────── */}
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          {/* Avatar initiale */}
          <div style={{
            width: '50px', height: '50px', borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
          }}>
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {profile?.full_name || 'Associé ZADRI'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', marginTop: '2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Badges de statut */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
            border: '1px solid rgba(var(--color-primary-rgb), 0.25)',
            color: 'var(--color-primary)',
            fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
          }}>
            <ShieldCheck size={13} /> Rôle : {profile?.role || 'admin'}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            backgroundColor: 'rgba(var(--color-primary-rgb), 0.08)',
            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
            color: 'var(--color-primary)',
            fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
          }}>
            <UserCheck size={13} /> Liste blanche vérifiée
          </span>
        </div>

        {/* Action : changer mot de passe */}
        <Link
          to="/change-password"
          className="btn-secondary"
          style={{
            textDecoration: 'none',
            justifyContent: 'center',
            borderColor: 'var(--color-primary)',
            color: 'var(--color-primary)',
          }}
        >
          <KeyRound size={17} /> Définir mon mot de passe personnalisé
        </Link>
      </div>

      {/* ── Module Commandes ────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-circle, 50%)',
              backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Package size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                Commandes & Approvisionnements
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Chine, Turquie, Dubaï, Fournisseurs locaux
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          <Link
            to="/commandes"
            className="btn-secondary"
            style={{
              textDecoration: 'none',
              justifyContent: 'center',
              fontSize: '0.82rem',
              padding: '10px 12px',
            }}
          >
            Voir les commandes <ArrowRight size={14} />
          </Link>
          <Link
            to="/commandes/nouvelle"
            className="btn-primary"
            style={{
              textDecoration: 'none',
              justifyContent: 'center',
              fontSize: '0.82rem',
              padding: '10px 12px',
            }}
          >
            <Plus size={15} /> Nouvelle commande
          </Link>
        </div>
      </div>

      {/* ── Statut du socle V1 ────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-card-md)',
        padding: '16px',
      }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '10px' }}>
          Statut de l'environnement V1
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 2 }}>
          <li>✓ <strong>Étape 1</strong> : Schéma SQL, triggers d'audit et fonctions validés</li>
          <li>✓ <strong>Étape 2</strong> : RLS étanche et comptes associés provisionnés</li>
          <li>✓ <strong>Étape 3</strong> : Vues financières conformes au jeu de test §14</li>
          <li>✓ <strong>Étape 4</strong> : Authentification et sessions persistantes actives</li>
          <li>✓ <strong>Étape 5</strong> : Module Commandes multi-provenances activé</li>
        </ul>
      </div>

      {/* Barre de navigation inférieure */}
      <BottomNav />
    </div>
  );
};
