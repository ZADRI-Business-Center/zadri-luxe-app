import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Package, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { getOrdersSummary } from '../../lib/ordersService';
import type { OrderSummary, OrderOrigin, OrderStatus } from '../../types/orders';
import { formatFCFA, formatDate, ORIGIN_CONFIG, STATUS_CONFIG } from '../../types/orders';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { BottomNav } from '../../components/ui/BottomNav';

export const OrdersList: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [originFilter, setOriginFilter] = useState<'all' | OrderOrigin | string>('all');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrdersSummary();
      setOrders(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erreur lors du chargement des commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filtrage combiné
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Recherche texte
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesRef = order.reference.toLowerCase().includes(q);
        const matchesSupplier = order.supplier.toLowerCase().includes(q);
        if (!matchesRef && !matchesSupplier) return false;
      }
      // Filtre statut
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      // Filtre provenance
      if (originFilter !== 'all' && order.origin !== originFilter) {
        return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, originFilter]);

  // Totaux globaux sur la sélection
  const totals = useMemo(() => {
    const totalCost = filteredOrders.reduce((sum, o) => sum + o.total_cost, 0);
    const totalCollected = filteredOrders.reduce((sum, o) => sum + o.collected_total, 0);
    const remainingToRecover = Math.max(0, totalCost - totalCollected);
    const globalRate = totalCost > 0 ? Math.min(100, Math.round((totalCollected / totalCost) * 100)) : 100;

    return { totalCost, totalCollected, remainingToRecover, globalRate };
  }, [filteredOrders]);

  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '16px 16px 90px',
      minHeight: '100vh',
    }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        gap: '12px',
      }}>
        <div>
          <span className="zadri-logo-label">ZADRI LUXE</span>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--color-text)', margin: '2px 0 0' }}>
            Commandes
          </h1>
        </div>

        <Link
          to="/commandes/nouvelle"
          className="btn-primary"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-pill)',
          }}
        >
          <Plus size={18} />
          <span>Nouvelle</span>
        </Link>
      </header>

      {/* ── Synthèse globale ──────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card-lg)',
        padding: '16px',
        marginBottom: '18px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          textAlign: 'center',
          marginBottom: '12px',
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Engagé
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>
              {formatFCFA(totals.totalCost)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Encaissé
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
              {formatFCFA(totals.totalCollected)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Reste à couvrir
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: totals.remainingToRecover > 0 ? 'var(--color-accent)' : 'var(--color-success)', marginTop: '2px' }}>
              {formatFCFA(totals.remainingToRecover)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <ProgressBar value={totals.globalRate} color={totals.globalRate >= 100 ? 'primary' : 'accent'} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {totals.globalRate} % récupéré
          </span>
        </div>
      </div>

      {/* ── Barre de recherche ────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        marginBottom: '12px',
      }}>
        <Search
          size={17}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par référence, fournisseur…"
          className="zadri-input"
          style={{
            paddingLeft: '38px',
            height: '42px',
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-pill)',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Effacer
          </button>
        )}
      </div>

      {/* ── Filtres : Provenance & Statut ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {/* Provenance */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}>
          {(['all', 'Chine', 'Local', 'Dubaï', 'Turquie', 'Autre'] as const).map((orig) => {
            const isSelected = originFilter === orig;
            const label = orig === 'all' ? 'Toutes provenances' : `${ORIGIN_CONFIG[orig as OrderOrigin]?.icon || ''} ${orig}`;
            return (
              <button
                key={orig}
                onClick={() => setOriginFilter(orig)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: isSelected ? 'rgba(var(--color-primary-rgb), 0.12)' : 'var(--color-surface)',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Statuts */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}>
          {(['all', 'ordered', 'shipping', 'received'] as const).map((st) => {
            const isSelected = statusFilter === st;
            const label =
              st === 'all' ? 'Tous les statuts' :
              st === 'ordered' ? 'Commandées' :
              st === 'shipping' ? 'En transit' : 'Reçues';

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: isSelected ? '1px solid var(--color-text)' : '1px solid var(--color-border)',
                  backgroundColor: isSelected ? 'var(--color-text)' : 'var(--color-surface-alt)',
                  color: isSelected ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenu / Liste ───────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Chargement des commandes…</p>
        </div>
      ) : error ? (
        <div style={{
          backgroundColor: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-card-md)',
          padding: '16px',
          textAlign: 'center',
          color: 'var(--color-danger)',
        }}>
          <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{error}</p>
          <button
            onClick={fetchOrders}
            className="btn-secondary"
            style={{ marginTop: '12px', fontSize: '0.8rem', padding: '6px 14px' }}
          >
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <Package size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
            Aucune commande trouvée
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
            {search || statusFilter !== 'all' || originFilter !== 'all'
              ? 'Aucun résultat ne correspond à vos filtres actuels.'
              : 'Commencez par enregistrer votre première commande (Chine, Local, etc.).'}
          </p>
          <Link to="/commandes/nouvelle" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', padding: '8px 18px' }}>
            <Plus size={16} /> Créer une commande
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredOrders.map((order) => {
            const originCfg = ORIGIN_CONFIG[order.origin as OrderOrigin] || ORIGIN_CONFIG.Autre;
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.ordered;
            const recoveryPercent = Math.min(100, Math.round(order.recovery_rate || 0));

            return (
              <div
                key={order.order_id}
                onClick={() => navigate(`/commandes/${order.order_id}`)}
                className="animate-fade-in"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card-lg)',
                  padding: '16px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                {/* Ligne 1 : Référence + Badges Provenance et Statut */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '1rem',
                      letterSpacing: '0.04em',
                      color: 'var(--color-text)',
                    }}>
                      {order.reference}
                    </span>

                    {/* Badge Provenance */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--color-surface-alt)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <span>{originCfg.icon}</span>
                      <span>{order.origin}</span>
                    </span>
                  </div>

                  {/* Badge Statut */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: statusCfg.bg,
                    color: statusCfg.color,
                  }}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Ligne 2 : Fournisseur et Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                    {order.supplier}
                  </span>
                  <span>{formatDate(order.order_date)}</span>
                </div>

                {/* Ligne 3 : Chiffres clés */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  backgroundColor: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-card-sm)',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  gap: '6px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      Coût Total
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>
                      {formatFCFA(order.total_cost)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      Encaissé
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
                      {formatFCFA(order.collected_total)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      Reste
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: order.remaining_to_recover > 0 ? 'var(--color-accent)' : 'var(--color-success)',
                      marginTop: '2px',
                    }}>
                      {order.remaining_to_recover > 0 ? formatFCFA(order.remaining_to_recover) : 'Rentabilisée 🎉'}
                    </div>
                  </div>
                </div>

                {/* Ligne 4 : Barre de progression + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar
                      value={recoveryPercent}
                      color={order.is_recovered ? 'primary' : 'accent'}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    <span>{recoveryPercent} %</span>
                    <ChevronRight size={15} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation basse */}
      <BottomNav />
    </div>
  );
};
