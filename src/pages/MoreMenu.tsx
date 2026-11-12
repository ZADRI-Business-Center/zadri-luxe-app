import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  History,
  KeyRound,
  LayoutGrid,
  LogOut,
  Moon,
  Package,
  Settings,
  Smartphone,
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

  // Détection installation PWA (§11)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Vérifier si l'application s'exécute déjà en mode PWA standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(Boolean(isStandaloneMode));

    // Détection iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
        setShowIosGuide((prev) => !prev);
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
    }
    setDeferredPrompt(null);
  };

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

      {/* ── Section PWA / Installation Mobile (§11) ────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '14px 16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-card-sm)',
                backgroundColor: isStandalone ? 'rgba(23, 130, 79, 0.12)' : 'rgba(224, 152, 46, 0.14)',
                color: isStandalone ? 'var(--color-primary)' : 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isStandalone ? <CheckCircle2 size={20} /> : <Smartphone size={20} />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                {isStandalone ? 'Application installée (PWA active)' : 'Installer sur l’écran d’accueil'}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                {isStandalone
                  ? 'Ouverture instantanée sans barre d’adresse.'
                  : 'Accédez à ZADRI en 1 tap comme une application native.'}
              </div>
            </div>
          </div>

          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="btn-primary"
              style={{
                width: 'auto',
                minHeight: '34px',
                padding: '0 12px',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-pill)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} />
              {isIos ? 'Instructions' : 'Installer'}
            </button>
          )}
        </div>

        {/* Guide d'installation Safari iOS si demandé */}
        {showIosGuide && !isStandalone && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.76rem',
              color: 'var(--color-text)',
              lineHeight: 1.5,
            }}
          >
            <strong>Sur iPhone (Safari) :</strong>
            <ol style={{ paddingLeft: '18px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Appuyez sur le bouton de <strong>Partage</strong> en bas de l'écran (carré avec flèche vers le haut).</li>
              <li>Faites défiler vers le bas et sélectionnez <strong>« Sur l'écran d'accueil »</strong>.</li>
              <li>Validez en haut à droite avec <strong>« Ajouter »</strong>.</li>
            </ol>
          </div>
        )}
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

      {/* ── Section Catalogue & Approvisionnement ─────────────────────── */}
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px', fontWeight: 700 }}>
          Catalogue & Commandes
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
            to="/articles"
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
              <LayoutGrid size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Catalogue d'articles</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Fiches articles, variantes et photos
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>

          <Link
            to="/commandes"
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
              <Package size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Commandes fournisseurs</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Approvisionnements Chine, Turquie, Dubaï & Local
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>
        </div>
      </div>

      {/* ── Section Compte & Sécurité ─────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px', fontWeight: 700 }}>
          Paramètres & Compte
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
            to="/parametres"
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
              <Settings size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Paramètres de l'application</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Seuils d'invendus, fuseau horaire & catégories
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </Link>

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
