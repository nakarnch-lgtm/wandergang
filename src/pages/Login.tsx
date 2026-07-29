import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh' }}>
      <div className="glass-panel p-6" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-xl font-bold mb-2">{t('Welcome Back!')}</h2>
        <p className="text-muted text-sm mb-6">{t('Login to your WanderGang account')}</p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label className="text-sm font-semibold">{t('Email')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
            />
          </div>
          <div className="flex-col gap-2">
            <label className="text-sm font-semibold">{t('Password')}</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
            />
          </div>
          
          <button type="submit" className="primary-button mt-4" disabled={loading}>
            {loading ? 'Logging in...' : t('Login')}
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-muted">
          {t("Don't have an account?")} <Link to="/register" style={{ fontWeight: 600 }}>{t('Register')}</Link>
        </p>
      </div>
    </div>
  );
};
