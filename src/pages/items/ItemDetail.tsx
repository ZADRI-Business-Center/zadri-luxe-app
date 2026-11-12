import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Image as ImageIcon,
  Package,
  RefreshCw,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { Badge } from '../../components/ui/Badge';
import { getCloudinaryThumbnail } from '../../lib/imageUpload';
import { archiveItem, getItemDetail } from '../../lib/itemsService';
import { formatDate, formatFCFA } from '../../types/orders';
import { DORMANT_STATUS_CONFIG } from '../../types/items';
import type { ItemDetail as ItemDetailData, ItemVariant, PriceChange } from '../../types/items';

/* ─── composant principal ───────────────────────────────────────────────── */
export const ItemDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id: itemId } = useParams<{ id: string }>();

  const [detail, setDetail] = useState<ItemDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* actions */
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveSuccess, setArchiveSuccess] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  /* accordéon variantes */
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  /* accordéon historique */
  const [showHistory, setShowHistory] = useState(false);

  /* ── chargement ──────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const data: ItemDetailData = await getItemDetail(itemId);
      setDetail(data);
      if (data.variants.length === 1) setExpandedVariant(data.variants[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la fiche article.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => { void load(); }, [load]);

  /* ── archivage ───────────────────────────────────────────────────────── */
  const handleArchive = async () => {
    if (!itemId) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await archiveItem(itemId);
      setArchiveSuccess(true);
      setTimeout(() => navigate('/articles'), 1200);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Impossible d\'archiver l\'article.');
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  /* ── rendu ───────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner spinner-dark" style={{ width: '2rem', height: '2rem' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Chargement…</p>
        <BottomNav />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '16px 16px 90px' }}>
        <div className="alert-box alert-danger">
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>{error ?? 'Article introuvable.'}</div>
          <button className="btn-link" onClick={() => void load()}><RefreshCw size={15} /> Réessayer</button>
        </div>
        <Link to="/articles" className="btn-secondary" style={{ display: 'inline-flex', width: 'auto', padding: '0 16px' }}>
          <ArrowLeft size={16} /> Retour au catalogue
        </Link>
        <BottomNav />
      </div>
    );
  }

  const { item, variants, priceChanges } = detail;
  const isArchived = Boolean(item.archived_at);
  const statusConfig = DORMANT_STATUS_CONFIG[item.dormant_status];
  const thumbnail = getCloudinaryThumbnail(item.photo_url, 800);

  const discountPct = item.initial_price > 0
    ? Math.round(((item.initial_price - item.list_price) / item.initial_price) * 100)
    : 0;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 0 90px', width: '100%' }}>

      {/* ── Hero photo ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: '260px', background: 'var(--color-surface-alt)' }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={item.item_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={56} color="var(--color-text-muted)" />
          </div>
        )}

        {/* Bouton retour flottant */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: '12px', left: '12px',
            background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
            width: '40px', height: '40px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </button>

        {/* Badge statut flottant */}
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
          {isArchived && <span style={{ marginLeft: '6px' }}><Badge variant="muted">Archivé</Badge></span>}
        </div>
      </div>

      {/* ── Contenu principal ─────────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>

        {/* Alertes */}
        {archiveError && (
          <div className="alert-box alert-danger" style={{ marginBottom: '12px' }}>
            <AlertCircle size={18} />
            <div style={{ flex: 1 }}>{archiveError}</div>
            <button className="btn-link" onClick={() => setArchiveError(null)}><X size={14} /></button>
          </div>
        )}
        {archiveSuccess && (
          <div className="alert-box alert-success" style={{ marginBottom: '12px' }}>
            <CheckCircle size={18} /> Article archivé. Redirection…
          </div>
        )}

        {/* En-tête article */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.08em' }}>
              {item.item_code}
            </span>
            {item.category_name && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Tag size={11} /> {item.category_name}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>{item.item_name}</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Commande : {item.order_reference} · Reçu le {formatDate(item.received_date)}
          </p>
          {item.description && (
            <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>{item.description}</p>
          )}
        </div>

        {/* Prix */}
        <section style={cardStyle}>
          <h2 style={cardTitleStyle}>Prix & marges</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <StatRow label="Prix fixé actuel" value={formatFCFA(item.list_price)} strong />
            <StatRow label="Prix initial" value={formatFCFA(item.initial_price)} muted={item.list_price === item.initial_price} />
            {discountPct !== 0 && (
              <StatRow
                label="Décote cumulée"
                value={`${Math.abs(discountPct)} %`}
                color={discountPct > 0 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
            )}
            {item.unit_cost !== null ? (
              <>
                <StatRow label="Coût unitaire" value={formatFCFA(item.unit_cost)} />
                <StatRow
                  label="Marge unitaire"
                  value={formatFCFA(item.unit_margin)}
                  color={(item.unit_margin ?? 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}
                  strong
                />
              </>
            ) : (
              <div style={{ gridColumn: '1 / -1', fontSize: '0.76rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Coût unitaire non renseigné — marge non calculable précisément
              </div>
            )}
          </div>
        </section>

        {/* Stock global */}
        <section style={cardStyle}>
          <h2 style={cardTitleStyle}>Stock</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <StatBlock label="Vendables" value={item.vendable_units} />
            <StatBlock label="Vendus" value={item.sold_units} />
            <StatBlock label="En stock" value={item.stock_units} highlight />
          </div>
        </section>

        {/* ── Variantes ─────────────────────────────────────────────────── */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={cardTitleStyle}>Variantes ({variants.length})</h2>
          </div>

          {variants.length === 0 ? (
            <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>Aucune variante.</p>
          ) : (
            variants.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                itemListPrice={item.list_price}
                expanded={expandedVariant === variant.id}
                onToggle={() => setExpandedVariant((prev) => (prev === variant.id ? null : variant.id))}
              />
            ))
          )}
        </section>

        {/* ── Historique des prix ────────────────────────────────────────── */}
        {priceChanges.length > 0 && (
          <section style={cardStyle}>
            <button
              type="button"
              onClick={() => setShowHistory((p) => !p)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
            >
              <h2 style={{ ...cardTitleStyle, marginBottom: 0 }}>
                Historique des prix ({priceChanges.length})
              </h2>
              {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showHistory && (
              <div style={{ marginTop: '14px' }}>
                {priceChanges.map((pc) => (
                  <PriceChangeRow key={pc.id} change={pc} variantLabel={
                    pc.variant_id
                      ? (variants.find((v) => v.id === pc.variant_id)?.label ?? 'variante')
                      : null
                  } />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        {!isArchived && (
          <section style={cardStyle}>
            <h2 style={cardTitleStyle}>Actions</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to={`/articles/${itemId}/modifier`}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Edit2 size={16} /> Modifier l'article
              </Link>

              {!showArchiveConfirm ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowArchiveConfirm(true)}
                  style={{ color: 'var(--color-danger)', borderColor: 'rgba(var(--color-danger-rgb),0.3)' }}
                >
                  <Archive size={16} /> Archiver l'article
                </button>
              ) : (
                <div style={{ padding: '14px', background: 'var(--color-danger-bg)', border: '1px solid rgba(var(--color-danger-rgb),0.3)', borderRadius: 'var(--radius-card-sm)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-danger)', marginBottom: '12px' }}>
                    Confirmer l'archivage ? L'article ne sera plus visible dans le catalogue, mais les données sont conservées.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowArchiveConfirm(false)}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ flex: 1, background: 'var(--color-danger)' }}
                      onClick={() => void handleArchive()}
                      disabled={archiving}
                    >
                      {archiving ? <><div className="spinner" /> Archivage…</> : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Métadonnées */}
        <div style={{ fontSize: '0.71rem', color: 'var(--color-text-muted)', marginTop: '8px', marginBottom: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span><Clock size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Créé {formatDate(item.created_at)}</span>
          <span>Mis à jour {formatDate(item.updated_at)}</span>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

/* ─── Ligne de variante ─────────────────────────────────────────────────── */
interface VariantRowProps {
  variant: ItemVariant;
  itemListPrice: number;
  expanded: boolean;
  onToggle: () => void;
}

const VariantRow: React.FC<VariantRowProps> = ({ variant, itemListPrice, expanded, onToggle }) => {
  const statusConfig = DORMANT_STATUS_CONFIG[variant.dormant_status];
  const thumbnail = variant.photo_url ? getCloudinaryThumbnail(variant.photo_url, 120) : null;

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card-sm)', marginBottom: '10px', overflow: 'hidden' }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', cursor: 'pointer', background: expanded ? 'var(--color-surface-alt)' : undefined }}
      >
        {/* Miniature */}
        <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-card-sm)', background: 'var(--color-bg)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {thumbnail ? (
            <img src={thumbnail} alt={variant.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Package size={18} color="var(--color-text-muted)" />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{variant.label}</span>
            <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Stock : <strong style={{ color: 'var(--color-text)' }}>{variant.stock}</strong> · Vendus : {variant.sold_units}
            {variant.price_override !== null && (
              <> · <span style={{ color: 'var(--color-primary)' }}>{formatFCFA(variant.price_override)}</span></>
            )}
          </div>
        </div>

        <span style={{ color: 'var(--color-text-muted)', display: 'flex' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.8rem' }}>
            <InfoItem label="Commandé" value={variant.quantity_ordered !== null ? String(variant.quantity_ordered) : '—'} />
            <InfoItem label="Reçu" value={String(variant.quantity_received)} />
            <InfoItem label="Abîmé à réception" value={String(variant.quantity_damaged)} />
            <InfoItem label="Vendable" value={String(variant.vendable)} />
            <InfoItem label="Vendu" value={String(variant.sold_units)} />
            <InfoItem label="Pertes" value={String(variant.lost_units)} />
            <InfoItem label="Stock actuel" value={String(variant.stock)} highlight />
            <InfoItem
              label="Prix effectif"
              value={variant.price_override !== null
                ? `${formatFCFA(variant.price_override)} (spécifique)`
                : `${formatFCFA(itemListPrice)} (article)`}
            />
            {variant.effective_unit_cost > 0 && (
              <>
                <InfoItem
                  label={variant.cost_is_estimated ? 'Coût estimé ~' : 'Coût unitaire'}
                  value={formatFCFA(variant.effective_unit_cost)}
                />
                <InfoItem
                  label="Marge unitaire"
                  value={formatFCFA(variant.effective_price - variant.effective_unit_cost)}
                  color={(variant.effective_price - variant.effective_unit_cost) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}
                />
              </>
            )}
            <InfoItem label="Ancienneté" value={`${variant.days_in_stock} j`} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Ligne d'historique des prix ──────────────────────────────────────── */
interface PriceChangeRowProps {
  change: PriceChange;
  variantLabel: string | null;
}

const PriceChangeRow: React.FC<PriceChangeRowProps> = ({ change, variantLabel }) => {
  const isMarkdown = change.change_type === 'markdown';
  const isIncrease = change.change_type === 'increase';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
        background: isMarkdown ? 'var(--color-danger-bg)' : isIncrease ? 'rgba(var(--color-primary-rgb),0.1)' : 'var(--color-surface-alt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isMarkdown ? <TrendingDown size={15} color="var(--color-danger)" /> : isIncrease ? <TrendingUp size={15} color="var(--color-primary)" /> : <Tag size={15} color="var(--color-text-muted)" />}
      </div>
      <div style={{ flex: 1, fontSize: '0.8rem' }}>
        <div style={{ fontWeight: 600 }}>
          {change.change_type === 'initial' ? 'Prix initial' : isMarkdown ? 'Décote' : 'Hausse de prix'}
          {variantLabel && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}> · {variantLabel}</span>}
        </div>
        {change.old_price !== null && (
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {formatFCFA(change.old_price)} → <strong style={{ color: isMarkdown ? 'var(--color-danger)' : 'var(--color-primary)' }}>{formatFCFA(change.new_price)}</strong>
          </div>
        )}
        {change.old_price === null && (
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
            <strong>{formatFCFA(change.new_price)}</strong>
          </div>
        )}
        {change.note && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.73rem', marginTop: '2px', fontStyle: 'italic' }}>{change.note}</div>}
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
          {formatDate(change.changed_at)}
        </div>
      </div>
    </div>
  );
};

/* ─── Composants utilitaires ────────────────────────────────────────────── */
const StatRow: React.FC<{
  label: string;
  value: string | number | null | undefined;
  strong?: boolean;
  muted?: boolean;
  color?: string;
}> = ({ label, value, strong, muted, color }) => (
  <div>
    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{label}</div>
    <div style={{
      fontSize: '0.92rem',
      fontWeight: strong ? 700 : 500,
      color: color ?? (muted ? 'var(--color-text-muted)' : 'var(--color-text)'),
    }}>
      {value ?? '—'}
    </div>
  </div>
);

const StatBlock: React.FC<{ label: string; value: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{
    textAlign: 'center', padding: '12px 8px',
    background: highlight ? 'rgba(var(--color-primary-rgb), 0.08)' : 'var(--color-surface-alt)',
    borderRadius: 'var(--radius-card-sm)',
    border: highlight ? '1px solid rgba(var(--color-primary-rgb),0.2)' : '1px solid var(--color-border)',
  }}>
    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: highlight ? 'var(--color-primary)' : 'var(--color-text)' }}>{value}</div>
    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{label}</div>
  </div>
);

const InfoItem: React.FC<{ label: string; value: string; highlight?: boolean; color?: string }> = ({ label, value, highlight, color }) => (
  <div>
    <div style={{ fontSize: '0.67rem', color: 'var(--color-text-muted)', marginBottom: '1px' }}>{label}</div>
    <div style={{ fontWeight: highlight ? 700 : 500, color: color ?? (highlight ? 'var(--color-primary)' : 'var(--color-text)'), fontSize: '0.82rem' }}>{value}</div>
  </div>
);

/* ─── Styles ────────────────────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card-lg)',
  padding: '16px',
  marginBottom: '14px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  fontWeight: 700,
  marginBottom: '14px',
  color: 'var(--color-text)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
