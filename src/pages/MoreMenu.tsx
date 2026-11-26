import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  FileText,
  History,
  KeyRound,
  LogOut,
  Moon,
  Sun,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { BottomNav } from '../components/ui/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const MoreMenu: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '20px 16px 90px',
        width: '100%',
        minHeight: '100vh',
      }}
    >
      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div>
          <span className="zadri-logo-label">MENU PRINCIPAL</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2px 0 0', color: 'var(--color-text)' }}>
            Plus
          </h1>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* ── Profil utilisateur ────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 700,
          }}
        >
          {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>
            {profile?.full_name || 'Utilisateur ZADRI'}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
        </div>
      </div>

      {/* ── Section Opérations ────────────────────────────────────────── */}
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px', fontWeight: 700 }}>
          Opérations & Stocks
        </h2>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
          }}
        >
          <Link
            to="/invendus"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              textDecoration: 'none',
              color: 'var(--color-text)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ color: 'var(--color-warning)', display: 'flex' }}>
              <TrendingDown size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Invendus & Décotes</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Articles dormants, baisses de prix & déstockage
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>

          <Link
            to="/ventes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              textDecoration: 'none',
              color: 'var(--color-text)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ color: 'var(--color-primary)', display: 'flex' }}>
              <FileText size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Journal des ventes</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Historique de caisse, corrections & annulations
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>

          <Link
            to="/pertes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              textDecoration: 'none',
              color: 'var(--color-text)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ color: 'var(--color-danger)', display: 'flex' }}>
              <Trash2 size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pertes & Sorties de stock</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Articles abîmés, offerts ou perdus
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>

          <Link
            to="/historique"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              textDecoration: 'none',
              color: 'var(--color-text)',
            }}
          >
            <div style={{ color: 'var(--color-primary)', display: 'flex' }}>
              <History size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Historique des actions</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Journal d'audit et traçabilité détaillée
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>
        </div>
      </div>

      {/* ── Section Compte & Sécurité ─────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px', fontWeight: 700 }}>
          Compte & Sécurité
        </h2>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
          }}
        >
          <Link
            to="/change-password"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              textDecoration: 'none',
              color: 'var(--color-text)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ color: 'var(--color-text-muted)', display: 'flex' }}>
              <KeyRound size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Modifier mon mot de passe</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Sécuriser l'accès à mon compte
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>

          <button
            type="button"
            onClick={() => signOut()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              background: 'none',
              border: 'none',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LogOut size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Se déconnecter</div>
            </div>
          </button>
        </div>
      </div>

      {/* Barre de navigation mobile inférieure */}
      <BottomNav />
    </div>
  );
};
