import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { getCloudinaryThumbnail } from '../../lib/imageUpload';
import {
  createSale,
  getLastUsedChannel,
  getSellableItems,
} from '../../lib/salesService';
import type { SaleChannel, SellableItem, SellableVariant } from '../../types/sales';

function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} F CFA`;
}

const CHANNELS: { id: SaleChannel; label: string; icon: string }[] = [
  { id: 'direct', label: 'Direct', icon: '🤝' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'other', label: 'Autre', icon: '📦' },
];

export const FastSale: React.FC = () => {
  const navigate = useNavigate();

  // Données
  const [items, setItems] = useState<SellableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recherche & filtres
  const [searchTerm, setSearchTerm] = useState('');

  // Sélections du parcours
  const [selectedItem, setSelectedItem] = useState<SellableItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SellableVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [soldTotal, setSoldTotal] = useState<string>('');
  const [channel, setChannel] = useState<SaleChannel>(getLastUsedChannel());

  // Détails facultatifs (fermés par défaut)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [soldAtDate, setSoldAtDate] = useState<string>('');
  const [note, setNote] = useState('');

  // Soumission & feedback
  const [submitting, setSubmitting] = useState(false);
  const [successSale, setSuccessSale] = useState<{
    itemName: string;
    variantLabel: string;
    quantity: number;
    amount: number;
    discount: number;
  } | null>(null);

  // Chargement des articles vendables
  const loadSellableData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSellableItems();
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les articles pour la vente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSellableData();
  }, [loadSellableData]);

  // Filtrage des articles par recherche
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.item_name.toLowerCase().includes(term) ||
        item.item_code?.toLowerCase().includes(term) ||
        item.order_reference?.toLowerCase().includes(term) ||
        item.variants.some((v) => v.variant_label.toLowerCase().includes(term))
    );
  }, [items, searchTerm]);

// Retour haptique léger pour caisse mobile tactile (§11)
function triggerHaptic(pattern: number | number[] = 15) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignorer si non supporté sur l'appareil
    }
  }
}

  // Lors de la sélection d'un article
  const handleSelectItem = (item: SellableItem) => {
    triggerHaptic(20);
    setSelectedItem(item);
    // Trouver les variantes en stock
    const inStockVariants = item.variants.filter((v) => v.stock > 0);
    const defaultVariant = inStockVariants[0] || item.variants[0] || null;

    setSelectedVariant(defaultVariant);
    setQuantity(1);

    if (defaultVariant) {
      const price = defaultVariant.effective_price || item.list_price || 0;
      setSoldTotal(String(price));
    } else {
      setSoldTotal(String(item.list_price || 0));
    }
  };

  // Lors de la sélection d'une variante
  const handleSelectVariant = (variant: SellableVariant) => {
    triggerHaptic(20);
    setSelectedVariant(variant);
    const newQty = Math.min(Math.max(1, quantity), Math.max(1, variant.stock));
    setQuantity(newQty);
    setSoldTotal(String((variant.effective_price || selectedItem?.list_price || 0) * newQty));
  };

  // Mise à jour de la quantité
  const handleQuantityChange = (newQty: number) => {
    if (!selectedVariant) return;
    triggerHaptic(15);
    const maxStock = Math.max(1, selectedVariant.stock);
    const validQty = Math.min(Math.max(1, newQty), maxStock);
    setQuantity(validQty);

    const unitPrice = selectedVariant.effective_price || selectedItem?.list_price || 0;
    setSoldTotal(String(unitPrice * validQty));
  };

  // Calcul du prix fixé total théorique
  const theoreticalTotal = useMemo(() => {
    if (!selectedVariant && !selectedItem) return 0;
    const unitPrice = selectedVariant?.effective_price || selectedItem?.list_price || 0;
    return unitPrice * quantity;
  }, [selectedVariant, selectedItem, quantity]);

  // Différence (remise ou supplément)
  const currentTotalNumber = Number(soldTotal) || 0;
  const difference = theoreticalTotal - currentTotalNumber;

  // Raccourcis de remise
  const applyQuickDiscount = (discountAmount: number) => {
    triggerHaptic(20);
    const newTotal = Math.max(0, theoreticalTotal - discountAmount);
    setSoldTotal(String(newTotal));
  };

  // Validation de la vente
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      setError('Hors connexion : impossible d’enregistrer la vente. Vos données sont conservées sur cet écran. Veuillez réessayer dès que la connexion est rétablie.');
      return;
    }
    if (!selectedVariant) {
      setError('Veuillez sélectionner une variante à vendre.');
      return;
    }
    if (selectedVariant.stock < quantity) {
      setError(`Stock insuffisant : seulement ${selectedVariant.stock} pièce(s) disponible(s).`);
      return;
    }
    if (currentTotalNumber <= 0) {
      setError('Le montant encaissé doit être supérieur à 0 F CFA.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let saleDateIso: string | undefined;
      if (soldAtDate) {
        saleDateIso = new Date(soldAtDate).toISOString();
      }

      // Identifiant client UUID pour idempotency et renvoi sans doublon (§11 & §18)
      const clientSaleId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;

      await createSale({
        id: clientSaleId,
        variant_id: selectedVariant.variant_id,
        quantity,
        sold_total: currentTotalNumber,
        channel,
        sold_at: saleDateIso,
        note: note.trim() || null,
      });

      // Vibration succès (triple impulsion douce)
      triggerHaptic([40, 60, 40]);

      // Feedback succès
      setSuccessSale({
        itemName: selectedItem?.item_name || '',
        variantLabel: selectedVariant.variant_label,
        quantity,
        amount: currentTotalNumber,
        discount: difference,
      });

      // Recharger le stock pour les prochaines ventes
      loadSellableData();
    } catch (err: any) {
      setError(err?.message || 'Impossible d’enregistrer la vente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Réinitialiser pour une nouvelle vente rapide
  const handleResetForNewSale = () => {
    setSuccessSale(null);
    setSelectedItem(null);
    setSelectedVariant(null);
    setQuantity(1);
    setSoldTotal('');
    setNote('');
    setSoldAtDate('');
    setShowAdvanced(false);
  };

  return (
    <div
      style={{
        maxWidth: '640px',
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
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '6px',
            }}
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="zadri-logo-label">ENCAISSEMENT RAPIDE</span>
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Zap size={22} color="var(--color-primary)" fill="var(--color-primary)" />
              Vendre
            </h1>
          </div>
        </div>

        <Link
          to="/ventes"
          className="btn-secondary"
          style={{ width: 'auto', minHeight: '36px', padding: '0 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-pill)' }}
        >
          <FileText size={15} /> Journal
        </Link>
      </header>

      {/* ── Alerte d'erreur ────────────────────────────────────────────── */}
      {error && (
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-card-sm)',
            marginBottom: '16px',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>{error}</div>
        </div>
      )}

      {/* ── Modal / Écran Succès ──────────────────────────────────────── */}
      {successSale && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-primary)',
            borderRadius: 'var(--radius-card)',
            padding: '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <CheckCircle size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px' }}>
            Vente enregistrée !
          </h2>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '8px' }}>
            {formatFCFA(successSale.amount)}
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
            {successSale.quantity} × {successSale.itemName} ({successSale.variantLabel})
            {successSale.discount > 0 && (
              <span style={{ display: 'block', color: 'var(--color-warning)', fontWeight: 600, marginTop: '4px' }}>
                Remise accordée : {formatFCFA(successSale.discount)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleResetForNewSale}
              className="btn-primary"
              style={{ width: 'auto', minHeight: '42px', padding: '0 20px' }}
            >
              <Plus size={18} /> Nouvelle vente
            </button>
            <Link
              to="/ventes"
              className="btn-secondary"
              style={{ width: 'auto', minHeight: '42px', padding: '0 16px' }}
            >
              Voir le journal
            </Link>
          </div>
        </div>
      )}

      {/* ── Formulaire de Vente ───────────────────────────────────────── */}
      {!successSale && (
        <form onSubmit={handleSubmitSale} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Étape 1 : Choisir l'article */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: selectedItem ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Choisir l'article</span>
              </div>

              {selectedItem && (
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Changer
                </button>
              )}
            </div>

            {/* Si un article est déjà sélectionné : vue résumée compacte */}
            {selectedItem ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-card-sm)',
                  border: '1px solid var(--color-primary)',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: 'var(--radius-card-sm)',
                    overflow: 'hidden',
                    background: 'var(--color-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {selectedItem.photo_url ? (
                    <img
                      src={getCloudinaryThumbnail(selectedItem.photo_url, 100) ?? selectedItem.photo_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ShoppingBag size={20} color="var(--color-text-muted)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedItem.item_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {selectedItem.order_reference} · Prix fixé : {formatFCFA(selectedItem.list_price)} · Stock dispo : {selectedItem.total_stock}
                  </div>
                </div>
              </div>
            ) : (
              /* Sélecteur d'article : recherche et liste/grille */
              <div>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <Search
                    size={17}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '38px', height: '42px', fontSize: '0.88rem' }}
                    placeholder="Rechercher par nom, code, commande..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                    <div className="spinner" style={{ width: '28px', height: '28px' }} />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Aucun article trouvé avec du stock disponible.
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: '260px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingRight: '4px',
                    }}
                  >
                    {filteredItems.map((item) => {
                      const isOutOfStock = item.total_stock <= 0;
                      return (
                        <div
                          key={item.item_id}
                          onClick={() => !isOutOfStock && handleSelectItem(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-card-sm)',
                            border: '1px solid var(--color-border)',
                            background: isOutOfStock ? 'rgba(0,0,0,0.02)' : 'var(--color-surface)',
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            opacity: isOutOfStock ? 0.5 : 1,
                            transition: 'all var(--transition-fast)',
                          }}
                        >
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
                            {item.photo_url ? (
                              <img
                                src={getCloudinaryThumbnail(item.photo_url, 90) ?? item.photo_url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <ShoppingBag size={18} color="var(--color-text-muted)" />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.item_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                              {item.order_reference} · {formatFCFA(item.list_price)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-pill)',
                                background: isOutOfStock ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: isOutOfStock ? 'var(--color-danger)' : 'var(--color-primary)',
                              }}
                            >
                              {item.total_stock} en stock
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Si article choisi : Afficher les étapes suivantes */}
          {selectedItem && (
            <>
              {/* Étape 2 : Choix de la variante */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    2
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Choisir la variante</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedItem.variants.map((v) => {
                    const isSelected = selectedVariant?.variant_id === v.variant_id;
                    const isOut = v.stock <= 0;
                    return (
                      <button
                        key={v.variant_id}
                        type="button"
                        disabled={isOut}
                        onClick={() => handleSelectVariant(v)}
                        style={{
                          flex: '1 1 calc(50% - 4px)',
                          minWidth: '130px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-card-sm)',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-surface-alt)',
                          cursor: isOut ? 'not-allowed' : 'pointer',
                          opacity: isOut ? 0.4 : 1,
                          textAlign: 'left',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                            {v.variant_label}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Stock : <strong>{v.stock}</strong>
                            {v.effective_price !== selectedItem.list_price && ` · ${formatFCFA(v.effective_price)}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Étape 3 & 4 : Quantité et Prix encaissé */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    3
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Quantité & Prix encaissé</span>
                </div>

                {/* Sélecteur de quantité tactile */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Quantité vendue</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => handleQuantityChange(quantity - 1)}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-card-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-alt)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                        color: 'var(--color-text)',
                      }}
                      aria-label="Diminuer quantité"
                    >
                      <Minus size={18} />
                    </button>

                    <div
                      style={{
                        flex: 1,
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-surface-alt)',
                        borderRadius: 'var(--radius-card-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {quantity}
                    </div>

                    <button
                      type="button"
                      disabled={!selectedVariant || quantity >= selectedVariant.stock}
                      onClick={() => handleQuantityChange(quantity + 1)}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-card-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-alt)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (!selectedVariant || quantity >= selectedVariant.stock) ? 'not-allowed' : 'pointer',
                        color: 'var(--color-text)',
                      }}
                      aria-label="Augmenter quantité"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {selectedVariant && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: 'center' }}>
                      Max disponible : {selectedVariant.stock} pièce(s)
                    </div>
                  )}
                </div>

                {/* Saisie Prix encaissé direct */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', margin: 0 }}>
                      Montant réellement encaissé (F CFA)
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                      Prix fixé : {formatFCFA(theoreticalTotal)}
                    </span>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      required
                      min={1}
                      className="form-input"
                      style={{
                        height: '48px',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        paddingRight: '60px',
                      }}
                      value={soldTotal}
                      onChange={(e) => setSoldTotal(e.target.value)}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      F CFA
                    </span>
                  </div>
                </div>

                {/* Raccourcis de remise instantanée */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => applyQuickDiscount(0)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--color-border)',
                      background: difference === 0 ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                      color: difference === 0 ? '#fff' : 'var(--color-text)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Prix exact
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDiscount(500)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--color-border)',
                      background: difference === 500 ? 'var(--color-warning)' : 'var(--color-surface-alt)',
                      color: difference === 500 ? '#fff' : 'var(--color-text)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    -500 F
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDiscount(1000)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--color-border)',
                      background: difference === 1000 ? 'var(--color-warning)' : 'var(--color-surface-alt)',
                      color: difference === 1000 ? '#fff' : 'var(--color-text)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    -1 000 F
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDiscount(2000)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--color-border)',
                      background: difference === 2000 ? 'var(--color-warning)' : 'var(--color-surface-alt)',
                      color: difference === 2000 ? '#fff' : 'var(--color-text)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    -2 000 F
                  </button>
                </div>

                {/* Écart en direct (§9.4) */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-card-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor:
                      difference > 0
                        ? 'rgba(245, 158, 11, 0.12)'
                        : difference < 0
                        ? 'rgba(59, 130, 246, 0.12)'
                        : 'rgba(16, 185, 129, 0.12)',
                    color:
                      difference > 0
                        ? 'var(--color-warning)'
                        : difference < 0
                        ? '#3b82f6'
                        : 'var(--color-primary)',
                  }}
                >
                  <span>
                    {difference > 0
                      ? `🎁 Remise accordée : ${formatFCFA(difference)}`
                      : difference < 0
                      ? `➕ Supplément client : ${formatFCFA(Math.abs(difference))}`
                      : '✔ Vente au prix fixé'}
                  </span>
                  {theoreticalTotal > 0 && difference !== 0 && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                      ({Math.round((difference / theoreticalTotal) * 100)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Étape 5 : Canal de vente */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    4
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Canal de vente</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {CHANNELS.map((ch) => {
                    const isSelected = channel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setChannel(ch.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '10px 4px',
                          borderRadius: 'var(--radius-card-sm)',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface-alt)',
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{ch.icon}</span>
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optionnel : Date et note (repliable) */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '12px 16px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAdvanced((p) => !p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '4px 0',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} /> Date personnalisée ou note facultative
                  </span>
                  <span>{showAdvanced ? '▲' : '▼'}</span>
                </button>

                {showAdvanced && (
                  <div style={{ paddingTop: '14px', borderTop: '1px solid var(--color-border)', marginTop: '8px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Date et heure de vente</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={soldAtDate}
                        onChange={(e) => setSoldAtDate(e.target.value)}
                      />
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                        Laissez vide pour horodater à l'instant présent.
                      </div>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Note interne (facultative)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex. Client fidèle, remise négociée..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton de validation tactile principal */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{
                  height: '52px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-sell-btn)',
                  marginTop: '6px',
                }}
              >
                {submitting ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner" style={{ width: '20px', height: '20px' }} />
                    Enregistrement...
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={20} />
                    Valider l'encaissement ({formatFCFA(currentTotalNumber)})
                  </div>
                )}
              </button>
            </>
          )}
        </form>
      )}

      {/* Barre de navigation mobile inférieure */}
      <BottomNav />
    </div>
  );
};
