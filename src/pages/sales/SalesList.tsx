import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Ban,
  Clock,
  Edit2,
  Plus,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { getCloudinaryThumbnail } from '../../lib/imageUpload';
import {
  cancelSale,
  getSalesList,
  updateSale,
  type SalesFilterOptions,
} from '../../lib/salesService';
import type { Sale, SaleChannel, UpdateSalePayload } from '../../types/sales';

function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} F CFA`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

const CHANNELS_CONFIG: Record<string, { label: string; icon: string }> = {
  direct: { label: 'Direct', icon: '🤝' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  facebook: { label: 'Facebook', icon: '📘' },
  other: { label: 'Autre', icon: '📦' },
};

export const SalesList: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('month');
  const [channelFilter, setChannelFilter] = useState<SaleChannel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modale d'annulation
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Modale de correction
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editTotal, setEditTotal] = useState<string>('');
  const [editChannel, setEditChannel] = useState<SaleChannel>('direct');
  const [editSoldAt, setEditSoldAt] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Chargement des ventes
  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const options: SalesFilterOptions = {
        period,
        channel: channelFilter,
        status: statusFilter,
        search: searchTerm,
      };
      const data = await getSalesList(options);
      setSales(data);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger le journal des ventes.');
    } finally {
      setLoading(false);
    }
  }, [period, channelFilter, statusFilter, searchTerm]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Statistiques résumées de la sélection
  const stats = useMemo(() => {
    const active = sales.filter((s) => s.status === 'active');
    const totalRevenue = active.reduce((acc, s) => acc + s.sold_total, 0);
    const totalUnits = active.reduce((acc, s) => acc + s.quantity, 0);
    const totalDiscounts = active.reduce((acc, s) => acc + Math.max(0, s.discount || 0), 0);
    return {
      revenue: totalRevenue,
      units: totalUnits,
      discounts: totalDiscounts,
      activeCount: active.length,
      cancelledCount: sales.length - active.length,
    };
  }, [sales]);

  // Action Annuler Vente
  const handleConfirmCancel = async () => {
    if (!saleToCancel) return;
    if (!cancelReason.trim()) {
      setCancelError('Le motif d’annulation est obligatoire.');
      return;
    }

    try {
      setCancelling(true);
      setCancelError(null);
      await cancelSale(saleToCancel.id, cancelReason);
      setSaleToCancel(null);
      setCancelReason('');
      await loadSales();
    } catch (err: any) {
      setCancelError(err?.message || 'Erreur lors de l’annulation de la vente.');
    } finally {
      setCancelling(false);
    }
  };

  // Ouvrir modal de correction
  const handleOpenEdit = (sale: Sale) => {
    setSaleToEdit(sale);
    setEditQty(sale.quantity);
    setEditTotal(String(sale.sold_total));
    setEditChannel(sale.channel || 'direct');
    setEditNote(sale.note || '');
    setEditError(null);

    try {
      const d = new Date(sale.sold_at);
      // Format YYYY-MM-DDTHH:mm
      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditSoldAt(localIso);
    } catch {
      setEditSoldAt('');
    }
  };

  // Action Sauvegarder Correction
  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToEdit) return;
    const numTotal = Number(editTotal);
    if (!numTotal || numTotal <= 0) {
      setEditError('Le montant encaissé doit être supérieur à 0.');
      return;
    }
    if (editQty <= 0) {
      setEditError('La quantité doit être supérieure à 0.');
      return;
    }

    try {
      setEditing(true);
      setEditError(null);

      const payload: UpdateSalePayload = {
        sale_id: saleToEdit.id,
        quantity: editQty,
        sold_total: numTotal,
        channel: editChannel,
        sold_at: editSoldAt ? new Date(editSoldAt).toISOString() : saleToEdit.sold_at,
        note: editNote.trim() || null,
      };

      await updateSale(payload);
      setSaleToEdit(null);
      await loadSales();
    } catch (err: any) {
      setEditError(err?.message || 'Erreur lors de la mise à jour de la vente.');
    } finally {
      setEditing(false);
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
        <div>
          <span className="zadri-logo-label">JOURNAL DE CAISSE</span>
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: '2px 0 0',
            }}
          >
            Ventes
          </h1>
        </div>

        <Link
          to="/vendre"
          className="btn-primary"
          style={{ width: 'auto', minHeight: '40px', padding: '0 16px', borderRadius: 'var(--radius-pill)' }}
        >
          <Plus size={18} /> Nouvelle vente
        </Link>
      </header>

      {/* ── Cartouche de Résumé Financier ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card-sm)',
            padding: '12px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Encaissé net
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>
            {formatFCFA(stats.revenue)}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card-sm)',
            padding: '12px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Pièces vendues
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '2px' }}>
            {stats.units} {stats.units > 1 ? 'unités' : 'unité'}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card-sm)',
            padding: '12px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Remises données
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px' }}>
            {formatFCFA(stats.discounts)}
          </div>
        </div>
      </div>

      {/* ── Filtres Période, Recherche & Statuts ────────────────────────── */}
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
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
            placeholder="Rechercher par article, variante, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: active ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-alt)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Ligne Canaux & Statut */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ height: '36px', fontSize: '0.78rem', flex: 1 }}
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as any)}
          >
            <option value="all">Tous les canaux</option>
            <option value="direct">🤝 Direct</option>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="facebook">📘 Facebook</option>
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
            onClick={loadSales}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── Liste des Ventes ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : sales.length === 0 ? (
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
          <ShoppingBag size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Aucune vente pour cette sélection</div>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Enregistrez votre première vente via le bouton central Vendre.
          </p>
          <Link
            to="/vendre"
            className="btn-primary"
            style={{ display: 'inline-flex', width: 'auto', padding: '0 18px', marginTop: '12px' }}
          >
            <Plus size={16} /> Enregistrer une vente
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sales.map((sale) => {
            const isCancelled = sale.status === 'cancelled';
            const channelCfg = sale.channel ? CHANNELS_CONFIG[sale.channel] : null;

            return (
              <div
                key={sale.id}
                style={{
                  background: 'var(--color-surface)',
                  border: isCancelled
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '12px 14px',
                  opacity: isCancelled ? 0.72 : 1,
                  position: 'relative',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Ligne 1 : Date & Canal & Statut */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    <Clock size={13} />
                    <span>{formatDate(sale.sold_at)}</span>
                    {channelCfg && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: 'var(--color-surface-alt)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-pill)',
                          fontWeight: 600,
                        }}
                      >
                        {channelCfg.icon} {channelCfg.label}
                      </span>
                    )}
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
                      Réf {sale.order_reference}
                    </span>
                  )}
                </div>

                {/* Ligne 2 : Photo, Nom, Variante & Montant */}
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
                    {sale.photo_url ? (
                      <img
                        src={getCloudinaryThumbnail(sale.photo_url, 90) ?? sale.photo_url}
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
                      {sale.item_name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                      Variante : <strong>{sale.variant_label}</strong> · Qté : <strong>{sale.quantity}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: isCancelled ? 'var(--color-text-muted)' : 'var(--color-primary)',
                        textDecoration: isCancelled ? 'line-through' : 'none',
                      }}
                    >
                      {formatFCFA(sale.sold_total)}
                    </div>
                    {sale.discount && sale.discount > 0 ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                        Remise : -{formatFCFA(sale.discount)}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Motif si annulée (§9.4 : visible et barrée avec motif) */}
                {isCancelled && sale.cancel_reason && (
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
                    Motif : <em>« {sale.cancel_reason} »</em>
                    {sale.cancelled_at && ` (le ${formatDate(sale.cancelled_at)})`}
                  </div>
                )}

                {/* Note interne si existante */}
                {!isCancelled && sale.note && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>
                    Note : {sale.note}
                  </div>
                )}

                {/* Actions (uniquement si vente active) */}
                {!isCancelled && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sale)}
                      className="btn-secondary"
                      style={{ width: 'auto', minHeight: '32px', padding: '0 10px', fontSize: '0.74rem' }}
                    >
                      <Edit2 size={13} /> Corriger
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaleToCancel(sale);
                        setCancelReason('');
                        setCancelError(null);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--color-danger)',
                        borderRadius: 'var(--radius-card-sm)',
                        padding: '0 10px',
                        minHeight: '32px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                      }}
                    >
                      <Ban size={13} /> Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modale d'Annulation de Vente (§9.4) ────────────────────────── */}
      {saleToCancel && (
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
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Annuler cette vente</h2>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Cette action est <strong>irréversible</strong>. Les <strong>{saleToCancel.quantity} pièce(s)</strong> seront immédiatement restituées au stock disponible.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>
                Motif d'annulation <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Ex. Erreur de saisie, client a changé d'avis, retour article..."
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
                onClick={() => setSaleToCancel(null)}
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
                {cancelling ? 'Annulation...' : 'Confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale de Correction de Vente (§9.4) ───────────────────────── */}
      {saleToEdit && (
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
              maxWidth: '460px',
              width: '100%',
              padding: '20px',
              boxShadow: 'var(--shadow-card)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Corriger la vente
              </h2>
              <button
                type="button"
                onClick={() => setSaleToEdit(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Quantité</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="form-input"
                  value={editQty}
                  onChange={(e) => setEditQty(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Montant total encaissé (F CFA)</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="form-input"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Canal de vente</label>
                <select
                  className="form-input"
                  value={editChannel}
                  onChange={(e) => setEditChannel(e.target.value as SaleChannel)}
                >
                  <option value="direct">🤝 Direct</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="facebook">📘 Facebook</option>
                  <option value="other">📦 Autre</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Date de vente</label>
                <input
                  type="datetime-local"
                  required
                  className="form-input"
                  value={editSoldAt}
                  onChange={(e) => setEditSoldAt(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Note interne (facultative)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ex. Correction prix ou remise"
                />
              </div>

              {editError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={editing}
                  onClick={() => setSaleToEdit(null)}
                  className="btn-secondary"
                  style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="btn-primary"
                  style={{ width: 'auto', minHeight: '38px', padding: '0 18px' }}
                >
                  {editing ? 'Enregistrement...' : 'Enregistrer la correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barre de navigation mobile inférieure */}
      <BottomNav />
    </div>
  );
};
