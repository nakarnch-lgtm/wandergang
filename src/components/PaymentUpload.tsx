import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, Edit2, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const PaymentUpload: React.FC = () => {
  const { user } = useAuth();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  const [isEditing, setIsEditing] = useState(false);
  const [mySlips, setMySlips] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const [settings, setSettings] = useState({
    amount: 350,
    period: 'month',
    next_due: 'Oct 15',
    total_installments: 10
  });

  const [editForm, setEditForm] = useState(settings);

  useEffect(() => {
    fetchSettings();
    if (user) {
      fetchMySlips();
    }

    const channel1 = supabase.channel('payment_changes_dynamic')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    const channel2 = supabase.channel('my_slips_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_slips' }, () => {
        if (user) fetchMySlips();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [user]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('payment_settings').select('*').limit(1).single();
    if (data) {
      setSettings(data);
      setEditForm(data);
    }
  };

  const fetchMySlips = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payment_slips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setMySlips(data);
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase.from('payment_settings').update({
      ...editForm
    }).eq('id', 1);

    if (!error) {
      setSettings(editForm);
      setIsEditing(false);
      fetchSettings(); // Double check from server
    } else {
      console.error(error);
      alert('Error updating payment settings');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user || uploading) return;
    
    const file = e.target.files[0];
    setUploading(true);

    try {
      // 1. Double check DB before uploading to prevent race conditions
      const { data: existingPending } = await supabase
        .from('payment_slips')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending');
        
      if (existingPending && existingPending.length > 0) {
        alert('You already have a pending slip.');
        setUploading(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('payment_slips').insert({
        user_id: user.id,
        amount: settings.amount,
        slip_url: fileName, // Store path instead of public URL
        status: 'pending'
      });

      if (insertError) throw insertError;
      
    } catch (error) {
      console.error('Error uploading slip:', error);
      alert('Failed to upload slip.');
    } finally {
      setUploading(false);
    }
  };

  const hasPendingSlip = mySlips.some(slip => slip.status === 'pending');
  
  // Check if there is an approved slip in the current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const hasApprovedThisMonth = mySlips.some(slip => {
    if (slip.status !== 'approved') return false;
    const slipDate = new Date(slip.created_at);
    return slipDate.getMonth() === currentMonth && slipDate.getFullYear() === currentYear;
  });

  const cannotUpload = hasPendingSlip || hasApprovedThisMonth;

  return (
    <div className="flex-col gap-6" style={{ height: '100%' }}>
      {/* Settings Card */}
      <div className="glass-panel p-6 flex-col relative" style={{ flexShrink: 0 }}>
        {isAdmin && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-muted" 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Edit2 size={16} />
          </button>
        )}

        <div>
          {isEditing ? (
            <div className="flex-col gap-3 mb-4">
              <h3 className="font-semibold text-lg">Edit Payment Settings</h3>
              <div>
                <label className="text-sm text-muted block mb-1">Amount (THB)</label>
                <input 
                  type="number" 
                  value={editForm.amount}
                  onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Period (e.g. month, week)</label>
                <input 
                  type="text" 
                  value={editForm.period}
                  onChange={e => setEditForm({...editForm, period: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-sm text-muted block mb-1">Next Due Date</label>
                  <input 
                    type="text" 
                    value={editForm.next_due}
                    onChange={e => setEditForm({...editForm, next_due: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-sm text-muted block mb-1">Total Installments</label>
                  <input 
                    type="number" 
                    value={editForm.total_installments}
                    onChange={e => setEditForm({...editForm, total_installments: Number(e.target.value)})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => setIsEditing(false)} className="glass-button" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                  <X size={14} style={{ marginRight: '0.25rem' }} /> Cancel
                </button>
                <button onClick={handleSaveSettings} className="primary-button" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>
                  <Save size={14} style={{ marginRight: '0.25rem' }} /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-lg mb-1">Monthly Contribution</h3>
              <p className="text-muted text-sm mb-4">Current Goal: {settings.amount} THB / {settings.period} ({settings.total_installments} Installments)</p>
              <div className="flex-between">
                <span className="text-xl font-bold text-gradient">{settings.amount} THB</span>
                <span className="text-sm text-muted">Next Due: {settings.next_due}</span>
              </div>
            </>
          )}
        </div>

        <div className="mt-6">
          <h4 className="font-semibold text-sm mb-2">Upload Payment Slip</h4>
          
          {cannotUpload ? (
            <div 
              style={{ 
                border: '1px solid var(--card-border)', 
                borderRadius: 'var(--radius-md)', 
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: hasPendingSlip ? 'rgba(255, 255, 255, 0.05)' : 'rgba(34, 197, 94, 0.1)',
                borderColor: hasPendingSlip ? 'var(--card-border)' : 'var(--success)'
              }}
            >
              {hasPendingSlip ? (
                <>
                  <UploadCloud size={32} color="var(--text-muted)" />
                  <p className="text-sm font-semibold text-muted mt-2">Slip Pending Review</p>
                  <p className="text-xs text-muted text-center mt-1">You already have a slip waiting for admin approval.</p>
                </>
              ) : (
                <>
                  <CheckCircle size={32} color="var(--success)" />
                  <p className="text-sm font-semibold text-success mt-2" style={{ color: 'var(--success)' }}>Payment Complete!</p>
                  <p className="text-xs text-muted text-center mt-1">You have already paid for this month.</p>
                </>
              )}
            </div>
          ) : (
            <label 
              style={{ 
                border: '2px dashed var(--card-border)', 
                borderRadius: 'var(--radius-md)', 
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                cursor: uploading ? 'default' : 'pointer',
                background: 'rgba(0,0,0,0.2)',
                transition: 'all 0.3s',
                pointerEvents: uploading ? 'none' : 'auto'
              }}
              onMouseEnter={(e) => { if(!uploading) e.currentTarget.style.borderColor = 'var(--accent-teal)'; }}
              onMouseLeave={(e) => { if(!uploading) e.currentTarget.style.borderColor = 'var(--card-border)'; }}
            >
              {uploading ? (
                <Loader2 size={32} color="var(--accent-teal)" className="spin" />
              ) : (
                <>
                  <UploadCloud size={32} color="var(--text-muted)" />
                  <p className="text-sm text-muted text-center">Drag & Drop or Click to Upload Slip<br/>{settings.amount} THB due</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </>
              )}
            </label>
          )}
        </div>
      </div>

    </div>
  );
};
