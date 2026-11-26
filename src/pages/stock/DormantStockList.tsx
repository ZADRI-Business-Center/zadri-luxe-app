import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Flame,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { getCloudinaryThumbnail } from '../../lib/imageUpload';
import {
  applyPriceChange,
  createLoss,
  getDormantStock,
} from '../../lib/stockService';
import type { DormantStatus } from '../../types/items';
import {
  LOSS_REASONS_LABELS,
  type DormantVariant,
  type LossReason,
} from '../../types/stock';

function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} F CFA`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Aucune vente';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 30) return `Il y a ${diffDays} j`;
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(d);
  } catch {
    return iso;
  }
}

export const DormantStockList: React.FC = () => {
  const [stockItems, setStockItems] = useState<DormantVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<DormantStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modale Décote (Baisser le prix)
  const [variantToMarkdown, setVariantToMarkdown] = useState<DormantVariant | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [markdownNote, setMarkdownNote] = useState<string>('');
  const [markdownLoading, setMarkdownLoading] = useState(false);
  const [markdownError, setMarkdownError] = useState<string | null>(null);

  // Modale Sortie en Perte
  const [variantToLoss, setVariantToLoss] = useState<DormantVariant | null>(null);
  const [lossQty, setLossQty] = useState<number>(1);
  const [lossReason, setLossReason] = useState<LossReason>('damaged');
  const [lossNote, setLossNote] = useState<string>('');
  const [lossLoading, setLossLoading] = useState(false);
  const [lossError, setLossError] = useState<string | null>(null);

  // Notification de succès
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Chargement des données
  const loadStock = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDormantStock();
      setStockItems(data);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les invendus.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // Filtrage
  const filteredItems = useMemo(() => {
    return stockItems.filter((item) => {
      if (statusFilter !== 'all' && item.dormant_status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase().trim();
        return (
          item.item_name.toLowerCase().includes(t) ||
          item.variant_label.toLowerCase().includes(t) ||
          item.item_code.toLowerCase().includes(t) ||
          item.order_reference.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [stockItems, statusFilter, searchTerm]);

  // Statistiques financières globales
  const stats = useMemo(() => {
    const totalUnits = stockItems.reduce((acc, i) => acc + i.stock, 0);
    const valueCost = stockItems.reduce((acc, i) => acc + i.stock_value_at_cost, 0);
    const valuePrice = stockItems.reduce((acc, i) => acc + i.stock_value_at_price, 0);
    const watchCount = stockItems.filter((i) => i.dormant_status === 'watch').length;
    const clearanceCount = stockItems.filter((i) => i.dormant_status === 'clearance').length;

    return { totalUnits, valueCost, valuePrice, watchCount, clearanceCount };
  }, [stockItems]);

  // Ouvrir modale de décote
  const handleOpenMarkdown = (v: DormantVariant) => {
    setVariantToMarkdown(v);
    setNewPrice(String(v.effective_price));
    setMarkdownNote('Décote invendu');
    setMarkdownError(null);
  };

  // Calculs en direct pour la décote
  const markdownCalc = useMemo(() => {
    if (!variantToMarkdown) return null;
    const oldP = variantToMarkdown.effective_price;
    const newP = Number(newPrice) || 0;
    const diff = oldP - newP;
    const pct = oldP > 0 ? Math.round((diff / oldP) * 100) : 0;
    const unitCost = variantToMarkdown.effective_unit_cost;
    const oldMargin = oldP - unitCost;
    const newMargin = newP - unitCost;

    return {
      oldP,
      newP,
      diff,
      pct,
      unitCost,
      oldMargin,
      newMargin,
    };
  }, [variantToMarkdown, newPrice]);

  // Appliquer décote rapide (-10%, -20%, etc.)
  const applyQuickPct = (pct: number) => {
    if (!variantToMarkdown) return;
    const reduced = Math.round((variantToMarkdown.effective_price * (100 - pct)) / 100);
    setNewPrice(String(reduced));
  };

  // Valider la décote
  const handleConfirmMarkdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantToMarkdown) return;
    const p = Number(newPrice);
    if (isNaN(p) || p < 0) {
      setMarkdownError('Le nouveau prix doit être positif ou nul.');
      return;
    }

    try {
      setMarkdownLoading(true);
      setMarkdownError(null);
      await applyPriceChange({
        item_id: variantToMarkdown.item_id,
        variant_id: variantToMarkdown.variant_id,
        new_price: p,
        note: markdownNote.trim() || undefined,
      });

      setSuccessToast(`Nouveau prix appliqué : ${formatFCFA(p)}`);
      setVariantToMarkdown(null);
      await loadStock();
    } catch (err: any) {
      setMarkdownError(err?.message || 'Erreur lors de la modification du prix.');
    } finally {
      setMarkdownLoading(false);
    }
  };

  // Ouvrir modale de sortie en perte
  const handleOpenLoss = (v: DormantVariant) => {
    setVariantToLoss(v);
    setLossQty(1);
    setLossReason('damaged');
    setLossNote('');
    setLossError(null);
  };

  // Valider la sortie en perte
  const handleConfirmLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantToLoss) return;
    if (lossQty <= 0 || lossQty > variantToLoss.stock) {
      setLossError(`La quantité doit être comprise entre 1 et ${variantToLoss.stock}.`);
      return;
    }

    try {
      setLossLoading(true);
      setLossError(null);
      await createLoss({
        variant_id: variantToLoss.variant_id,
        quantity: lossQty,
        reason: lossReason,
        occurred_on: new Date().toISOString().slice(0, 10),
        note: lossNote.trim() || undefined,
      });

      setSuccessToast(`${lossQty} pièce(s) sortie(s) en perte avec succès.`);
      setVariantToLoss(null);
      await loadStock();
    } catch (err: any) {
      setLossError(err?.message || 'Erreur lors de l’enregistrement de la perte.');
    } finally {
      setLossLoading(false);
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
          <Link to="/" style={{ color: 'var(--color-text-muted)', display: 'flex' }} aria-label="Retour accueil">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <span className="zadri-logo-label">STOCK & IMMOBILISÉ</span>
            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: '2px 0 0',
              }}
            >
              Invendus
            </h1>
          </div>
        </div>

        <Link
          to="/pertes"
          className="btn-secondary"
          style={{ width: 'auto', minHeight: '36px', padding: '0 12px', fontSize: '0.78rem', borderRadius: 'var(--radius-pill)' }}
        >
          <FileText size={15} /> Pertes
        </Link>
      </header>

      {/* ── Toast de succès ────────────────────────────────────────────── */}
      {successToast && (
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--color-primary)',
            color: 'var(--color-primary)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-card-sm)',
            marginBottom: '14px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> {successToast}
          </span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Cartouches Valeur Immobilisée (R19) ─────────────────────────── */}
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
            Immobilisé au coût
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '2px' }}>
            {formatFCFA(stats.valueCost)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Capital achat engagé
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
            Valeur au prix de vente
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>
            {formatFCFA(stats.valuePrice)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {stats.totalUnits} pièces en stock
          </div>
        </div>
      </div>

      {/* ── Filtres Statuts d'Ancienneté & Recherche ───────────────────── */}
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
            placeholder="Rechercher par article, variante, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Boutons de filtres d'ancienneté (§9.5) */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              border: statusFilter === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: statusFilter === 'all' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-alt)',
              color: statusFilter === 'all' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: statusFilter === 'all' ? 700 : 500,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Tous ({stockItems.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('clearance')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              border: statusFilter === 'clearance' ? '1px solid var(--color-danger)' : '1px solid var(--color-border)',
              background: statusFilter === 'clearance' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-surface-alt)',
              color: statusFilter === 'clearance' ? 'var(--color-danger)' : 'var(--color-text-muted)',
              fontWeight: statusFilter === 'clearance' ? 700 : 500,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Flame size={13} /> À déstocker ({stats.clearanceCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('watch')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              border: statusFilter === 'watch' ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
              background: statusFilter === 'watch' ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-surface-alt)',
              color: statusFilter === 'watch' ? 'var(--color-warning)' : 'var(--color-text-muted)',
              fontWeight: statusFilter === 'watch' ? 700 : 500,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            À surveiller ({stats.watchCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('normal')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              border: statusFilter === 'normal' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: statusFilter === 'normal' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-alt)',
              color: statusFilter === 'normal' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: statusFilter === 'normal' ? 700 : 500,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Normal
          </button>
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
            onClick={loadStock}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── Liste des Variantes en Stock Dormant ───────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : filteredItems.length === 0 ? (
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
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Aucun article dans cette catégorie</div>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Tout votre stock est en mouvement ou correspond à vos critères.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredItems.map((variant) => {
            const isClearance = variant.dormant_status === 'clearance';
            const isWatch = variant.dormant_status === 'watch';

            return (
              <div
                key={variant.variant_id}
                style={{
                  background: 'var(--color-surface)',
                  border: isClearance
                    ? '1.5px solid rgba(239, 68, 68, 0.4)'
                    : isWatch
                    ? '1.5px solid rgba(245, 158, 11, 0.35)'
                    : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Ligne 1 : Statut Ancienneté & Jours en stock */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: isClearance
                        ? 'rgba(239, 68, 68, 0.15)'
                        : isWatch
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(16, 185, 129, 0.12)',
                      color: isClearance
                        ? 'var(--color-danger)'
                        : isWatch
                        ? 'var(--color-warning)'
                        : 'var(--color-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isClearance && <Flame size={12} />}
                    {isClearance
                      ? `À déstocker (${variant.days_in_stock} jours)`
                      : isWatch
                      ? `À surveiller (${variant.days_in_stock} jours)`
                      : `Normal (${variant.days_in_stock} jours)`}
                  </span>

                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    Réf. {variant.order_reference} · Reçu le {variant.received_date}
                  </span>
                </div>

                {/* Ligne 2 : Photo, Nom, Variante & Stock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-card-sm)',
                      overflow: 'hidden',
                      background: 'var(--color-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {variant.photo_url ? (
                      <img
                        src={getCloudinaryThumbnail(variant.photo_url, 100) ?? variant.photo_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ShoppingBag size={20} color="var(--color-text-muted)" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {variant.item_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Variante : <strong style={{ color: 'var(--color-text)' }}>{variant.variant_label}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {variant.stock} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>en stock</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      Dernière vente : <strong>{formatDate(variant.last_sold_at)}</strong>
                    </div>
                  </div>
                </div>

                {/* Ligne 3 : Détail Financier & Valeur Immobilisée */}
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-card-sm)',
                    padding: '8px 12px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    fontSize: '0.74rem',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Prix fixé</div>
                    <div style={{ fontWeight: 700, marginTop: '1px' }}>{formatFCFA(variant.effective_price)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Coût unitaire</div>
                    <div style={{ fontWeight: 700, marginTop: '1px' }}>
                      {variant.effective_unit_cost > 0 ? formatFCFA(variant.effective_unit_cost) : 'Non renseigné'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Immobilisé au coût</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-warning)', marginTop: '1px' }}>
                      {formatFCFA(variant.stock_value_at_cost)}
                    </div>
                  </div>
                </div>

                {/* Ligne 4 : Actions (§9.5 Baisser le prix & Sortir en perte) */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenLoss(variant)}
                    className="btn-secondary"
                    style={{
                      width: 'auto',
                      minHeight: '34px',
                      padding: '0 12px',
                      fontSize: '0.76rem',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <Trash2 size={13} /> Sortir du stock (perte)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMarkdown(variant)}
                    className="btn-primary"
                    style={{
                      width: 'auto',
                      minHeight: '34px',
                      padding: '0 14px',
                      fontSize: '0.76rem',
                    }}
                  >
                    <TrendingDown size={14} /> Baisser le prix (décote)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modale Baisser le prix / Décote (§9.5) ────────────────────── */}
      {variantToMarkdown && markdownCalc && (
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
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={20} color="var(--color-primary)" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Baisser le prix (décote)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVariantToMarkdown(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Article : <strong>{variantToMarkdown.item_name}</strong> ({variantToMarkdown.variant_label})
            </div>

            <form onSubmit={handleConfirmMarkdown} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Raccourcis de décote en % */}
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Baisse rapide en %</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[10, 20, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyQuickPct(pct)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 'var(--radius-card-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-alt)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ Nouveau Prix */}
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Nouveau prix fixé (F CFA)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  required
                  className="form-input"
                  style={{ height: '44px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>

              {/* Impact affiché en direct (§9.5) */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-card-sm)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Ancien prix fixé :</span>
                  <strong style={{ textDecoration: 'line-through' }}>{formatFCFA(markdownCalc.oldP)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Baisse appliquée :</span>
                  <strong style={{ color: markdownCalc.diff > 0 ? 'var(--color-warning)' : 'inherit' }}>
                    {markdownCalc.diff > 0 ? `-${formatFCFA(markdownCalc.diff)} (-${markdownCalc.pct}%)` : 'Aucune baisse'}
                  </strong>
                </div>

                {markdownCalc.unitCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Impact marge unitaire :</span>
                    <strong style={{ color: markdownCalc.newMargin >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                      {formatFCFA(markdownCalc.newMargin)} (au lieu de {formatFCFA(markdownCalc.oldMargin)})
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Note d'explication (consignée dans l'historique)</label>
                <input
                  type="text"
                  className="form-input"
                  value={markdownNote}
                  onChange={(e) => setMarkdownNote(e.target.value)}
                  placeholder="Ex. Déstockage fin de série, promotion..."
                />
              </div>

              {markdownError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>
                  {markdownError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={markdownLoading}
                  onClick={() => setVariantToMarkdown(null)}
                  className="btn-secondary"
                  style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={markdownLoading}
                  className="btn-primary"
                  style={{ width: 'auto', minHeight: '38px', padding: '0 18px' }}
                >
                  {markdownLoading ? 'Application...' : 'Valider la baisse de prix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Sortir du Stock en Perte (§9.5) ────────────────────── */}
      {variantToLoss && (
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
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)' }}>
                <Trash2 size={20} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  Sortir du stock (perte)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVariantToLoss(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Article : <strong>{variantToLoss.item_name}</strong> ({variantToLoss.variant_label}) · Stock disponible : <strong>{variantToLoss.stock}</strong> pièce(s).
            </p>

            <form onSubmit={handleConfirmLoss} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Quantité */}
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>
                  Quantité à sortir (≤ {variantToLoss.stock})
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={lossQty <= 1}
                    onClick={() => setLossQty((q) => Math.max(1, q - 1))}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-card-sm)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-alt)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: lossQty <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={variantToLoss.stock}
                    required
                    className="form-input"
                    style={{ height: '40px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, width: '80px' }}
                    value={lossQty}
                    onChange={(e) => setLossQty(Math.min(variantToLoss.stock, Math.max(1, Number(e.target.value))))}
                  />

                  <button
                    type="button"
                    disabled={lossQty >= variantToLoss.stock}
                    onClick={() => setLossQty((q) => Math.min(variantToLoss.stock, q + 1))}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-card-sm)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-alt)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: lossQty >= variantToLoss.stock ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Motif de perte (§9.5) */}
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>
                  Motif de sortie en perte <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                  {(['damaged', 'unsellable', 'gift', 'lost', 'other'] as LossReason[]).map((r) => {
                    const cfg = LOSS_REASONS_LABELS[r];
                    const isSelected = lossReason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLossReason(r)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-card-sm)',
                          border: isSelected ? '1.5px solid var(--color-danger)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-surface-alt)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{cfg.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem', color: isSelected ? 'var(--color-danger)' : 'var(--color-text)' }}>
                            {cfg.label}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                            {cfg.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Note explicative (facultative)</label>
                <input
                  type="text"
                  className="form-input"
                  value={lossNote}
                  onChange={(e) => setLossNote(e.target.value)}
                  placeholder="Ex. Verre fêlé pendant le transport, offert..."
                />
              </div>

              {lossError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>
                  {lossError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  disabled={lossLoading}
                  onClick={() => setVariantToLoss(null)}
                  className="btn-secondary"
                  style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={lossLoading}
                  style={{
                    background: 'var(--color-danger)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-card-sm)',
                    padding: '0 18px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: lossLoading ? 'not-allowed' : 'pointer',
                    minHeight: '38px',
                  }}
                >
                  {lossLoading ? 'Enregistrement...' : 'Confirmer la sortie en perte'}
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
