import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sun, Moon } from 'lucide-react';
import { formatErrorMessage } from '../lib/errorUtils';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  React.useEffect(() => {
    if (session) navigate(from, { replace: true });
  }, [session, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        setErrorMessage(formatErrorMessage(error, 'Une erreur est survenue lors de la connexion.'));
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Erreur inattendue de connexion :', err);
      setErrorMessage('Erreur de connexion. Vérifiez votre accès internet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-fade-in">

        {/* Toggle thème */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span className="zadri-logo-label">Espace Associés</span>
          <h1 className="zadri-logo-title" style={{ margin: '6px 0 8px' }}>ZADRI</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Gestion commerciale &amp; financière
          </p>
        </div>

        {errorMessage && (
          <div className="alert-box alert-danger" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Adresse email</label>
            <div className="input-container">
              <span className="input-icon-left"><Mail size={18} /></span>
              <input
                id="login-email"
                type="email"
                className="zadri-input has-left-icon"
                placeholder="votre-email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>
                Mot de passe
              </label>
              <Link to="/forgot-password" className="btn-link">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="input-container">
              <span className="input-icon-left"><Lock size={18} /></span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="zadri-input has-left-icon has-right-icon"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            className="btn-primary"
            disabled={submitting}
            style={{ marginTop: '20px' }}
          >
            {submitting ? <><div className="spinner" /> Connexion en cours…</> : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};
