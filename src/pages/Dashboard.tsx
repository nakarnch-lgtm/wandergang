import React, { useState, useEffect } from 'react'
import { Sidebar } from '../components/Sidebar'
import { TripBanner } from '../components/TripBanner'
import { AdminFeed } from '../components/AdminFeed'
import { PaymentUpload } from '../components/PaymentUpload'
import { VotingPoll } from '../components/VotingPoll'
import { Search, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { ProfileModal } from '../components/ProfileModal'

function App() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ first_name: string, last_name: string, avatar_url: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name}` : user?.email?.split('@')[0] || 'User';
  const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <ProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchProfile} />
      
      <main className="main-content">
        {/* Top Header */}
        <header className="flex-between w-full">
          <div>
            <h2 className="text-xl font-bold">Hello, {displayName}!</h2>
            <p className="text-muted text-sm">{t('Welcome back to WanderGang')}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div 
              className="glass-panel flex-between" 
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', minWidth: '250px' }}
            >
              <Search size={16} className="text-muted" />
              <input 
                type="text" 
                placeholder={t('Search')} 
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', marginLeft: '0.5rem' }} 
              />
            </div>
            <button className="glass-panel" style={{ padding: '0.6rem', borderRadius: '50%' }}>
              <Bell size={18} />
            </button>
            <div 
              onClick={() => setIsModalOpen(true)}
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-teal)', overflow: 'hidden', cursor: 'pointer' }}
            >
              <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid-2-col" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flex: 1 }}>
          {/* Left Column */}
          <div className="flex-col gap-6">
            <TripBanner />
            <AdminFeed />
          </div>

          {/* Right Column */}
          <div className="flex-col gap-6">
            <PaymentUpload />
            <VotingPoll />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
