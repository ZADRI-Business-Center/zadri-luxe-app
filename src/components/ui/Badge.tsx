import React from 'react';

type BadgeVariant = 'accent' | 'primary' | 'danger' | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  accent: {
    backgroundColor: 'var(--color-accent-bg)',
    color: 'var(--color-accent)',
    border: '1px solid rgba(var(--color-accent-rgb), 0.25)',
  },
  primary: {
    backgroundColor: `rgba(var(--color-primary-rgb), 0.12)`,
    color: 'var(--color-primary)',
    border: '1px solid rgba(var(--color-primary-rgb), 0.25)',
  },
  danger: {
    backgroundColor: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(var(--color-danger-rgb), 0.25)',
  },
  muted: {
    backgroundColor: 'var(--color-surface-alt)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'muted',
  className = '',
}) => (
  <span
    className={`zadri-badge ${className}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      fontSize: '0.72rem',
      fontWeight: 600,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
      ...variantStyles[variant],
    }}
  >
    {children}
  </span>
);
