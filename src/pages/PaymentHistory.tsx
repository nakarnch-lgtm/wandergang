import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { FileText, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const PaymentHistory: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mySlips, setMySlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMySlips();
    }

    const channel = supabase.channel('my_slips_history_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_slips' }, () => {
        if (user) fetchMySlips();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMySlips = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payment_slips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setMySlips(data);
    }
    setLoading(false);
  };

  const handleViewSlip = async (path: string) => {
    if (path.startsWith('http')) {
      window.open(path, '_blank');
      return;
    }

    try {
      const { data, error } = await supabase.storage.from('slips').createSignedUrl(path, 60);
      if (error) throw error;
      if (data) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating signed URL:', error);
      alert('Failed to view slip');
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="main-content" style={{ overflowY: 'auto' }}>
        <header className="flex-between w-full mb-6">
          <div>
            <h2 className="text-xl font-bold flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={24} className="text-accent-teal" /> {t('My Payment History')}
            </h2>
            <p className="text-muted text-sm">View your past contributions and their status</p>
          </div>
          <button className="glass-panel" style={{ padding: '0.6rem', borderRadius: '50%' }}>
            <Bell size={18} />
          </button>
        </header>

        <div className="glass-panel p-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {loading ? (
            <p className="text-center text-muted py-8">Loading history...</p>
          ) : mySlips.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="text-muted mb-4 mx-auto" opacity={0.5} />
              <p className="text-muted">No payments uploaded yet.</p>
            </div>
          ) : (
            <div className="flex-col gap-4">
              {mySlips.map(slip => (
                <div 
                  key={slip.id} 
                  className="flex-between p-4" 
                  style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}
                >
                  <div>
                    <p className="font-bold text-lg text-gradient">{slip.amount} THB</p>
                    <p className="text-sm text-muted">{new Date(slip.created_at).toLocaleDateString()} {new Date(slip.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button onClick={() => handleViewSlip(slip.slip_url)} className="text-sm text-accent-teal hover:underline" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                      View Slip
                    </button>
                    <span 
                      className="text-sm font-semibold px-3 py-1" 
                      style={{ 
                        borderRadius: 'var(--radius-full)',
                        background: slip.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : slip.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                        color: slip.status === 'approved' ? 'var(--success)' : slip.status === 'rejected' ? '#ef4444' : 'var(--text-muted)'
                      }}
                    >
                      {slip.status.charAt(0).toUpperCase() + slip.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
