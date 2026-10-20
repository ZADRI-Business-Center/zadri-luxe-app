import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSent, setSuccessSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Veuillez renseigner votre adresse email.');
      return;
    }

    setSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: redirectUrl });
      if (error) {
        setErrorMessage(error.message || 'Impossible d\'envoyer l\'email de réinitialisation.');
      } else {
        setSuccessSent(true);
      }
    } catch (err) {
      console.error('Erreur réinitialisation :', err);
      setErrorMessage('Une erreur est survenue. Vérifiez votre connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-fade-in">

        <Link to="/login" className="btn-link" style={{ marginBottom: '20px', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Retour à la connexion
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
            Mot de passe oublié
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Recevez un lien par email pour réinitialiser votre accès
          </p>
        </div>

        {errorMessage && (
          <div className="alert-box alert-danger" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successSent ? (
          <div style={{ textAlign: 'center' }}>
            <div className="alert-box alert-success" style={{ textAlign: 'left', marginBottom: '20px' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Lien envoyé avec succès !</strong>
                <p style={{ marginTop: '4px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Si un compte correspond à <strong>{email}</strong>, vous recevrez un email avec les instructions.
                </p>
              </div>
            </div>
            <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Retour à l'écran de connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Adresse email associée</label>
              <div className="input-container">
                <span className="input-icon-left"><Mail size={18} /></span>
                <input
                  id="forgot-email"
                  type="email"
                  className="zadri-input has-left-icon"
                  placeholder="votre-email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              id="forgot-submit"
              className="btn-primary"
              disabled={submitting}
              style={{ marginTop: '20px' }}
            >
              {submitting
                ? <><div className="spinner" /> Envoi du lien…</>
                : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
