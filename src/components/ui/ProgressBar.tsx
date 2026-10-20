import React from 'react';

type ProgressBarColor = 'primary' | 'accent' | 'danger';

interface ProgressBarProps {
  /** Valeur entre 0 et 100 */
  value: number;
  color?: ProgressBarColor;
  /** Afficher le pourcentage à droite */
  showLabel?: boolean;
  className?: string;
}

const colorMap: Record<ProgressBarColor, string> = {
  primary: 'var(--color-primary)',
  accent:  'var(--color-accent)',
  danger:  'var(--color-danger)',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'primary',
  showLabel = false,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`zadri-progress ${className}`}
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          flex: 1,
          height: '6px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            borderRadius: 'var(--radius-pill)',
            backgroundColor: colorMap[color],
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: colorMap[color],
            minWidth: '36px',
            textAlign: 'right',
          }}
        >
          {clamped.toFixed(0)} %
        </span>
      )}
    </div>
  );
};
