import React from 'react';

interface CardProps {
  children: React.ReactNode;
  /** "default" = surface + border | "alt" = surface-alt sans border */
  variant?: 'default' | 'alt';
  className?: string;
  style?: React.CSSProperties;
  /** Rayon : 'lg' (20px) | 'md' (16px, défaut) | 'sm' (14px) */
  radius?: 'lg' | 'md' | 'sm';
  onClick?: () => void;
}

const radiusMap = {
  lg: 'var(--radius-card-lg)',
  md: 'var(--radius-card-md)',
  sm: 'var(--radius-card-sm)',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  style,
  radius = 'md',
  onClick,
}) => {
  const base: React.CSSProperties = {
    backgroundColor: variant === 'alt' ? 'var(--color-surface-alt)' : 'var(--color-surface)',
    border: variant === 'alt' ? 'none' : '1px solid var(--color-border)',
    borderRadius: radiusMap[radius],
    padding: '16px',
    boxShadow: variant === 'alt' ? 'none' : 'var(--shadow-sm)',
    transition: 'box-shadow var(--transition-fast)',
    cursor: onClick ? 'pointer' : undefined,
    ...style,
  };

  return (
    <div className={`zadri-card ${className}`} style={base} onClick={onClick}>
      {children}
    </div>
  );
};
