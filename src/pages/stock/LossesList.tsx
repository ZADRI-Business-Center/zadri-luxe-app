import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { getCloudinaryThumbnail } from '../../lib/imageUpload';
import { cancelLoss, getLossesList } from '../../lib/stockService';
import {
  LOSS_REASONS_LABELS,
  type LossReason,
  type LossRecord,
} from '../../types/stock';

function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} F CFA`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export const LossesList: React.FC = () => {
  const [losses, setLosses] = useState<LossRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [reasonFilter, setReasonFilter] = useState<LossReason | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modale d'annulation de perte
  const [lossToCancel, setLossToCancel] = useState<LossRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadLosses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLossesList();
      setLosses(data);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger le journal des pertes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLosses();
  }, [loadLosses]);

  // Filtrage
  const filteredLosses = useMemo(() => {
    return losses.filter((loss) => {
      if (reasonFilter !== 'all' && loss.reason !== reasonFilter) return false;
      if (statusFilter !== 'all' && loss.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase().trim();
        return (
          loss.item_name?.toLowerCase().includes(t) ||
          loss.variant_label?.toLowerCase().includes(t) ||
          loss.item_code?.toLowerCase().includes(t) ||
          loss.note?.toLowerCase().includes(t) ||
          loss.order_reference?.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [losses, reasonFilter, statusFilter, searchTerm]);

  // Statistiques résumées
  const stats = useMemo(() => {
    const active = losses.filter((l) => l.status === 'active');
    const totalLostUnits = active.reduce((acc, l) => acc + l.quantity, 0);
    const totalLostValue = active.reduce((acc, l) => acc + (l.lost_value || 0), 0);
    return { totalLostUnits, totalLostValue, activeCount: active.length };
  }, [losses]);

  // Annuler la perte (restitue le stock en base)
  const handleConfirmCancel = async () => {
    if (!lossToCancel) return;
    if (!cancelReason.trim()) {
      setCancelError('Le motif d’annulation est obligatoire.');
      return;
    }

    try {
      setCancelling(true);
      setCancelError(null);
      await cancelLoss(lossToCancel.id, cancelReason);
      setLossToCancel(null);
      setCancelReason('');
      await loadLosses();
    } catch (err: any) {
      setCancelError(err?.message || 'Erreur lors de l’annulation de la perte.');
    } finally {
      setCancelling(false);
    }
  };

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
          <Link to="/invendus" style={{ color: 'var(--color-text-muted)', display: 'flex' }} aria-label="Retour invendus">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <span className="zadri-logo-label">SORTIES DE STOCK</span>
            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: '2px 0 0',
              }}
            >
              Pertes & Sorties
            </h1>
          </div>
        </div>

        <Link
          to="/invendus"
          className="btn-secondary"
          style={{ width: 'auto', minHeight: '36px', padding: '0 12px', fontSize: '0.78rem', borderRadius: 'var(--radius-pill)' }}
        >
          Voir Invendus
        </Link>
      </header>

      {/* ── Cartouche de Synthèse ──────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card-sm)',
            padding: '14px',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Pièces sorties en perte
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '2px' }}>
            {stats.totalLostUnits} pièces
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {stats.activeCount} sorties enregistrées
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card-sm)',
            padding: '14px',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Valeur des pertes (au coût)
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '2px' }}>
            {formatFCFA(stats.totalLostValue)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Déduite de la marge nette
          </div>
        </div>
      </div>

      {/* ── Filtres & Recherche ────────────────────────────────────────── */}
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
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
            placeholder="Rechercher par article, variante, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="form-input"
            style={{ height: '36px', fontSize: '0.78rem', flex: 1 }}
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value as any)}
          >
            <option value="all">Tous les motifs</option>
            <option value="damaged">💥 Abîmé</option>
            <option value="unsellable">🚫 Invendable</option>
            <option value="gift">🎁 Offert / Cadeau</option>
            <option value="lost">🕵️ Perdu / Volé</option>
            <option value="other">📦 Autre</option>
          </select>

          <select
            className="form-input"
            style={{ height: '36px', fontSize: '0.78rem', flex: 1 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives uniquement</option>
            <option value="cancelled">Annulées uniquement</option>
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
            onClick={loadLosses}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── Liste des Sorties en Perte ─────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : filteredLosses.length === 0 ? (
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
          <Trash2 size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Aucune sortie en perte enregistrée</div>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Vous pouvez sortir des pièces abîmées ou offertes depuis l'écran Invendus.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredLosses.map((loss) => {
            const isCancelled = loss.status === 'cancelled';
            const reasonCfg = LOSS_REASONS_LABELS[loss.reason] || { label: loss.reason, icon: '📦' };

            return (
              <div
                key={loss.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isCancelled
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '12px 14px',
                  opacity: isCancelled ? 0.7 : 1,
                  position: 'relative',
                }}
              >
                {/* Ligne 1 : Date & Motif & Statut */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    <Calendar size={13} />
                    <span>{formatDate(loss.occurred_on)}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--color-danger)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 700,
                      }}
                    >
                      {reasonCfg.icon} {reasonCfg.label}
                    </span>
                  </div>

                  {isCancelled ? (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--color-danger)',
                      }}
                    >
                      Annulée
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Réf {loss.order_reference}
                    </span>
                  )}
                </div>

                {/* Ligne 2 : Photo, Article, Quantité */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-card-sm)',
                      overflow: 'hidden',
                      background: 'var(--color-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {loss.photo_url ? (
                      <img
                        src={getCloudinaryThumbnail(loss.photo_url, 90) ?? loss.photo_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ShoppingBag size={18} color="var(--color-text-muted)" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        textDecoration: isCancelled ? 'line-through' : 'none',
                        color: isCancelled ? 'var(--color-text-muted)' : 'var(--color-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {loss.item_name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                      Variante : <strong>{loss.variant_label}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: isCancelled ? 'var(--color-text-muted)' : 'var(--color-danger)',
                        textDecoration: isCancelled ? 'line-through' : 'none',
                      }}
                    >
                      -{loss.quantity} pièce(s)
                    </div>
                    {loss.lost_value && loss.lost_value > 0 ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Coût : {formatFCFA(loss.lost_value)}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Motif si annulée (§9.5) */}
                {isCancelled && loss.cancel_reason && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-card-sm)',
                      fontSize: '0.74rem',
                      color: 'var(--color-danger)',
                      marginBottom: '8px',
                    }}
                  >
                    Motif d'annulation : <em>« {loss.cancel_reason} »</em>
                    {loss.cancelled_at && ` (le ${formatDate(loss.cancelled_at)})`}
                  </div>
                )}

                {/* Note interne si existante */}
                {!isCancelled && loss.note && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>
                    Note : {loss.note}
                  </div>
                )}

                {/* Bouton Annuler la perte (restitue le stock) */}
                {!isCancelled && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setLossToCancel(loss);
                        setCancelReason('');
                        setCancelError(null);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--color-danger)',
                        borderRadius: 'var(--radius-card-sm)',
                        padding: '0 10px',
                        minHeight: '30px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                      }}
                    >
                      <Ban size={13} /> Annuler la sortie (restituer au stock)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modale d'Annulation de Perte (§9.5) ────────────────────────── */}
      {lossToCancel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              maxWidth: '440px',
              width: '100%',
              padding: '20px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--color-danger)' }}>
              <AlertTriangle size={24} />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Annuler cette perte</h2>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Les <strong>{lossToCancel.quantity} pièce(s)</strong> seront immédiatement réintégrées dans votre stock disponible.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>
                Motif d'annulation <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Ex. Erreur de saisie, article retrouvé en bon état..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {cancelError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', marginBottom: '12px' }}>
                {cancelError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setLossToCancel(null)}
                className="btn-secondary"
                style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={cancelling || !cancelReason.trim()}
                onClick={handleConfirmCancel}
                style={{
                  background: 'var(--color-danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-card-sm)',
                  padding: '0 16px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: cancelling || !cancelReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: cancelling || !cancelReason.trim() ? 0.6 : 1,
                  minHeight: '38px',
                }}
              >
                {cancelling ? 'Annulation...' : 'Confirmer et restituer au stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre de navigation mobile inférieure */}
      <BottomNav />
    </div>
  );
};
