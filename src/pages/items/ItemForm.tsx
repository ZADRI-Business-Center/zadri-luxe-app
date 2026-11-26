import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import {
  getCloudinaryThumbnail,
  isCloudinaryConfigured,
  uploadImage,
} from '../../lib/imageUpload';
import {
  createCategory,
  createItem,
  getCategories,
  getItemDetail,
  getReceivedOrders,
  updateItem,
} from '../../lib/itemsService';
import { formatFCFA } from '../../types/orders';
import type { Category, ReceivedOrderOption, VariantPayload } from '../../types/items';
import { useToast } from '../../contexts/ToastContext';
import { formatErrorMessage } from '../../lib/errorUtils';

/* ─── helpers ────────────────────────────────────────────────────────────── */
function parseFCFA(raw: string): number {
  return Math.max(0, parseInt(raw.replace(/\s/g, ''), 10) || 0);
}

function fmtInput(value: number | null): string {
  if (value === null || value === 0) return '';
  return value.toString();
}

interface VariantDraft extends VariantPayload {
  _key: string;
  _photoFile?: File;
  _photoPreview?: string;
  _uploadingPhoto?: boolean;
}

function newVariant(): VariantDraft {
  return {
    _key: crypto.randomUUID(),
    label: '',
    quantity_received: 0,
    quantity_damaged: 0,
    quantity_ordered: null,
    price_override: null,
    photo_url: null,
    photo_public_id: null,
  };
}

