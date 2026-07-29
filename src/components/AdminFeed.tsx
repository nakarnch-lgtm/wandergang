import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, Clock, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const AdminFeed: React.FC = () => {
  const { user } = useAuth();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New post state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchUpdates();
    
    // Subscribe to real-time changes
    const channel = supabase.channel('feed_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_updates' }, () => {
        fetchUpdates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUpdates = async () => {
    const { data, error } = await supabase
      .from('feed_updates')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setUpdates(data);
    }
    setLoading(false);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !user) return;
    
    setPosting(true);
    const { error } = await supabase
      .from('feed_updates')
      .insert([
        { title: newTitle, description: newDesc, author_email: user.email }
      ]);
      
    setPosting(false);
    if (!error) {
      setNewTitle('');
      setNewDesc('');
      fetchUpdates();
    } else {
      alert('Error posting update');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex-between mb-6">
        <h3 className="font-semibold text-lg">Admin Updates Feed</h3>
        <button className="text-muted"><Bell size={18} /></button>
      </div>

      {isAdmin && (
        <form onSubmit={handlePost} className="mb-6 flex-col gap-2 p-4" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
          <input 
            type="text" 
            placeholder="Announcement Title" 
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            required
            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'white' }}
          />
          <textarea 
            placeholder="Details..." 
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            required
            rows={2}
            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'white', resize: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={posting} className="primary-button" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={14} /> {posting ? 'Posting...' : 'Post Update'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-center text-muted">Loading updates...</p>
      ) : (
        <div className="flex-col gap-4">
          {updates.map((update, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={update.id} 
              className="flex-between p-4"
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-teal-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={20} color="var(--accent-teal)" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{update.title}</h4>
                  <p className="text-muted text-sm">{update.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }} className="text-muted text-xs">
                    <Clock size={12} /> {formatTime(update.created_at)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {updates.length === 0 && (
            <p className="text-center text-muted">No updates yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
