import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Save, X, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export const TripBanner: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripData, setTripData] = useState({
    title: 'Summer in Hokkaido 2025',
    dates: 'July 12 - July 20, 2025',
    location: 'Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2000&auto=format&fit=crop',
  });
  
  const [editForm, setEditForm] = useState(tripData);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Dynamic Goal Logic State
  const [participantsCount, setParticipantsCount] = useState(12); // Default mock
  const [isJoined, setIsJoined] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    amount: 350,
    total_installments: 10,
    current_collected: 38500
  });

  useEffect(() => {
    fetchParticipants();
    fetchPaymentSettings();

    const channel1 = supabase.channel('participants_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_participants' }, () => {
        fetchParticipants();
      })
      .subscribe();

    const channel2 = supabase.channel('payment_settings_banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_settings' }, () => {
        fetchPaymentSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [user]);

  const fetchParticipants = async () => {
    const { count, error } = await supabase
      .from('trip_participants')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count !== null) {
      setParticipantsCount(count);
    }

    if (user) {
      const { data } = await supabase
        .from('trip_participants')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setIsJoined(!!data);
    }
  };

  const fetchPaymentSettings = async () => {
    // 1. Fetch payment settings for amount and total_installments
    const { data: settingsData } = await supabase.from('payment_settings').select('*').limit(1).single();
    
    // 2. Calculate dynamic current_collected from approved slips
    const { data: approvedSlips } = await supabase
      .from('payment_slips')
      .select('amount')
      .eq('status', 'approved');
      
    let dynamicCollected = 0;
    if (approvedSlips) {
      dynamicCollected = approvedSlips.reduce((acc, curr) => acc + Number(curr.amount), 0);
    }

    if (settingsData) {
      setPaymentSettings({
        amount: settingsData.amount || 350,
        total_installments: settingsData.total_installments || 10,
        current_collected: dynamicCollected
      });
    }
  };

  const handleJoinTrip = async () => {
    if (!user) return;
    setLoading(true);
    
    // Check if already joined
    if (!isJoined) {
      // Insert into trip_participants
      const { error } = await supabase.from('trip_participants').insert({
        user_id: user.id
      });
      
      if (!error) {
        setIsJoined(true);
        // Log activity
        await supabase.from('activities').insert({
          user_id: user.id,
          action_type: 'USER_JOINED'
        });
      }
    }
    
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    setUploading(true);
    let finalImageUrl = editForm.image;

    if (bannerFile) {
      if (tripData.image.includes('supabase.co/storage/v1/object/public/trips/')) {
        try {
          const oldPath = tripData.image.split('/trips/')[1];
          if (oldPath) {
            await supabase.storage.from('trips').remove([oldPath]);
          }
        } catch (e) {
          console.error('Failed to delete old image', e);
        }
      }

      const fileExt = bannerFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('trips')
        .upload(fileName, bannerFile, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('trips').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      } else {
        console.error('Upload Error:', uploadError);
        alert('Failed to upload image');
      }
    }

    const newTripData = { ...editForm, image: finalImageUrl };
    setTripData(newTripData);
    setEditForm(newTripData);
    setBannerFile(null);
    setIsEditing(false);
    setUploading(false);
  };

  const handleCancel = () => {
    setEditForm(tripData);
    setBannerFile(null);
    setIsEditing(false);
  };

  const calculatedGoal = participantsCount * (paymentSettings.total_installments * paymentSettings.amount);
  const currentCollected = paymentSettings.current_collected;
  const percent = calculatedGoal > 0 ? Math.min(100, Math.round((currentCollected / calculatedGoal) * 100)) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel" 
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <div 
        style={{
          height: '200px',
          backgroundImage: `url("${tripData.image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      >
        {isAdmin && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="glass-button" 
            style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.5)' }}
          >
            <Edit2 size={16} color="white" />
          </button>
        )}
      </div>
      
      <div className="p-6">
        {isEditing ? (
          <div className="flex-col gap-4">
            <div>
              <label className="text-sm text-muted mb-2 block" style={{ display: 'block' }}>Trip Banner Image</label>
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', justifyContent: 'center'
              }}>
                <Upload size={16} /> 
                <span className="text-sm">{bannerFile ? bannerFile.name : 'Choose an image to upload...'}</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div>
              <label className="text-sm text-muted mb-2 block" style={{ display: 'block' }}>Trip Title</label>
              <input 
                type="text" 
                value={editForm.title} 
                onChange={e => setEditForm({...editForm, title: e.target.value})}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontWeight: 'bold' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="text-sm text-muted mb-2 block" style={{ display: 'block' }}>Dates</label>
                <input 
                  type="text" 
                  value={editForm.dates} 
                  onChange={e => setEditForm({...editForm, dates: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-sm text-muted mb-2 block" style={{ display: 'block' }}>Location</label>
                <input 
                  type="text" 
                  value={editForm.location} 
                  onChange={e => setEditForm({...editForm, location: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={handleCancel} disabled={uploading} className="glass-button" style={{ padding: '0.5rem 1rem' }}>
                <X size={16} style={{ marginRight: '0.25rem' }} /> Cancel
              </button>
              <button onClick={handleSave} disabled={uploading} className="primary-button" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                <Save size={16} style={{ marginRight: '0.25rem' }} /> {uploading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-between">
              <div>
                <h2 className="text-xl font-bold mb-1">{tripData.title}</h2>
                <p className="text-muted text-sm">{tripData.dates} | {tripData.location}</p>
              </div>
              <button 
                onClick={handleJoinTrip} 
                disabled={loading}
                className={isJoined ? "glass-button" : "primary-button"}
                style={isJoined ? { color: 'var(--success)', borderColor: 'var(--success)' } : {}}
              >
                {isJoined ? t('Joined') : loading ? 'Loading...' : t('Join Trip')}
              </button>
            </div>

            <div className="mt-6">
              <div className="flex-between mb-2">
                <span className="text-sm font-semibold">{t('Funded')}: {percent}%</span>
                <span className="text-sm text-muted">{participantsCount} {t('participants joined')}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-purple))',
                    borderRadius: 'var(--radius-full)'
                  }}
                />
              </div>
              <div className="flex-between mt-2 text-sm text-muted">
                <span>{currentCollected.toLocaleString()} THB</span>
                <span>{t('Goal')}: {calculatedGoal.toLocaleString()} THB</span>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
