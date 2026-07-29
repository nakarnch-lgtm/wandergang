import React from 'react';
import { LayoutDashboard, Plane, Wallet, MessageSquare, Users, Settings, ShieldCheck, Globe, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'th' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div>
          <h1 className="text-xl font-semibold">
            Wander<span className="text-gradient">Gang</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={toggleLanguage} className="glass-button" style={{ padding: '0.5rem', background: 'transparent' }} title={i18n.language === 'en' ? 'Switch to Thai' : 'Switch to English'}>
            <Globe size={20} />
          </button>
          <button onClick={handleLogout} className="glass-button" style={{ padding: '0.5rem', color: '#ef4444', background: 'transparent' }} title={t('Logout')}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <aside className="sidebar glass-panel" style={{ borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', borderLeft: 'none' }}>
      <div className="flex-col gap-2 sidebar-desktop-only">
        <h1 className="text-xl font-semibold">
          Wander<span className="text-gradient">Gang</span>
        </h1>
        <p className="text-muted text-sm">Group Travel Savings</p>
      </div>

      <nav className="flex-col gap-2 mt-6">
        <SidebarItem icon={<LayoutDashboard size={20} />} label={t('Dashboard')} to="/" active={location.pathname === '/'} />
        <SidebarItem icon={<Plane size={20} />} label={t('My Trips')} to="/trips" active={location.pathname === '/trips'} />
        <SidebarItem icon={<Wallet size={20} />} label={t('Payment History')} to="/payment-history" active={location.pathname === '/payment-history'} />
        <SidebarItem icon={<MessageSquare size={20} />} label={t('Feed')} to="/feed" active={location.pathname === '/feed'} />
        <SidebarItem icon={<Users size={20} />} label={t('Community')} to="/community" active={location.pathname === '/community'} />
        
        {isAdmin && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
            <SidebarItem icon={<ShieldCheck size={20} color="var(--accent-orange)" />} label={t('Admin Panel')} to="/admin" active={location.pathname === '/admin'} />
          </div>
        )}
      </nav>

      <div className="mt-auto flex-col gap-2 sidebar-desktop-only">
        <button 
          onClick={toggleLanguage}
          className="flex-between p-4 glass-button"
          style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
        >
          <Globe size={18} />
          <span>{i18n.language === 'en' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}</span>
        </button>
        <SidebarItem icon={<Settings size={20} />} label={t('Settings')} to="/settings" active={location.pathname === '/settings'} />
        
        <button 
          onClick={handleLogout}
          className="flex-between p-4"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px solid transparent',
            justifyContent: 'flex-start',
            gap: '1rem',
            color: '#ef4444',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={20} />
          <span className="font-semibold">{t('Logout') || 'Log out'}</span>
        </button>
      </div>
    </aside>
    </>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; to: string; active?: boolean }> = ({ icon, label, to, active }) => {
  return (
    <Link 
      to={to}
      className="flex-between p-4"
      style={{
        width: '100%',
        borderRadius: 'var(--radius-md)',
        background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        border: active ? '1px solid var(--card-border)' : '1px solid transparent',
        justifyContent: 'flex-start',
        gap: '1rem',
        color: active ? 'var(--accent-teal)' : 'var(--text-muted)',
        transition: 'all 0.2s',
        textDecoration: 'none'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-main)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </Link>
  );
};
