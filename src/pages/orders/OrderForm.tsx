import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Save, Calculator } from 'lucide-react';
import {
  createOrder,
  updateOrder,
  getOrderDetail,
  suggestNextReference,
} from '../../lib/ordersService';
import type { OrderOrigin, OrderStatus } from '../../types/orders';
import { ORIGIN_CONFIG, STATUS_CONFIG, formatFCFA } from '../../types/orders';

export const OrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  // États du formulaire
  const [origin, setOrigin] = useState<OrderOrigin>('Chine');
  const [customOrigin, setCustomOrigin] = useState('');
  const [reference, setReference] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number | ''>('');
  const [forwarderFee, setForwarderFee] = useState<number | ''>(0);
  const [weightKg, setWeightKg] = useState<string>('');
  const [status, setStatus] = useState<OrderStatus>('ordered');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // États UI
  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Suggestion de référence automatique au changement d'origine (en mode création)
  useEffect(() => {
    if (!isEditing) {
      suggestNextReference(origin).then((suggested) => {
        setReference(suggested);
      });
    }
  }, [origin, isEditing]);

  // Chargement des données si mode édition
  useEffect(() => {
    if (isEditing && id) {
      setLoadingInitial(true);
      getOrderDetail(id)
        .then(({ order }) => {
          const matchedOrigin = ['Chine', 'Local', 'Dubaï', 'Turquie'].includes(order.origin || '')
            ? (order.origin as OrderOrigin)
            : 'Autre';

          setOrigin(matchedOrigin);
          if (matchedOrigin === 'Autre') {
            setCustomOrigin(order.origin || '');
          }

          setReference(order.reference);
          setOrderDate(order.order_date);
          setSupplier(order.supplier);
          setDescription(order.description || '');
          setPurchaseAmount(order.purchase_amount);
          setForwarderFee(order.forwarder_fee);
          setWeightKg(order.weight_kg !== null ? String(order.weight_kg) : '');
          setStatus(order.status);
          if (order.received_date) {
            setReceivedDate(order.received_date);
          }
          // Nettoyage du tag [Origine: ...] dans le champ notes affiché
          const cleanNotes = (order.notes || '').replace(/\[Origine:\s*[^\]]+\]/gi, '').trim();
          setNotes(cleanNotes);
        })
        .catch((err) => {
          console.error(err);
          setErrorMessage(err.message || 'Impossible de charger la commande.');
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    }
  }, [id, isEditing]);

  // Calcul du coût total en temps réel
  const numPurchase = typeof purchaseAmount === 'number' ? purchaseAmount : 0;
  const numTransport = typeof forwarderFee === 'number' ? forwarderFee : 0;
  const liveTotalCost = Math.max(0, numPurchase + numTransport);

  // Configuration selon l'origine
  const currentOriginConfig = ORIGIN_CONFIG[origin] || ORIGIN_CONFIG.Autre;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validations
    if (!supplier.trim()) {
      setErrorMessage('Le nom du fournisseur est obligatoire.');
      return;
    }

    if (purchaseAmount === '' || numPurchase < 0) {
      setErrorMessage('Le montant d’achat doit être un nombre positif ou nul.');
      return;
    }

    if (numTransport < 0) {
      setErrorMessage('Les frais de transport ne peuvent pas être négatifs.');
      return;
    }

    if (status === 'received' && !receivedDate) {
      setErrorMessage('La date de réception est obligatoire pour une commande marquée comme "Reçue".');
      return;
    }

    const finalOrigin = origin === 'Autre' && customOrigin.trim() ? customOrigin.trim() : origin;

    try {
      setSubmitting(true);

      if (isEditing && id) {
        await updateOrder(id, {
          reference: reference.trim() || undefined,
          supplier: supplier.trim(),
          origin: finalOrigin,
          order_date: orderDate,
          description: description.trim() || undefined,
          purchase_amount: numPurchase,
          forwarder_fee: numTransport,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          status,
          received_date: status === 'received' ? receivedDate : null,
          notes: notes.trim(),
        });
        navigate(`/commandes/${id}`);
      } else {
        const created = await createOrder({
          reference: reference.trim() || undefined,
          supplier: supplier.trim(),
          origin: finalOrigin,
          order_date: orderDate,
          description: description.trim() || undefined,
          purchase_amount: numPurchase,
          forwarder_fee: numTransport,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          status,
          received_date: status === 'received' ? receivedDate : null,
          notes: notes.trim(),
        });
        navigate(`/commandes/${created.id}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de l’enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center', padding: '20px' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Chargement de la commande…</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: '16px 16px 60px',
    }}>
      {/* ── En-tête avec bouton retour ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '50%',
          }}
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <span className="zadri-logo-label">ZADRI LUXE</span>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text)', margin: '2px 0 0' }}>
            {isEditing ? `Modifier ${reference}` : 'Nouvelle commande'}
          </h1>
        </div>
      </div>

      {/* ── Message d'erreur ──────────────────────────────────────────────── */}
      {errorMessage && (
        <div style={{
          backgroundColor: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-card-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          color: 'var(--color-danger)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Section 1 : Provenance & Référence ───────────────────────────── */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text)', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Provenance de la commande
          </label>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
            gap: '8px',
            marginBottom: origin === 'Autre' ? '12px' : '16px',
          }}>
            {(['Chine', 'Local', 'Dubaï', 'Turquie', 'Autre'] as const).map((item) => {
              const isSelected = origin === item;
              const cfg = ORIGIN_CONFIG[item];

              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => setOrigin(item)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '10px 6px',
                    borderRadius: 'var(--radius-card-md)',
                    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: isSelected ? 'rgba(var(--color-primary-rgb), 0.12)' : 'var(--color-surface-alt)',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 700 : 500 }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {origin === 'Autre' && (
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Préciser la provenance (ex: Sénégal, France...)"
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
                className="zadri-input"
                style={{ fontSize: '0.85rem', height: '40px' }}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Référence
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={currentOriginConfig.defaultPrefix + '001'}
                className="zadri-input"
                style={{ fontWeight: 700, letterSpacing: '0.04em' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Date de commande
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="zadri-input"
                required
              />
            </div>
          </div>
        </div>

        {/* ── Section 2 : Fournisseur & Description ────────────────────────── */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
              Fournisseur / Boutique / Atelier <span style={{ color: 'var(--color-accent)' }}>*</span>
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Ex: Usine Guangzhou, Fournisseur Adjamé, Grossiste Deira…"
              className="zadri-input"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Description générale (facultative)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Lot de montres automatiques et bracelets cuir"
              className="zadri-input"
            />
          </div>
        </div>

        {/* ── Section 3 : Coûts financiers & Calcul en direct ───────────────── */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Calculator size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Investissement financier (FCFA)
            </h3>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
              Montant d'achat de la marchandise (FCFA) <span style={{ color: 'var(--color-accent)' }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="Ex: 400 000"
              className="zadri-input"
              style={{ fontSize: '1.05rem', fontWeight: 700 }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: origin === 'Local' ? '1fr' : '1.4fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                {currentOriginConfig.transportLabel}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={forwarderFee}
                onChange={(e) => setForwarderFee(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
                className="zadri-input"
              />
            </div>

            {origin !== 'Local' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Poids (kg facultatif)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Ex: 5.5"
                  className="zadri-input"
                />
              </div>
            )}
          </div>

          {/* Badge Coût Total en direct */}
          <div style={{
            backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
            border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
            borderRadius: 'var(--radius-card-md)',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Coût Total Réel (Achat + Transport)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {formatFCFA(numPurchase)} + {formatFCFA(numTransport)}
              </div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatFCFA(liveTotalCost)}
            </div>
          </div>
        </div>

        {/* ── Section 4 : Statut & Réception ───────────────────────────────── */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text)', marginBottom: '8px', letterSpacing: '0.04em' }}>
            Statut de la commande
          </label>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: status === 'received' ? '14px' : '0',
          }}>
            {(['ordered', 'shipping', 'received'] as const).map((st) => {
              const isSelected = status === st;
              const cfg = STATUS_CONFIG[st];

              return (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatus(st)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-card-md)',
                    border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--color-border)',
                    backgroundColor: isSelected ? cfg.bg : 'var(--color-surface-alt)',
                    color: isSelected ? cfg.color : 'var(--color-text)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {status === 'received' && (
            <div className="animate-fade-in" style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px dashed var(--color-border)',
            }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                Date de réception de la marchandise <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="zadri-input"
                required={status === 'received'}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Cette date servira de point de départ pour calculer l'ancienneté des articles en stock.
              </p>
            </div>
          )}
        </div>

        {/* ── Section 5 : Notes ────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card-lg)',
          padding: '16px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            Notes & remarques (transitaire, détails de paiement…)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informations utiles pour vous et votre associé…"
            className="zadri-input"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* ── Actions de validation ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={submitting}
          >
            Annuler
          </button>

          <button
            type="submit"
            className="btn-primary"
            style={{ flex: 2, justifyContent: 'center', gap: '8px' }}
            disabled={submitting}
          >
            {submitting ? (
              <div className="spinner spinner-light" style={{ width: '1.2rem', height: '1.2rem' }} />
            ) : (
              <>
                <Save size={18} />
                <span>{isEditing ? 'Enregistrer les modifications' : 'Créer la commande'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
