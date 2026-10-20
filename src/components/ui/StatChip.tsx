import React from 'react';

type StatChipColor = 'default' | 'primary' | 'danger' | 'accent';

interface StatChipProps {
  label: string;
  value: string | number;
  valueColor?: StatChipColor;
  className?: string;
}

const valueColorMap: Record<StatChipColor, string> = {
  default: 'var(--color-text)',
  primary: 'var(--color-primary)',
  danger:  'var(--color-danger)',
  accent:  'var(--color-accent)',
};

export const StatChip: React.FC<StatChipProps> = ({
  label,
  value,
  valueColor = 'default',
  className = '',
}) => (
  <div
    className={`zadri-stat-chip ${className}`}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '10px 14px',
      backgroundColor: 'var(--color-surface-alt)',
      borderRadius: 'var(--radius-card-sm)',
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontSize: '0.7rem',
        fontWeight: 500,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: valueColorMap[valueColor],
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </span>
  </div>
);
