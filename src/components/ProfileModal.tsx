import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { X, Upload } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave }) => {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      loadProfile();
      setAvatarFile(null); // Reset file selection on open
    }
  }, [user, isOpen]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) {
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setAvatarUrl(data.avatar_url || '');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    let finalAvatarUrl = avatarUrl;

    // Upload file if selected
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalAvatarUrl = data.publicUrl;
      } else {
        console.error('Upload Error:', uploadError);
        alert('Failed to upload image');
      }
    }

    const updates = {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      avatar_url: finalAvatarUrl,
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    
    setLoading(false);
    if (!error) {
      onSave(); // notify parent to refresh
      onClose();
    } else {
      console.error(error);
      alert('Error updating profile!');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel p-6" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="flex-between mb-4">
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button onClick={onClose} className="text-muted"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSave} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label className="text-sm text-muted">First Name</label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
            />
          </div>
          <div className="flex-col gap-2">
            <label className="text-sm text-muted">Last Name</label>
            <input 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
            />
          </div>
          <div className="flex-col gap-2">
            <label className="text-sm text-muted">Profile Picture</label>
            <label style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--card-border)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', justifyContent: 'center'
            }}>
              <Upload size={16} /> 
              <span className="text-sm">{avatarFile ? avatarFile.name : 'Choose an image...'}</span>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <button type="submit" className="primary-button mt-2" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
