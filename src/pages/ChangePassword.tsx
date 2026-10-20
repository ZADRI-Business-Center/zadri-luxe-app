import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || !confirmPassword) {
      setErrorMessage('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe saisis ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage(error.message || 'Impossible de mettre à jour le mot de passe.');
      } else {
        setSuccessMessage('Votre mot de passe a été modifié avec succès.');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => navigate('/'), 2500);
      }
    } catch (err) {
      console.error('Erreur lors du changement de mot de passe :', err);
      setErrorMessage('Une erreur est survenue. Vérifiez votre connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-fade-in">

        <Link to="/" className="btn-link" style={{ marginBottom: '20px', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            backgroundColor: 'rgba(var(--color-primary-rgb), 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', color: 'var(--color-primary)',
          }}>
            <Lock size={22} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
            Changer de mot de passe
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Définissez votre nouveau mot de passe sécurisé
          </p>
        </div>

        {errorMessage && (
          <div className="alert-box alert-danger" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="alert-box alert-success" role="status">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successMessage} Redirection en cours…</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="change-new-password">
              Nouveau mot de passe <span style={{ color: 'var(--color-text-muted)' }}>(min. 8 caractères)</span>
            </label>
            <div className="input-container">
              <span className="input-icon-left"><Lock size={18} /></span>
              <input
                id="change-new-password"
                type={showPassword ? 'text' : 'password'}
                className="zadri-input has-left-icon has-right-icon"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="button" className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Masquer' : 'Afficher'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="change-confirm-password">
              Confirmer le nouveau mot de passe
            </label>
            <div className="input-container">
              <span className="input-icon-left"><Lock size={18} /></span>
              <input
                id="change-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="zadri-input has-left-icon has-right-icon"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="button" className="input-icon-right"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="change-password-submit"
            className="btn-primary"
            disabled={submitting}
            style={{ marginTop: '20px' }}
          >
            {submitting
              ? <><div className="spinner" /> Enregistrement…</>
              : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};
