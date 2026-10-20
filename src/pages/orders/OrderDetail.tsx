import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  CheckCircle2,
  Package,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import {
  getOrderDetail,
  markOrderAsReceived,
} from '../../lib/ordersService';
import type {
  OrderSummary,
  Order,
  OrderItem,
  OrderOrigin,
} from '../../types/orders';
import {
  ORIGIN_CONFIG,
  STATUS_CONFIG,
  formatFCFA,
  formatDate,
} from '../../types/orders';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { BottomNav } from '../../components/ui/BottomNav';

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal "Marquer comme reçue"
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [markingReceived, setMarkingReceived] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getOrderDetail(id);
      setSummary(res.summary);
      setOrder(res.order);
      setItems(res.items);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erreur lors du chargement de la commande.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleMarkReceived = async () => {
    if (!id) return;
    try {
      setMarkingReceived(true);
      await markOrderAsReceived(id, receiveDate);
      setShowReceiveModal(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors du passage à la réception.');
    } finally {
      setMarkingReceived(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '680px', margin: '40px auto', textAlign: 'center', padding: '20px' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Chargement des données de la commande…</p>
      </div>
    );
  }

  if (error || !order || !summary) {
    return (
      <div style={{ maxWidth: '640px', margin: '30px auto', padding: '16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{error || 'Commande introuvable.'}</p>
        <button onClick={() => navigate('/commandes')} className="btn-secondary" style={{ marginTop: '16px' }}>
          Retour aux commandes
        </button>
      </div>
    );
  }

  const originCfg = ORIGIN_CONFIG[summary.origin as OrderOrigin] || ORIGIN_CONFIG.Autre;
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.ordered;
  const recoveryRate = Math.min(100, Math.round(summary.recovery_rate || 0));

  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '16px 16px 90px',
      minHeight: '100vh',
    }}>
      {/* ── En-tête de navigation ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/commandes')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <span className="zadri-logo-label">COMMANDE</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', margin: '2px 0 0', letterSpacing: '0.03em' }}>
              {order.reference}
            </h1>
          </div>
        </div>

        <Link
          to={`/commandes/${order.id}/modifier`}
          className="btn-secondary"
          style={{
            textDecoration: 'none',
            fontSize: '0.8rem',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            gap: '6px',
          }}
        >
          <Edit3 size={15} /> Modifier
        </Link>
      </div>

      {/* ── Carte principale : Fournisseur, Origine, Statut ───────────────── */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card-lg)',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {order.supplier}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
              Commandée le {formatDate(order.order_date)}
              {order.received_date && ` • Reçue le ${formatDate(order.received_date)}`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            {/* Badge Statut */}
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: statusCfg.bg,
              color: statusCfg.color,
            }}>
              {statusCfg.label}
            </span>

            {/* Badge Origine */}
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--color-surface-alt)',
              border: '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--color-text)',
            }}>
              <span>{originCfg.icon}</span>
              <span>{summary.origin}</span>
            </span>
          </div>
        </div>

        {order.description && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', margin: '0 0 14px', lineHeight: 1.4 }}>
            {order.description}
          </p>
        )}

        {/* Action rapide : Marquer comme reçue si en cours */}
        {order.status !== 'received' && (
          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-border)',
          }}>
            <button
              onClick={() => setShowReceiveModal(true)}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                backgroundColor: 'var(--color-success)',
              }}
            >
              <CheckCircle2 size={18} /> Marquer la commande comme reçue
            </button>
          </div>
        )}
      </div>

      {/* ── Grille des 4 indicateurs financiers majeurs ────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {/* Coût Total */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-md)',
          padding: '14px',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
            Coût Total Engagé
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)', margin: '4px 0' }}>
            {formatFCFA(summary.total_cost)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Achat : {formatFCFA(order.purchase_amount)}
            <br />
            Transport : {formatFCFA(order.forwarder_fee)}
            {order.weight_kg ? ` (${order.weight_kg} kg)` : ''}
          </div>
        </div>

        {/* Encaissé & Taux de récupération */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-md)',
          padding: '14px',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
            Encaissé des ventes
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', margin: '4px 0' }}>
            {formatFCFA(summary.collected_total)}
          </div>
          <div style={{ marginTop: '6px' }}>
            <ProgressBar value={recoveryRate} color={summary.is_recovered ? 'primary' : 'accent'} />
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '3px', textAlign: 'right' }}>
              {recoveryRate} % récupéré
            </div>
          </div>
        </div>

        {/* Reste à récupérer / Seuil */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-md)',
          padding: '14px',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
            Seuil de récupération
          </div>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: summary.is_recovered ? 'var(--color-success)' : 'var(--color-accent)',
            margin: '4px 0',
          }}>
            {summary.is_recovered ? '0 F (Rentabilisée !)' : formatFCFA(summary.remaining_to_recover)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Solde trésorerie :{' '}
            <span style={{ fontWeight: 600, color: summary.balance >= 0 ? 'var(--color-success)' : 'var(--color-accent)' }}>
              {formatFCFA(summary.balance)}
            </span>
          </div>
        </div>

        {/* Bénéfice Prévu & Marge Réalisée */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-md)',
          padding: '14px',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
            Bénéfice prévu
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', margin: '4px 0' }}>
            {formatFCFA(summary.expected_profit)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Marge nette réalisée : <strong style={{ color: 'var(--color-text)' }}>{formatFCFA(summary.realized_margin)}</strong>
          </div>
        </div>
      </div>

      {/* ── Bilan du Stock & Écoulement ───────────────────────────────────── */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card-lg)',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          État d'écoulement du stock
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '14px' }}>
          <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '10px 6px', borderRadius: 'var(--radius-card-sm)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Vendables</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>
              {summary.vendable_units}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '10px 6px', borderRadius: 'var(--radius-card-sm)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Vendus</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
              {summary.sold_units}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '10px 6px', borderRadius: 'var(--radius-card-sm)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>En Stock</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>
              {summary.stock_units}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '10px 6px', borderRadius: 'var(--radius-card-sm)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Écoulement</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
              {Math.round(summary.sell_through_rate || 0)} %
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
          <span>Valeur du stock restant : <strong>{formatFCFA(summary.stock_value_at_price)}</strong></span>
          <span>Remises accordées : <strong>{formatFCFA(summary.total_discounts)}</strong></span>
        </div>
        {summary.lost_units > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={13} />
            <span>Pertes enregistrées : {summary.lost_units} unité(s) ({formatFCFA(summary.lost_value)})</span>
          </div>
        )}
      </div>

      {/* ── Section : Articles rattachés ─────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Articles de cette commande ({items.length})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Articles reçus et configurés pour la vente
            </p>
          </div>

          <Link
            to="/articles"
            className="btn-secondary"
            style={{
              textDecoration: 'none',
              fontSize: '0.78rem',
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={15} /> Voir les articles
          </Link>
        </div>

        {items.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-card-lg)',
            padding: '24px 16px',
            textAlign: 'center',
          }}>
            <Package size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
              Aucun article rattaché pour l'instant
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '4px 0 14px' }}>
              Une fois la commande arrivée, enregistrez les articles avec leurs variantes et photos.
            </p>
            <Link
              to="/articles"
              className="btn-primary"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                fontSize: '0.8rem',
                padding: '6px 14px',
              }}
            >
              <Plus size={15} /> Créer les articles (Étape 6)
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Vignette photo ou icône */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-card-sm)',
                  backgroundColor: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {it.photo_url ? (
                    <img src={it.photo_url} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={20} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>

                {/* Nom, code, prix */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {it.code}
                    </span>
                    {it.category_name && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-alt)', padding: '1px 6px', borderRadius: 'var(--radius-pill)' }}>
                        {it.category_name}
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Prix fixé : <strong style={{ color: 'var(--color-text)' }}>{formatFCFA(it.list_price)}</strong>
                    {it.unit_cost !== null && ` • Coût : ${formatFCFA(it.unit_cost)}`}
                  </div>
                </div>

                {/* Stock & Vendus */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: it.total_stock > 0 ? 'var(--color-text)' : 'var(--color-danger)' }}>
                    {it.total_stock} en stock
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    {it.total_sold} vendus
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section : Notes d'équipe ──────────────────────────────────────── */}
      {order.notes && (
        <div style={{
          backgroundColor: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-card-md)',
          padding: '14px',
          marginBottom: '20px',
        }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: '0 0 6px' }}>
            Notes & remarques
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-line' }}>
            {order.notes}
          </p>
        </div>
      )}

      {/* ── Modal : Marquer comme reçue ───────────────────────────────────── */}
      {showReceiveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 200,
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card-lg)',
            padding: '20px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: 'var(--shadow-nav)',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>
              Confirmer la réception de la marchandise
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Veuillez indiquer la date effective de réception. Elle servira de départ au calcul de l'ancienneté du stock.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                Date de réception
              </label>
              <input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className="zadri-input"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
                className="btn-secondary"
                disabled={markingReceived}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleMarkReceived}
                className="btn-primary"
                style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                disabled={markingReceived}
              >
                {markingReceived ? 'Enregistrement…' : 'Valider la réception'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation basse */}
      <BottomNav />
    </div>
  );
};
