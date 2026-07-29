import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Check, X, Search, Bell, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [slips, setSlips] = useState<any[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [totalFunds, setTotalFunds] = useState(0);
  
  useEffect(() => {
    fetchSlips();
    fetchStats();

    const channel1 = supabase.channel('admin_slips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_slips' }, () => {
        fetchSlips();
        fetchStats();
      })
      .subscribe();
      
    const channel2 = supabase.channel('admin_participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_participants' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  const fetchSlips = async () => {
    // Fetch slips and join with profiles to get user names
    const { data, error } = await supabase
      .from('payment_slips')
      .select('*, profiles(first_name, last_name)')
      .order('created_at', { ascending: false });

    if (data) setSlips(data);
  };

  const fetchStats = async () => {
    // Total Funds = sum of approved slips
    const { data: approvedSlips } = await supabase
      .from('payment_slips')
      .select('amount')
      .eq('status', 'approved');
      
    if (approvedSlips) {
      const sum = approvedSlips.reduce((acc, curr) => acc + Number(curr.amount), 0);
      setTotalFunds(sum);
    }

    // Members count
    const { count } = await supabase
      .from('trip_participants')
      .select('*', { count: 'exact', head: true });
    
    if (count !== null) setParticipantsCount(count);
  };

  const handleApprove = async (id: number) => {
    // 1. Update status
    await supabase.from('payment_slips').update({ status: 'approved' }).eq('id', id);
    
    // 2. Fetch the slip details to log activity
    const { data: slip } = await supabase.from('payment_slips').select('*').eq('id', id).single();
    if (slip) {
      await supabase.from('activities').insert({
        user_id: slip.user_id,
        action_type: 'PAYMENT_APPROVED',
        details: { amount: slip.amount }
      });
    }
  };

  const handleReject = async (id: number) => {
    await supabase.from('payment_slips').update({ status: 'rejected' }).eq('id', id);
  };

  const handleUndo = async (id: number) => {
    await supabase.from('payment_slips').update({ status: 'pending' }).eq('id', id);
  };

  const handleViewSlip = async (path: string) => {
    if (path.startsWith('http')) {
      window.open(path, '_blank');
      return;
    }

    try {
      const { data, error } = await supabase.storage.from('slips').createSignedUrl(path, 60); // 60 seconds expiry
      if (error) throw error;
      if (data) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating signed URL:', error);
      alert('Failed to view slip');
    }
  };

  const pendingSlips = slips.filter(s => s.status === 'pending');
  const historySlips = slips.filter(s => s.status !== 'pending');

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="main-content" style={{ overflowY: 'auto' }}>
        {/* Top Header */}
        <header className="flex-between w-full mb-6">
          <div>
            <h2 className="text-xl font-bold">{t('Admin Panel')}</h2>
            <p className="text-muted text-sm">Manage pending slips and approvals</p>
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
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid-3-col mb-6">
          <div className="glass-panel p-6">
            <h4 className="text-muted text-sm mb-2">{t('Total Funds Raised')}</h4>
            <span className="text-2xl font-bold text-gradient">{totalFunds.toLocaleString()} THB</span>
          </div>
          <div className="glass-panel p-6">
            <h4 className="text-muted text-sm mb-2">{t('Pending Approvals')}</h4>
            <span className="text-2xl font-bold">{pendingSlips.length}</span>
          </div>
          <div className="glass-panel p-6">
            <h4 className="text-muted text-sm mb-2">{t('Total Members')}</h4>
            <span className="text-2xl font-bold">{participantsCount}</span>
          </div>
        </div>

        {/* Pending Slips Table */}
        <div className="glass-panel p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">{t('Pending Slips')}</h3>
          <div className="flex-col gap-4">
            {pendingSlips.map((slip) => (
              <motion.div 
                key={slip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-between p-4"
                style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button onClick={() => handleViewSlip(slip.slip_url)} style={{ background: 'transparent', border: 'none' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <span className="text-xs text-accent-teal hover:underline">View</span>
                    </div>
                  </button>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {slip.profiles?.first_name} {slip.profiles?.last_name}
                    </h4>
                    <p className="text-muted text-sm">Uploaded on {new Date(slip.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex-between gap-4">
                  <span className="font-bold">{slip.amount} THB</span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleApprove(slip.id)}
                      className="glass-button" 
                      style={{ padding: '0.5rem', background: 'rgba(34, 197, 94, 0.2)', borderColor: 'var(--success)', color: 'var(--success)', cursor: 'pointer' }}
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      onClick={() => handleReject(slip.id)}
                      className="glass-button" 
                      style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {pendingSlips.length === 0 && (
              <p className="text-center text-muted py-8">{t('No pending slips')}</p>
            )}
          </div>
        </div>

        {/* All History Slips */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-lg mb-4">{t('All Payment History')}</h3>
          <div className="flex-col gap-4">
            {historySlips.map((slip) => (
              <div 
                key={slip.id}
                className="flex-between p-4"
                style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.02)' }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button onClick={() => handleViewSlip(slip.slip_url)} className="text-xs text-accent-teal hover:underline" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    View Slip
                  </button>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {slip.profiles?.first_name} {slip.profiles?.last_name}
                    </h4>
                    <p className="text-muted text-sm">{new Date(slip.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex-between gap-4">
                  <span className="font-bold text-sm">{slip.amount} THB</span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="text-sm font-semibold px-2 py-1" style={{ borderRadius: '4px', background: slip.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: slip.status === 'approved' ? 'var(--success)' : '#ef4444' }}>
                      {slip.status.charAt(0).toUpperCase() + slip.status.slice(1)}
                    </span>
                    <button 
                      onClick={() => handleUndo(slip.id)}
                      className="glass-button" 
                      style={{ padding: '0.4rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Undo Action"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {historySlips.length === 0 && (
              <p className="text-center text-muted py-8">No slip history</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
