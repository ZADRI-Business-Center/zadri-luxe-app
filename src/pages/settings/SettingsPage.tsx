import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Edit2,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Tag,
  User,
  X,
} from 'lucide-react';
import { BottomNav } from '../../components/ui/BottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  addCategory,
  getCategoriesWithCount,
  renameCategory,
} from '../../lib/settingsService';
import type { CategoryItem } from '../../types/settings';

export const SettingsPage: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Catégories
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Renommage catégorie
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Chargement
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const cats = await getCategoriesWithCount();
      setCategories(cats);
    } catch (err: any) {
      setCatError(err?.message || 'Impossible de charger les catégories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Ajout catégorie
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setAddingCat(true);
      setCatError(null);
      const created = await addCategory(newCatName.trim());
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      setNewCatName('');
    } catch (err: any) {
      setCatError(err?.message || 'Impossible de créer la catégorie.');
    } finally {
      setAddingCat(false);
    }
  };

  // Renommage catégorie
  const handleRenameCategory = async (categoryId: string) => {
    if (!editCatName.trim()) return;
    try {
      setSavingCat(true);
      setCatError(null);
      await renameCategory(categoryId, editCatName.trim());
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, name: editCatName.trim() } : c))
      );
      setEditingCatId(null);
    } catch (err: any) {
      setCatError(err?.message || 'Impossible de renommer la catégorie.');
    } finally {
      setSavingCat(false);
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
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/plus" style={{ color: 'var(--color-text-muted)', display: 'flex' }} aria-label="Retour menu">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <span className="zadri-logo-label">CONFIGURATION GLOBALE</span>
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
              <Settings size={20} color="var(--color-primary)" />
              Paramètres
            </h1>
          </div>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : (
        <>
          {/* ── Section 1 : Seuils d'Ancienneté des Invendus (§9.8) ──────────── */}
          <section
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '16px',
              marginBottom: '18px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--color-primary)" />
                  Configuration du système
                </h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
                  Ces paramètres définissent le fonctionnement standard de l'application (fixés par défaut).
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'var(--color-surface-alt)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Lock size={12} /> Standard système
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    À surveiller (jours)
                  </label>
                  <input
                    type="number"
                    disabled
                    readOnly
                    className="form-input"
                    value={30}
                    style={{
                      opacity: 0.85,
                      cursor: 'not-allowed',
                      backgroundColor: 'var(--color-surface-alt)',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                    Par défaut : 30 jours
                  </span>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    À déstocker (jours)
                  </label>
                  <input
                    type="number"
                    disabled
                    readOnly
                    className="form-input"
                    value={60}
                    style={{
                      opacity: 0.85,
                      cursor: 'not-allowed',
                      backgroundColor: 'var(--color-surface-alt)',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                    Par défaut : 60 jours
                  </span>
                </div>
              </div>

              {/* Fuseau horaire */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={14} /> Fuseau horaire de l'application
                </label>
                <input
                  type="text"
                  disabled
                  readOnly
                  className="form-input"
                  value="UTC (Temps Universel)"
                  style={{
                    opacity: 0.85,
                    cursor: 'not-allowed',
                    backgroundColor: 'var(--color-surface-alt)',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                  Utilisé pour regrouper les statistiques quotidiennes et mensuelles de vente.
                </span>
              </div>
            </div>
          </section>

      {/* ── Section 2 : Gestion des Catégories d'Articles (§9.8) ────────── */}
      <section
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '16px',
          marginBottom: '18px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={16} color="var(--color-primary)" />
          Catégories d'articles
        </h2>
        <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
          Ajoutez ou renommez les catégories pour classer vos articles de mode et accessoires.
        </p>

        {/* Formulaire ajout catégorie */}
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            type="text"
            required
            className="form-input"
            style={{ flex: 1, height: '40px' }}
            placeholder="Nouvelle catégorie (ex. Lunettes, Parfums...)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <button
            type="submit"
            disabled={addingCat || !newCatName.trim()}
            className="btn-primary"
            style={{ width: 'auto', minHeight: '40px', padding: '0 16px', whiteSpace: 'nowrap' }}
          >
            {addingCat ? 'Ajout...' : <><Plus size={16} /> Ajouter</>}
          </button>
        </form>

        {catError && (
          <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', marginBottom: '10px' }}>
            {catError}
          </div>
        )}

        {/* Liste des catégories existantes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {categories.map((cat) => {
            const isEditing = editingCatId === cat.id;

            return (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-card-sm)',
                  backgroundColor: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '6px', flex: 1, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.82rem', flex: 1 }}
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={savingCat}
                      onClick={() => handleRenameCategory(cat.id)}
                      className="btn-primary"
                      style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.74rem' }}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCatId(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cat.name}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-pill)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {cat.items_count} article(s)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditCatName(cat.name);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '4px',
                      }}
                      title="Renommer cette catégorie"
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 3 : Profil & Compte (§9.8) ─────────────────────────── */}
      <section
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '16px',
          marginBottom: '18px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} color="var(--color-primary)" />
          Mon compte
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Nom complet</span>
            <strong>{profile?.full_name || '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Email</span>
            <strong>{user?.email || '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Rôle</span>
            <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.76rem' }}>
              {profile?.role || 'associé'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/change-password"
            className="btn-secondary"
            style={{ width: 'auto', minHeight: '38px', padding: '0 14px', fontSize: '0.8rem' }}
          >
            <KeyRound size={15} /> Modifier mon mot de passe
          </Link>

          <button
            type="button"
            onClick={() => signOut()}
            style={{
              background: 'none',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-card-sm)',
              padding: '0 14px',
              minHeight: '38px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </section>
      </>
      )}

      {/* Barre de navigation mobile inférieure */}
      <BottomNav />
    </div>
  );
};
