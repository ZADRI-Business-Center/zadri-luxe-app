import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricsChart04Props {
  title: string;
  subtitle: string;
  change?: string;
  changeTrend?: 'positive' | 'negative';
  changeDescription?: string;
  chartColor?: string; // hex or CSS color, e.g. '#10b981' or '#3b82f6'
  chartData: { value: number }[];
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const MetricsChart04: React.FC<MetricsChart04Props> = ({
  title,
  subtitle,
  change,
  changeTrend = 'positive',
  changeDescription,
  chartColor = '#10b981',
  chartData,
  footer,
  style,
}) => {
  const isPositive = changeTrend === 'positive';

  // Préparation du tracé SVG lissé (courbe Bézier / Catmull-Rom)
  const width = 300;
  const height = 70;
  const paddingX = 4;
  const paddingTop = 8;
  const paddingBottom = 4;

  const values = chartData.map((d) => d.value);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(...values, 1);
  const range = maxVal - minVal || 1;

  const points = chartData.map((d, i) => {
    const x = paddingX + (i / Math.max(chartData.length - 1, 1)) * (width - 2 * paddingX);
    const normalizedY = (d.value - minVal) / range;
    const y = height - paddingBottom - normalizedY * (height - paddingTop - paddingBottom);
    return { x, y };
  });

  // Construction d'une courbe de Bézier cubique fluide
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX1 = current.x + (next.x - current.x) * 0.45;
      const controlY1 = current.y;
      const controlX2 = current.x + (next.x - current.x) * 0.55;
      const controlY2 = next.y;
      linePath += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${next.x} ${next.y}`;
    }
  }

  const lastPoint = points[points.length - 1] || { x: width - paddingX, y: height };
  const firstPoint = points[0] || { x: paddingX, y: height };
  const areaPath = linePath
    ? `${linePath} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`
    : '';

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      style={{
        background: 'var(--color-surface, #1e1e24)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card-lg, 16px)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...style,
      }}
    >
      {/* ── Bandeau supérieur teinté ─────────────────────────────── */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--color-surface-alt)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </span>
      </div>

      {/* ── Contenu principal : Chiffre display & indicateur de tendance ── */}
      <div style={{ padding: '12px 12px 6px', flex: 1 }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>
          {title}
        </div>

        {/* Indicateur de variation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
          {change && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-pill, 9999px)',
                fontSize: '0.68rem',
                fontWeight: 700,
                backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                color: isPositive ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)',
                whiteSpace: 'nowrap',
              }}
            >
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{change}</span>
            </div>
          )}

          {changeDescription && (
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
              {changeDescription}
            </span>
          )}
        </div>
      </div>

      {/* ── Graphique d'aire pleine largeur ──────────────────────── */}
      <div style={{ width: '100%', height: `${height}px`, marginTop: 'auto', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity={0.42} />
              <stop offset="100%" stopColor={chartColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={chartColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      {/* Footer optionnel */}
      {footer && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-alt)',
            fontSize: '0.74rem',
            color: 'var(--color-text-muted)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