/* ─── composant ─────────────────────────────────────────────────────────── */
export const ItemForm: React.FC = () => {
  const navigate = useNavigate();
  const { id: itemId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const isEdit = Boolean(itemId);

  // orderId pré-sélectionné depuis la query string ?orderId=...
  const preselectedOrderId = searchParams.get('orderId') ?? '';

  /* ── chargement des listes ────────────────────────────────────────────── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<ReceivedOrderOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  /* ── état du formulaire article ───────────────────────────────────────── */
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [orderId, setOrderId] = useState(preselectedOrderId); // pré-sélectionné si venu d'une commande
  const [listPrice, setListPrice] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [description, setDescription] = useState('');

  /* ── photo principale ────────────────────────────────────────────────── */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPublicId, setPhotoPublicId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* ── variantes ───────────────────────────────────────────────────────── */
  const [variants, setVariants] = useState<VariantDraft[]>([newVariant()]);

  /* ── catégorie rapide ────────────────────────────────────────────────── */
  const [addingCat, setAddingCat] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  /* ── soumission ──────────────────────────────────────────────────────── */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* ── chargement initial ──────────────────────────────────────────────── */
  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    setMetaError(null);
    try {
      const [cats, ords] = await Promise.all([getCategories(), getReceivedOrders()]);
      setCategories(cats);
      setOrders(ords);

      if (isEdit && itemId) {
        const detail = await getItemDetail(itemId);
        const item = detail.item;
        setName(item.item_name);
        setCategoryId(item.category_id ?? '');
        if (item.category_id) {
          const matchedCat = cats.find((c) => c.id === item.category_id);
          if (matchedCat) setCategorySearch(matchedCat.name);
        }
        setOrderId(item.order_id);
        setListPrice(fmtInput(item.list_price));
        setUnitCost(fmtInput(item.unit_cost));
        setDescription(item.description ?? '');
        setPhotoUrl(item.photo_url);
        setPhotoPublicId(item.photo_public_id ?? null);
        if (item.photo_url) setPhotoPreview(getCloudinaryThumbnail(item.photo_url, 400));

        const draftVariants: VariantDraft[] = detail.variants.map((v) => ({
          _key: v.id,
          id: v.id,
          label: v.label,
          quantity_received: v.quantity_received,
          quantity_damaged: v.quantity_damaged,
          quantity_ordered: v.quantity_ordered,
          price_override: v.price_override,
          photo_url: v.photo_url,
          photo_public_id: v.photo_public_id,
          _photoPreview: v.photo_url ? getCloudinaryThumbnail(v.photo_url, 200) ?? undefined : undefined,
        }));
        setVariants(draftVariants.length > 0 ? draftVariants : [newVariant()]);
      }
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Impossible de charger les données.');
    } finally {
      setLoadingMeta(false);
    }
  }, [isEdit, itemId]);

  useEffect(() => { void loadMeta(); }, [loadMeta]);

  // Fermer le menu déroulant des catégories quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── gestion photo principale ─────────────────────────────────────────── */
  const handlePhotoChange = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setPhotoFile(file);

    if (!isCloudinaryConfigured()) return; // on enverra à la soumission
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadImage(file);
      setPhotoUrl(uploaded.url);
      setPhotoPublicId(uploaded.publicId);
      setPhotoFile(null);
    } catch {
      // on tentera à nouveau lors de la soumission
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* ── gestion photo variante ──────────────────────────────────────────── */
  const handleVariantPhotoChange = async (key: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setVariants((prev) =>
      prev.map((v) =>
        v._key === key
          ? { ...v, _photoFile: file, _photoPreview: preview, _uploadingPhoto: true }
          : v,
      ),
    );

    if (!isCloudinaryConfigured()) {
      setVariants((prev) =>
        prev.map((v) =>
          v._key === key ? { ...v, _uploadingPhoto: false } : v,
        ),
      );
      return;
    }

    try {
      const uploaded = await uploadImage(file);
      setVariants((prev) =>
        prev.map((v) =>
          v._key === key
            ? {
                ...v,
                photo_url: uploaded.url,
                photo_public_id: uploaded.publicId,
                _photoFile: undefined,
                _uploadingPhoto: false,
              }
            : v,
        ),
      );
    } catch {
      setVariants((prev) =>
        prev.map((v) => (v._key === key ? { ...v, _uploadingPhoto: false } : v)),
      );
    }
  };

  /* ── ajout / suppression de variante ─────────────────────────────────── */
  const addVariant = () => setVariants((prev) => [...prev, newVariant()]);
  const removeVariant = (key: string) =>
    setVariants((prev) => (prev.length > 1 ? prev.filter((v) => v._key !== key) : prev));

  const updateVariantField = <K extends keyof VariantDraft>(
    key: string,
    field: K,
    value: VariantDraft[K],
  ) => setVariants((prev) => prev.map((v) => (v._key === key ? { ...v, [field]: value } : v)));

  /* ── créer catégorie rapide ───────────────────────────────────────────── */
  const handleCreateCategory = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) return;
    setAddingCat(true);
    try {
      const cat = await createCategory(trimmed);
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(cat.id);
      setCategorySearch(cat.name);
      setShowCategoryDropdown(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer la catégorie.');
    } finally {
      setAddingCat(false);
    }
  };

  /* ── soumission ──────────────────────────────────────────────────────── */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Validations rapides
    if (!name.trim()) {
      const msg = 'Le nom de l\'article est obligatoire.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!orderId) {
      const msg = 'Veuillez sélectionner une commande d\'origine.';
      setError(msg);
      toast.error(msg);
      return;
    }
    const price = parseFCFA(listPrice);
    if (price <= 0) {
      const msg = 'Le prix fixé doit être supérieur à 0.';
      setError(msg);
      toast.error(msg);
      return;
    }

    for (const v of variants) {
      if (!v.label.trim()) {
        const msg = 'Chaque variante doit avoir un libellé.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (v.quantity_damaged > v.quantity_received) {
        const msg = `La quantité abîmée de la variante "${v.label}" dépasse la quantité reçue.`;
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setSaving(true);
    try {
      // Upload photo principale si elle n'a pas encore été uploadée
      let finalPhotoUrl = photoUrl;
      let finalPhotoPublicId = photoPublicId;
      if (photoFile && isCloudinaryConfigured()) {
        const uploaded = await uploadImage(photoFile);
        finalPhotoUrl = uploaded.url;
        finalPhotoPublicId = uploaded.publicId;
      }

      // Upload photos variantes non encore uploadées
      const finalVariants: VariantPayload[] = await Promise.all(
        variants.map(async (v) => {
          let vPhotoUrl = v.photo_url ?? null;
          let vPhotoPublicId = v.photo_public_id ?? null;
          if (v._photoFile && isCloudinaryConfigured()) {
            const uploaded = await uploadImage(v._photoFile);
            vPhotoUrl = uploaded.url;
            vPhotoPublicId = uploaded.publicId;
          }
          return {
            id: v.id,
            label: v.label.trim() || 'Unique',
            quantity_received: v.quantity_received,
            quantity_damaged: v.quantity_damaged,
            quantity_ordered: v.quantity_ordered ?? null,
            price_override: v.price_override ?? null,
            photo_url: vPhotoUrl,
            photo_public_id: vPhotoPublicId,
          };
        }),
      );

      const cost = parseFCFA(unitCost);

      if (isEdit && itemId) {
        await updateItem({
          item_id: itemId,
          name: name.trim(),
          list_price: price,
          unit_cost: cost > 0 ? cost : null,
          category_id: categoryId || null,
          description: description.trim() || null,
          photo_url: finalPhotoUrl,
          photo_public_id: finalPhotoPublicId,
          variants: finalVariants,
        });
        setSuccess(true);
        toast.success('Article mis à jour avec succès !');
        setTimeout(() => navigate(`/articles/${itemId}`), 1000);
      } else {
        const newItemId = await createItem({
          order_id: orderId,
          name: name.trim(),
          list_price: price,
          unit_cost: cost > 0 ? cost : null,
          category_id: categoryId || null,
          description: description.trim() || null,
          photo_url: finalPhotoUrl,
          photo_public_id: finalPhotoPublicId,
          variants: finalVariants,
        });
        setSuccess(true);
        toast.success('Article créé avec succès !');
        // Si on vient d'une commande (preselectedOrderId), retourner à la commande après sauvegarde
        const redirectTarget = preselectedOrderId
          ? `/commandes/${preselectedOrderId}`
          : `/articles/${newItemId}`;
        setTimeout(() => navigate(redirectTarget), 1000);
      }
    } catch (err) {
      const friendlyMsg = formatErrorMessage(err, 'Une erreur est survenue lors de l\'enregistrement.');
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setSaving(false);
    }
  };

  /* ─── rendu ──────────────────────────────────────────────────────────── */
  if (loadingMeta) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner spinner-dark" style={{ width: '2rem', height: '2rem' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Chargement…</p>
        <BottomNav />
      </div>
    );
  }

  if (metaError) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '16px 16px 90px' }}>
        <div className="alert-box alert-danger">
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>{metaError}</div>
          <button className="btn-link" onClick={() => void loadMeta()}><RefreshCw size={15} /> Réessayer</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const totalCost = parseFCFA(listPrice);
  const cost = parseFCFA(unitCost);
  const margin = cost > 0 ? totalCost - cost : null;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '16px 16px 90px', width: '100%' }}>
      {/* En-tête */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link to={isEdit ? `/articles/${itemId}` : '/articles'} style={{ color: 'var(--color-text-muted)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </Link>
        <div style={{ flex: 1 }}>
          <span className="zadri-logo-label">ZADRI LUXE</span>
          <h1 style={{ fontSize: '1.35rem', marginTop: '2px' }}>
            {isEdit ? 'Modifier l\'article' : 'Nouvel article'}
          </h1>
        </div>
      </header>

      {/* Alerte succès */}
      {success && (
        <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>
          <CheckCircle size={18} />
          <span>{isEdit ? 'Article mis à jour !' : 'Article créé avec succès !'}</span>
        </div>
      )}

      {/* Alerte erreur */}
      {error && (
        <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>{error}</div>
          <button className="btn-link" onClick={() => setError(null)}><X size={15} /></button>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>

        {/* ── Section : Informations principales ─────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Informations de l'article</h2>

          {/* Photo principale */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Photo principale</label>
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: '100%',
                height: '200px',
                borderRadius: 'var(--radius-card-lg)',
                border: '2px dashed var(--color-border)',
                background: 'var(--color-surface-alt)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Aperçu"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {uploadingPhoto && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="spinner" />
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.55)', borderRadius: 'var(--radius-pill)', padding: '6px 10px', color: '#fff', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Camera size={13} /> Changer
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <ImageIcon size={36} style={{ marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.83rem' }}>Toucher pour ajouter une photo</p>
                </div>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePhotoChange(file);
              }}
            />
            {!isCloudinaryConfigured() && (
              <p style={{ fontSize: '0.72rem', color: 'var(--color-accent)', marginTop: '5px' }}>
                ⚠ Cloudinary non configuré — la photo sera ignorée.
              </p>
            )}
          </div>

          {/* Nom */}
          <div className="form-group">
            <label className="form-label" htmlFor="item-name">Nom de l'article *</label>
            <input
              id="item-name"
              className="zadri-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Montre Z01"
              required
              autoComplete="off"
            />
          </div>

          {/* Commande d'origine (désactivée en mode édition ou si pré-sélectionnée) */}
          <div className="form-group">
            <label className="form-label" htmlFor="item-order">Commande d'origine *</label>
            {isEdit || preselectedOrderId ? (
              <div
                className="zadri-input"
                style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--color-surface-alt)' }}
              >
                {orders.find((o) => o.id === orderId)?.reference ?? orderId}
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '8px' }}>(non modifiable)</span>
              </div>
            ) : (
              <select
                id="item-order"
                className="zadri-input"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              >
                <option value="">— Sélectionner une commande reçue —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.reference} · {o.supplier}
                    {o.received_date ? ` (reçue le ${new Date(o.received_date).toLocaleDateString('fr-FR')})` : ''}
                  </option>
                ))}
              </select>
            )}
            {orders.length === 0 && !isEdit && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginTop: '4px' }}>
                Aucune commande reçue. Passez d'abord une commande au statut « Reçue ».
              </p>
            )}
          </div>

          {/* Catégorie avec autocomplétion et création à la volée */}
          <div className="form-group" ref={categoryWrapperRef} style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="item-category">Catégorie</label>
            <div style={{ position: 'relative' }}>
              <input
                id="item-category"
                className="zadri-input"
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategorySearch(val);
                  setShowCategoryDropdown(true);
                  const exact = categories.find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
                  setCategoryId(exact ? exact.id : '');
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                placeholder="Tapez pour chercher ou créer une catégorie…"
                autoComplete="off"
                style={{ paddingRight: categoryId || categorySearch ? '40px' : '14px' }}
              />
              {(categoryId || categorySearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setCategorySearch('');
                    setCategoryId('');
                    setShowCategoryDropdown(false);
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label="Effacer la catégorie"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Menu suggestions & création */}
            {showCategoryDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card-md)',
                  boxShadow: 'var(--shadow-nav)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 50,
                }}
              >
                {/* Liste filtrée */}
                {categories
                  .filter((c) => c.name.toLowerCase().includes(categorySearch.trim().toLowerCase()))
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(c.id);
                        setCategorySearch(c.name);
                        setShowCategoryDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        background: categoryId === c.id ? 'var(--color-surface-alt)' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{c.name}</span>
                      {categoryId === c.id && <CheckCircle size={14} color="var(--color-primary)" />}
                    </button>
                  ))}

                {/* Option créer si introuvable */}
                {categorySearch.trim() &&
                  !categories.some((c) => c.name.toLowerCase() === categorySearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      disabled={addingCat}
                      onClick={() => void handleCreateCategory(categorySearch)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '11px 14px',
                        background: 'rgba(var(--color-primary-rgb, 197, 160, 89), 0.1)',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Plus size={16} />
                      <span>
                        {addingCat
                          ? 'Création en cours…'
                          : `Créer la catégorie « ${categorySearch.trim()} »`}
                      </span>
                    </button>
                  )}

                {categorySearch.trim() === '' && categories.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Tapez un nom pour créer la première catégorie.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prix de vente & Coût d'achat unitaire */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="item-price">Prix de vente client (FCFA) *</label>
              <input
                id="item-price"
                className="zadri-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="ex. 30000"
                required
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Prix affiché et payé par le client
              </p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="item-cost">Prix de revient unitaire (FCFA)</label>
              <input
                id="item-cost"
                className="zadri-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Facultatif"
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Ce que vous a coûté l'article (achat)
              </p>
            </div>
          </div>

          {/* Aperçu marge */}
          {totalCost > 0 && (
            <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-card-sm)', fontSize: '0.83rem', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>Prix fixé : <strong>{formatFCFA(totalCost)}</strong></span>
              {margin !== null && (
                <span style={{ color: margin >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                  Marge unitaire : <strong>{formatFCFA(margin)}</strong>
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label" htmlFor="item-desc">Description (facultative)</label>
            <textarea
              id="item-desc"
              className="zadri-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes sur l'article…"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
        </section>

        {/* ── Section : Variantes ────────────────────────────────────────── */}
        <section style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={sectionTitleStyle}>Variantes</h2>
            <button
              type="button"
              className="btn-primary"
              style={{ width: 'auto', padding: '0 14px', minHeight: '38px', fontSize: '0.83rem' }}
              onClick={addVariant}
            >
              <Plus size={15} /> Ajouter
            </button>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '16px', marginTop: '-10px' }}>
            Sans variante saisie, une variante « Unique » sera créée automatiquement. Le stock se gère toujours par variante.
          </p>

          {variants.map((variant, index) => (
            <VariantCard
              key={variant._key}
              variant={variant}
              index={index}
              canDelete={variants.length > 1}
              itemListPrice={parseFCFA(listPrice)}
              onRemove={() => removeVariant(variant._key)}
              onUpdate={(field, value) => updateVariantField(variant._key, field, value)}
              onPhotoChange={(file) => void handleVariantPhotoChange(variant._key, file)}
            />
          ))}
        </section>

        {/* ── Boutons de soumission ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <Link
            to={isEdit ? `/articles/${itemId}` : '/articles'}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="btn-primary"
            style={{ flex: 2 }}
            disabled={saving || success}
          >
            {saving ? (
              <><div className="spinner" /> Enregistrement…</>
            ) : success ? (
              <><CheckCircle size={17} /> Enregistré !</>
            ) : (
              <><Save size={17} /> {isEdit ? 'Mettre à jour' : 'Créer l\'article'}</>
            )}
          </button>
        </div>
      </form>

      <BottomNav />
    </div>
  );
};

/* ─── Carte d'une variante ───────────────────────────────────────────────── */
interface VariantCardProps {
  variant: VariantDraft;
  index: number;
  canDelete: boolean;
  itemListPrice: number;
  onRemove: () => void;
  onUpdate: <K extends keyof VariantDraft>(field: K, value: VariantDraft[K]) => void;
  onPhotoChange: (file: File) => void;
}

const VariantCard: React.FC<VariantCardProps> = ({
  variant, index, canDelete, itemListPrice, onRemove, onUpdate, onPhotoChange,
}) => {
  const [expanded, setExpanded] = useState(index === 0);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const effectivePrice = variant.price_override ?? itemListPrice;

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card-lg)',
      marginBottom: '12px',
      overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      {/* En-tête variante */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer', background: expanded ? 'var(--color-surface-alt)' : undefined }}
        onClick={() => setExpanded((p) => !p)}
      >
        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-card-sm)', background: 'var(--color-bg)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {variant._photoPreview || variant.photo_url ? (
            <img src={variant._photoPreview ?? getCloudinaryThumbnail(variant.photo_url, 80) ?? ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <ImageIcon size={18} color="var(--color-text-muted)" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {variant.label.trim() || `Variante ${index + 1}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Reçu : {variant.quantity_received} · Stock potentiel : {Math.max(0, variant.quantity_received - variant.quantity_damaged)}
            {variant.price_override ? ` · ${formatFCFA(variant.price_override)}` : ''}
          </div>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '4px', display: 'flex' }}
            title="Supprimer cette variante"
          >
            <Trash2 size={16} />
          </button>
        )}
        <span style={{ color: 'var(--color-text-muted)', display: 'flex' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>

      {/* Corps variante */}
      {expanded && (
        <div style={{ padding: '14px', borderTop: '1px solid var(--color-border)' }}>
          {/* Photo variante */}
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '0.74rem' }}>Photo spécifique (facultative)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: 'var(--radius-card-sm)',
                  border: '1.5px dashed var(--color-border)',
                  background: 'var(--color-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {variant._photoPreview || variant.photo_url ? (
                  <>
                    <img
                      src={variant._photoPreview ?? getCloudinaryThumbnail(variant.photo_url, 80) ?? ''}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {variant._uploadingPhoto && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px' }} />
                      </div>
                    )}
                  </>
                ) : (
                  <Camera size={20} color="var(--color-text-muted)" />
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Optionnel. Utile si la variante a une apparence distincte.
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoChange(file);
                }}
              />
            </div>
          </div>

          {/* Libellé */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.74rem' }}>Libellé *</label>
            <input
              className="zadri-input"
              type="text"
              value={variant.label}
              onChange={(e) => onUpdate('label', e.target.value)}
              placeholder="ex. Noir, Or 42mm, Taille M…"
              style={{ minHeight: '42px' }}
            />
          </div>

          {/* Quantités */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>Commandé</label>
              <input
                className="zadri-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={variant.quantity_ordered ?? ''}
                onChange={(e) => onUpdate('quantity_ordered', e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="—"
                style={{ minHeight: '42px' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>Reçu *</label>
              <input
                className="zadri-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={variant.quantity_received}
                onChange={(e) => onUpdate('quantity_received', Math.max(0, parseInt(e.target.value, 10) || 0))}
                style={{ minHeight: '42px' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>Abîmé</label>
              <input
                className="zadri-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={variant.quantity_received}
                value={variant.quantity_damaged}
                onChange={(e) => onUpdate('quantity_damaged', Math.min(variant.quantity_received, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                style={{ minHeight: '42px' }}
              />
            </div>
          </div>

          {/* Récap vendable */}
          <div style={{ padding: '8px 12px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-card-sm)', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
            Vendable : <strong style={{ color: 'var(--color-text)' }}>{Math.max(0, variant.quantity_received - variant.quantity_damaged)}</strong>
          </div>

          {/* Prix spécifique */}
          <div>
            <label className="form-label" style={{ fontSize: '0.74rem' }}>Prix spécifique (FCFA) — laissez vide pour suivre le prix de l'article</label>
            <input
              className="zadri-input"
              type="number"
              inputMode="numeric"
              min={0}
              value={variant.price_override ?? ''}
              onChange={(e) => onUpdate('price_override', e.target.value ? parseInt(e.target.value, 10) : null)}
              placeholder={`Par défaut : ${formatFCFA(itemListPrice)}`}
              style={{ minHeight: '42px' }}
            />
            {effectivePrice > 0 && (
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Prix effectif : <strong>{formatFCFA(effectivePrice)}</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Styles partagés ────────────────────────────────────────────────────── */
const sectionStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card-lg)',
  padding: '18px 16px',
  marginBottom: '16px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  marginBottom: '16px',
  color: 'var(--color-text)',
};
