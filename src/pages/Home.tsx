import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart2,
  Moon,
  Percent,
  RefreshCw,
  ShoppingBag,
  Sun,
  TrendingDown,
} from 'lucide-react';
import { BottomNav } from '../components/ui/BottomNav';
import { useTheme } from '../contexts/ThemeContext';
import { getCloudinaryThumbnail } from '../lib/imageUpload';
import { getDashboardData, getPeriodDates } from '../lib/dashboardService';
import type { DashboardData, PeriodFilter } from '../types/dashboard';
import { formatErrorMessage } from '../lib/errorUtils';
import { MetricsChart04 } from '../components/application/metrics/MetricsChart04';

function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} F CFA`;
}

export const Home: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // Filtre période
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [chartMode, setChartMode] = useState<'day' | 'month'>('day');

  // Données
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Info-bulle graphique
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  // Chargement des données du tableau de bord
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardData(period, customStart, customEnd, chartMode);
      setData(res);
    } catch (err: any) {
      setError(formatErrorMessage(err, 'Impossible de charger le tableau de bord.'));
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, chartMode]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const periodLabel = useMemo(() => {
    return getPeriodDates(period, customStart, customEnd).label;
  }, [period, customStart, customEnd]);

  // Valeurs max pour mise à l'échelle du graphique
  const chartMax = useMemo(() => {
    if (!data?.chart || data.chart.length === 0) return 1;
    const maxVal = Math.max(...data.chart.map((c) => Math.max(c.collected_total, c.realized_margin, 0)));
    return maxVal > 0 ? maxVal : 1;
  }, [data?.chart]);

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '16px 14px 90px',
        width: '100%',
        minHeight: '100vh',
      }}
    >
      {/* ── En-tête Principal ──────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div>
          <span className="zadri-logo-label">ZADRI LUXE</span>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--color-text)' }}>
            Tableau de bord
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ── Sélecteur de Période (§9.6) ─────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '10px 12px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            Période d'analyse : <strong style={{ color: 'var(--color-primary)' }}>{periodLabel}</strong>
          </span>
          <button
            type="button"
            onClick={loadDashboard}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px' }}
            title="Rafraîchir les données"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(
            [
              { id: 'today', label: "Aujourd'hui" },
              { id: '7days', label: '7 jours' },
              { id: 'month', label: 'Ce mois' },
              { id: 'prev_month', label: 'Mois dernier' },
              { id: 'custom', label: 'Personnalisé' },
            ] as const
          ).map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: active ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-alt)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
            <input
              type="date"
              className="form-input"
              style={{ height: '36px', fontSize: '0.78rem', flex: 1 }}
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>à</span>
            <input
              type="date"
              className="form-input"
              style={{ height: '36px', fontSize: '0.78rem', flex: 1 }}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── Message d'erreur ───────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-card-sm)',
            marginBottom: '16px',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadDashboard}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {loading && !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: '36px', height: '36px' }} />
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* ════════════════════════════════════════════════════════════════
              BLOC 1 : Synthèse financière de la période (MetricsChart04)
             ════════════════════════════════════════════════════════════════ */}
          <section>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              {/* Carte Chiffre d'affaires (Style MetricsChart04) */}
              <MetricsChart04
                subtitle="Chiffre d'affaires"
                title={formatFCFA(data.summary.collected_total)}
                change={data.summary.sales_count > 0 ? `${data.summary.sales_count} vente(s)` : undefined}
                changeTrend="positive"
                changeDescription={`${data.summary.sold_units} pièce(s)`}
                chartColor="#10b981"
                chartData={
                  data.chart && data.chart.length > 0
                    ? data.chart.map((c) => ({ value: c.collected_total }))
                    : [{ value: 0 }, { value: data.summary.collected_total }]
                }
              />

              {/* Carte Marge réalisée (Style MetricsChart04) */}
              <MetricsChart04
                subtitle="Marge nette"
                title={`${data.summary.has_estimated_margin ? '~ ' : ''}${formatFCFA(data.summary.realized_margin)}`}
                change={
                  data.summary.collected_total > 0
                    ? `${Math.round((data.summary.realized_margin / data.summary.collected_total) * 100)}%`
                    : undefined
                }
                changeTrend={data.summary.realized_margin >= 0 ? 'positive' : 'negative'}
                changeDescription="Pertes déduites"
                chartColor="#3b82f6"
                chartData={
                  data.chart && data.chart.length > 0
                    ? data.chart.map((c) => ({ value: Math.max(0, c.realized_margin) }))
                    : [{ value: 0 }, { value: Math.max(0, data.summary.realized_margin) }]
                }
              />
            </div>

            {/* Remises & Pertes */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
              }}
            >
              <div
                style={{
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-card-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Remises accordées
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                    {formatFCFA(data.summary.discounts_total)}
                  </div>
                </div>
                <Percent size={18} color="var(--color-warning)" opacity={0.6} />
              </div>

              <div
                style={{
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-card-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Pertes ({data.summary.lost_units} pièces)
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                    {formatFCFA(data.summary.lost_value)}
                  </div>
                </div>
                <TrendingDown size={18} color="var(--color-danger)" opacity={0.6} />
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════
              BLOC 6 : Points d'attention & Alertes (§9.6)
             ════════════════════════════════════════════════════════════════ */}
          {data.attentionPoints.length > 0 && (
            <section
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: '14px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} color="var(--color-warning)" />
                Points d'attention ({data.attentionPoints.length})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.attentionPoints.map((pt) => {
                  const isDanger = pt.severity === 'danger';
                  const isWarning = pt.severity === 'warning';
                  return (
                    <div
                      key={pt.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-card-sm)',
                        backgroundColor: isDanger
                          ? 'rgba(239, 68, 68, 0.08)'
                          : isWarning
                          ? 'rgba(245, 158, 11, 0.08)'
                          : 'rgba(59, 130, 246, 0.08)',
                        border: isDanger
                          ? '1px solid rgba(239, 68, 68, 0.25)'
                          : isWarning
                          ? '1px solid rgba(245, 158, 11, 0.25)'
                          : '1px solid rgba(59, 130, 246, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: isDanger ? 'var(--color-danger)' : isWarning ? 'var(--color-warning)' : '#3b82f6' }}>
                          {pt.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {pt.description}
                        </div>
                      </div>

                      <Link
                        to={pt.actionUrl}
                        style={{
                          textDecoration: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-pill)',
                          background: 'var(--color-surface)',
                          color: isDanger ? 'var(--color-danger)' : isWarning ? 'var(--color-warning)' : 'inherit',
                          border: '1px solid var(--color-border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pt.actionLabel} →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════════════════════════
              BLOC 3 : Graphique d'activité (§9.6)
             ════════════════════════════════════════════════════════════════ */}
          <section
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart2 size={16} color="var(--color-primary)" />
                  Évolution de l'activité
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Chiffre d'affaires & Marge réalisée
                </span>
              </div>

              {/* Bouton bascule Jours / Mois */}
              <div style={{ display: 'flex', background: 'var(--color-surface-alt)', padding: '2px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setChartMode('day')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    border: 'none',
                    background: chartMode === 'day' ? 'var(--color-primary)' : 'none',
                    color: chartMode === 'day' ? '#fff' : 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  30 j
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('month')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    border: 'none',
                    background: chartMode === 'month' ? 'var(--color-primary)' : 'none',
                    color: chartMode === 'month' ? '#fff' : 'var(--color-text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  12 mois
                </button>
              </div>
            </div>

            {/* Légende du graphique claire et distincte */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.78rem', marginBottom: '16px', padding: '8px 12px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-card-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '3px' }} />
                <span><strong>Chiffre d'affaires</strong> (Total encaissé)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', backgroundColor: '#10b981', borderRadius: '3px' }} />
                <span><strong>Bénéfice net</strong> (Marge réalisée)</span>
              </div>
            </div>

            {/* Visualisation en doubles barres distinctes côte-à-côte */}
            <div
              style={{
                height: '160px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: chartMode === 'day' ? '6px' : '12px',
                borderBottom: '2px solid var(--color-border)',
                paddingBottom: '4px',
                overflowX: 'auto',
              }}
            >
              {data.chart.map((point, idx) => {
                const caHeight = Math.round((point.collected_total / chartMax) * 100);
                const marginHeight = Math.round((Math.max(0, point.realized_margin) / chartMax) * 100);
                const isActive = activeBarIndex === idx;

                return (
                  <div
                    key={point.dateKey}
                    onClick={() => setActiveBarIndex(isActive ? null : idx)}
                    style={{
                      flex: 1,
                      minWidth: chartMode === 'day' ? '18px' : '36px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {/* Info-bulle interactive claire */}
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '105%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'var(--color-nav-bg)',
                          border: '1px solid var(--color-border)',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-card-sm)',
                          fontSize: '0.72rem',
                          whiteSpace: 'nowrap',
                          zIndex: 20,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{point.label}</div>
                        <div style={{ color: '#3b82f6' }}>CA : {formatFCFA(point.collected_total)}</div>
                        <div style={{ color: '#10b981' }}>Marge : {formatFCFA(point.realized_margin)}</div>
                      </div>
                    )}

                    {/* Paire de barres côte-à-côte */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', height: '100%', justifyContent: 'center' }}>
                      {/* Barre 1 : Chiffre d'affaires (Bleu) */}
                      <div
                        title={`CA: ${formatFCFA(point.collected_total)}`}
                        style={{
                          width: '45%',
                          height: `${Math.max(3, caHeight)}%`,
                          backgroundColor: point.collected_total > 0 ? '#3b82f6' : 'rgba(59, 130, 246, 0.15)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      {/* Barre 2 : Marge réalisée (Vert émeraude) */}
                      <div
                        title={`Marge: ${formatFCFA(point.realized_margin)}`}
                        style={{
                          width: '45%',
                          height: `${Math.max(3, marginHeight)}%`,
                          backgroundColor: point.realized_margin > 0 ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Axe X étiquettes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              <span>{data.chart[0]?.label || ''}</span>
              <span>{data.chart[Math.floor(data.chart.length / 2)]?.label || ''}</span>
              <span>{data.chart[data.chart.length - 1]?.label || ''}</span>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════════════
              BLOC 4 : Meilleures ventes & Vitesse d'écoulement (§9.6)
             ════════════════════════════════════════════════════════════════ */}
          <section
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  Meilleures ventes & Vitesse
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  Articles les plus vendus et taux d'écoulement
                </span>
              </div>
              <Link to="/articles" style={{ fontSize: '0.76rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Articles →
              </Link>
            </div>

            {data.topItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                Aucune vente enregistrée.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.topItems.map((item, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                  return (
                    <div
                      key={item.item_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: 'var(--color-surface-alt)',
                        borderRadius: 'var(--radius-card-sm)',
                      }}
                    >
                      <span style={{ fontSize: '1rem', width: '22px', textAlign: 'center', fontWeight: 700 }}>
                        {medal}
                      </span>

                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: 'var(--radius-card-sm)',
                          overflow: 'hidden',
                          background: 'var(--color-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {item.photo_url ? (
                          <img
                            src={getCloudinaryThumbnail(item.photo_url, 80) ?? item.photo_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ShoppingBag size={16} color="var(--color-text-muted)" />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.item_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          Écoulement : <strong>{item.sold_units}</strong> sur {item.vendable_units} ({item.sell_through_rate}%)
                          {item.avg_days_to_sell !== null && ` · Moy. ${item.avg_days_to_sell} j`}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-primary)' }}>
                          {formatFCFA(item.sales_revenue)}
                        </div>
                        {item.known_margin !== null && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                            Marge : {formatFCFA(item.known_margin)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* Barre de navigation mobile inférieure */}
      <BottomNav />
    </div>
  );
};
