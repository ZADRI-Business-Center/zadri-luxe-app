import React from 'react';

interface PillOption {
  value: string;
  label: string;
  /** Optionnel : indiquer si l'option est épuisée/non disponible */
  disabled?: boolean;
}

interface PillSelectorProps {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const PillSelector: React.FC<PillSelectorProps> = ({
  options,
  value,
  onChange,
  className = '',
}) => (
  <div
    className={`zadri-pill-selector ${className}`}
    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
  >
    {options.map((opt) => {
      const isActive = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
          onClick={() => !opt.disabled && onChange(opt.value)}
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-pill)',
            border: isActive
              ? '1px solid var(--color-primary)'
              : '1px solid var(--color-border)',
            backgroundColor: isActive
              ? 'var(--color-primary)'
              : 'var(--color-surface-alt)',
            color: isActive ? '#ffffff' : 'var(--color-text)',
            fontSize: '0.85rem',
            fontWeight: isActive ? 600 : 400,
            cursor: opt.disabled ? 'not-allowed' : 'pointer',
            opacity: opt.disabled ? 0.45 : 1,
            transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
            minHeight: '36px',
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
