import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Lock,
  Search,
  X,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { getAuditLog, getProfilesList } from '../../lib/settingsService';
import type { AuditEntry } from '../../types/settings';

const TABLES_CONFIG: Record<string, { label: string; icon: string }> = {
  orders: { label: 'Commandes', icon: '📦' },
  items: { label: 'Articles', icon: '🛍️' },
  variants: { label: 'Variantes', icon: '🏷️' },
  sales: { label: 'Ventes', icon: '💰' },
  losses: { label: 'Pertes', icon: '💥' },
  categories: { label: 'Catégories', icon: '📁' },
  app_settings: { label: 'Paramètres', icon: '⚙️' },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

export const AuditLogList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTable = searchParams.get('table') || 'all';
  const initialRecord = searchParams.get('recordId') || '';

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [tableFilter, setTableFilter] = useState<string>(initialTable);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('month');
  const [searchTerm, setSearchTerm] = useState<string>(initialRecord);

  // Éléments dépliés pour voir le diff Avant / Après
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [auditData, profilesData] = await Promise.all([
        getAuditLog({
          table_name: tableFilter,
          changed_by: userFilter,
          record_id: searchTerm.trim() ? searchTerm.trim() : undefined,
          period,
          search: searchTerm.trim() ? searchTerm.trim() : undefined,
        }),
        getProfilesList(),
      ]);
      setEntries(auditData);
      setProfiles(profilesData);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger le journal d’audit.');
    } finally {
      setLoading(false);
    }
  }, [tableFilter, userFilter, period, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/plus" style={{ color: 'var(--color-text-muted)', display: 'flex' }} aria-label="Retour menu">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <span className="zadri-logo-label">SÉCURITÉ & AUDIT (§9.7)</span>
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: '2px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <History size={20} color="var(--color-primary)" />
              Historique des actions
            </h1>
          </div>
        </div>

        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Lock size={12} /> Lecture seule
        </div>
      </header>

      {/* ── Filtres ────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '14px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Recherche rapide */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.82rem' }}
            placeholder="Rechercher par identifiant, nom, valeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Boutons Période */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(
            [
              { id: 'today', label: "Aujourd'hui" },
              { id: '7days', label: '7 jours' },
              { id: 'month', label: 'Ce mois' },
              { id: 'all', label: 'Tout' },
            ] as const
          ).map((p) => {
            const active = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: active ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-alt)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.74rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Ligne Table & Utilisateur */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="form-input"
            style={{ height: '36px', fontSize: '0.78rem', flex: 1 }}
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          >
            <option value="all">Toutes les tables</option>
            <option value="orders">📦 Commandes</option>
            <option value="items">🛍️ Articles</option>
            <option value="variants">🏷️ Variantes</option>
            <option value="sales">💰 Ventes</option>
            <option value="losses">💥 Pertes</option>
            <option value="categories">📁 Catégories</option>
            <option value="app_settings">⚙️ Paramètres</option>
          </select>

          <select
            className="form-input"
            style={{ height: '36px', fontSize: '0.78rem', flex: 1 }}
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="all">Tous les auteurs</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                👤 {p.full_name} ({p.role})
              </option>
            ))}
          </select>
        </div>
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
            onClick={loadData}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── Liste des Entrées d'Audit ──────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '36px 20px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          <History size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Aucune action enregistrée</div>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Aucun enregistrement ne correspond à vos filtres.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map((entry) => {
            const isInsert = entry.action === 'INSERT';
            const tableCfg = TABLES_CONFIG[entry.table_name] || { label: entry.table_name, icon: '📄' };
            const isExpanded = expandedIds.has(entry.id);
            const changedFields = entry.changed_fields || [];

            return (
              <div
                key={entry.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '12px 14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Ligne 1 : Date & Auteur & Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    <Clock size={13} />
                    <span>{formatDate(entry.changed_at)}</span>
                    <span>·</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      👤 {entry.changed_by_name}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: isInsert ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: isInsert ? 'var(--color-primary)' : '#3b82f6',
                    }}
                  >
                    {isInsert ? '+ CRÉATION' : '✎ MODIFICATION'}
                  </span>
                </div>

                {/* Ligne 2 : Table et élément */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{tableCfg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        {tableCfg.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        ID: {entry.record_id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>

                  {/* Bouton déplier Avant / Après */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.id)}
                    style={{
                      background: 'var(--color-surface-alt)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{isExpanded ? 'Masquer' : isInsert ? 'Voir détail' : 'Avant / Après'}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Résumé des champs modifiés si UPDATE */}
                {!isInsert && changedFields.length > 0 && !isExpanded && (
                  <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    Champs modifiés : <strong>{changedFields.join(', ')}</strong>
                  </div>
                )}

                {/* ── Vue détaillée Avant / Après (§9.7) ────────────────── */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--color-border)',
                      fontSize: '0.74rem',
                    }}
                  >
                    {isInsert ? (
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
                          Données créées :
                        </div>
                        <div
                          style={{
                            background: 'var(--color-surface-alt)',
                            borderRadius: 'var(--radius-card-sm)',
                            padding: '10px',
                            overflowX: 'auto',
                            maxHeight: '220px',
                          }}
                        >
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                            <tbody>
                              {Object.entries(entry.new_data || {}).map(([k, v]) => (
                                <tr key={k} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ fontWeight: 600, padding: '4px 8px', color: 'var(--color-text-muted)' }}>{k}</td>
                                  <td style={{ padding: '4px 8px', wordBreak: 'break-all' }}>{String(v ?? '—')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                          Différentiel des champs modifiés :
                        </div>
                        <div
                          style={{
                            background: 'var(--color-surface-alt)',
                            borderRadius: 'var(--radius-card-sm)',
                            overflow: 'hidden',
                          }}
                        >
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0,0,0,0.04)', textAlign: 'left' }}>
                                <th style={{ padding: '6px 8px' }}>Champ</th>
                                <th style={{ padding: '6px 8px', color: 'var(--color-danger)' }}>Ancienne valeur</th>
                                <th style={{ padding: '6px 8px', color: 'var(--color-primary)' }}>Nouvelle valeur</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(changedFields.length > 0
                                ? changedFields
                                : Object.keys(entry.new_data || {})
                              ).map((field) => {
                                const oldVal = entry.old_data?.[field];
                                const newVal = entry.new_data?.[field];
                                if (oldVal === newVal && changedFields.length === 0) return null;

                                return (
                                  <tr key={field} style={{ borderTop: '1px solid var(--color-border)' }}>
                                    <td style={{ fontWeight: 700, padding: '6px 8px' }}>{field}</td>
                                    <td style={{ padding: '6px 8px', color: 'var(--color-danger)', wordBreak: 'break-all', textDecoration: 'line-through' }}>
                                      {String(oldVal ?? '—')}
                                    </td>
                                    <td style={{ padding: '6px 8px', color: 'var(--color-primary)', fontWeight: 600, wordBreak: 'break-all' }}>
                                      {String(newVal ?? '—')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barre de navigation mobile inférieure */}
      <BottomNav />
    </div>
  );
};
