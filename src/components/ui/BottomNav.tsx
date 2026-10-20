import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Plus, Package, MoreHorizontal } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  isSell?: boolean;
}

const navItems: NavItem[] = [
  { to: '/',          label: 'Accueil',    icon: <Home      size={22} /> },
  { to: '/articles',  label: 'Articles',   icon: <LayoutGrid size={22} /> },
  { to: '/vendre',    label: 'Vendre',     icon: <Plus       size={26} />, isSell: true },
  { to: '/commandes', label: 'Commandes',  icon: <Package    size={22} /> },
  { to: '/plus',      label: 'Plus',       icon: <MoreHorizontal size={22} /> },
];

export const BottomNav: React.FC = () => (
  <nav
    aria-label="Navigation principale"
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: 'var(--color-nav-bg)',
      boxShadow: 'var(--shadow-nav)',
      display: 'flex',
      alignItems: 'flex-end',
      height: '64px',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}
  >
    {navItems.map((item) =>
      item.isSell ? (
        /* ── Bouton central Vendre : surélevé, cercle vert ────────────────── */
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.label}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '10px' }}
        >
          {({ isActive }) => (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: isActive
                  ? `rgba(var(--color-primary-rgb), 0.85)`
                  : 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: 'var(--shadow-sell-btn)',
                marginBottom: '2px',
                /* déborde au-dessus de la barre */
                marginTop: '-24px',
                transform: isActive ? 'scale(0.95)' : 'scale(1)',
                transition: 'transform var(--transition-fast)',
              }}
            >
              {item.icon}
            </div>
          )}
        </NavLink>
      ) : (
        /* ── Onglets standards ────────────────────────────────────────────── */
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          aria-label={item.label}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '100%', textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', transition: 'color var(--transition-fast)' }}>
                {item.icon}
              </span>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', transition: 'color var(--transition-fast)' }}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      )
    )}
  </nav>
);
