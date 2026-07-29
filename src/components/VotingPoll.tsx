import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface PollOption {
  id: number;
  text: string;
  poll_id: number;
}

interface PollVote {
  user_id: string;
  option_id: number;
}

interface Poll {
  id: number;
  title: string;
  created_at: string;
}

export const VotingPoll: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Create Poll State
  const [isCreating, setIsCreating] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPollData();

    const channel1 = supabase.channel('poll_votes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
        fetchPollData();
      })
      .subscribe();

    const channel2 = supabase.channel('polls_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => {
        fetchPollData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  const fetchPollData = async () => {
    // 1. Fetch latest poll
    const { data: pollData } = await supabase.from('polls').select('*').order('created_at', { ascending: false }).limit(1).single();
    
    if (pollData) {
      setActivePoll(pollData);
      
      // 2. Fetch options for this poll
      const { data: optData } = await supabase.from('poll_options').select('*').eq('poll_id', pollData.id);
      if (optData) setOptions(optData);
      
      // 3. Fetch votes
      const { data: voteData } = await supabase.from('poll_votes').select('*');
      if (voteData) {
        // filter votes that belong to these options
        const optionIds = optData ? optData.map(o => o.id) : [];
        const relevantVotes = voteData.filter(v => optionIds.includes(v.option_id));
        setVotes(relevantVotes);
      }
    } else {
      setActivePoll(null);
      setOptions([]);
      setVotes([]);
    }
    
    setLoading(false);
  };

  const handleVote = async (optionId: number) => {
    if (!user || !activePoll) return;
    
    // 1. Delete previous vote for this user for any option in the current poll
    // We achieve this by finding the current option they voted for and deleting it.
    const userCurrentVote = votes.find(v => v.user_id === user.id);
    if (userCurrentVote) {
      await supabase.from('poll_votes').delete().eq('user_id', user.id).eq('option_id', userCurrentVote.option_id);
    }
    
    // 2. Insert new vote
    await supabase.from('poll_votes').insert([{ user_id: user.id, option_id: optionId }]);
    
    fetchPollData(); // Refresh
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollTitle.trim() || newOptions.some(opt => !opt.trim())) {
      alert('Please fill out all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Poll
      const { data: newPoll, error: pollError } = await supabase.from('polls').insert([{ title: newPollTitle }]).select().single();
      if (pollError) throw pollError;

      // 2. Insert Options
      const optionsToInsert = newOptions.map(opt => ({
        poll_id: newPoll.id,
        text: opt
      }));
      const { error: optionsError } = await supabase.from('poll_options').insert(optionsToInsert);
      if (optionsError) throw optionsError;

      // Success
      setNewPollTitle('');
      setNewOptions(['', '']);
      setIsCreating(false);
      fetchPollData();
    } catch (error) {
      console.error(error);
      alert('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalVotes = votes.length;
  const userVote = votes.find(v => v.user_id === user?.id)?.option_id;

  return (
    <div className="glass-panel p-6 mt-6">
      <div className="flex-between mb-4">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <HelpCircle size={18} color="var(--accent-orange)" />
          <h3 className="font-semibold text-lg">{t('Active Poll')}</h3>
        </div>
        
        {isAdmin && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex"
            style={{ alignItems: 'center', gap: '0.25rem', background: 'transparent', border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            <Plus size={14} /> New Poll
          </button>
        )}
      </div>
      
      {isCreating ? (
        <form onSubmit={handleCreatePoll} className="flex-col gap-4 animate-fade-in">
          <div className="flex-between">
            <h4 className="font-semibold text-sm">Create New Poll</h4>
            <button type="button" onClick={() => setIsCreating(false)} className="text-muted" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          
          <div>
            <label className="text-xs text-muted block mb-1">Poll Title</label>
            <input 
              type="text" 
              value={newPollTitle}
              onChange={e => setNewPollTitle(e.target.value)}
              placeholder="e.g. Where should we stay in Hokkaido?"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="flex-col gap-2">
            <label className="text-xs text-muted block">Options</label>
            {newOptions.map((opt, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={opt}
                  onChange={e => {
                    const updated = [...newOptions];
                    updated[index] = e.target.value;
                    setNewOptions(updated);
                  }}
                  placeholder={`Option ${index + 1}`}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)' }}
                />
                {newOptions.length > 2 && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const updated = newOptions.filter((_, i) => i !== index);
                      setNewOptions(updated);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button"
              onClick={() => setNewOptions([...newOptions, ''])}
              className="text-xs text-accent-teal mt-1"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600' }}
            >
              + Add Option
            </button>
          </div>

          <button type="submit" className="primary-button" disabled={isSubmitting} style={{ marginTop: '0.5rem' }}>
            {isSubmitting ? 'Creating...' : 'Publish Poll'}
          </button>
        </form>
      ) : loading ? (
        <p className="text-sm text-muted">Loading poll...</p>
      ) : !activePoll ? (
        <p className="text-sm text-muted text-center py-6">No active polls right now.</p>
      ) : (
        <>
          <p className="font-semibold mb-4">{activePoll.title}</p>
          <div className="flex-col gap-3">
            {options.map((opt) => {
              const optVotes = votes.filter(v => v.option_id === opt.id).length;
              const percent = totalVotes === 0 ? 0 : Math.round((optVotes / totalVotes) * 100);
              const isVoted = userVote === opt.id;

              return (
                <button 
                  key={opt.id}
                  onClick={() => handleVote(opt.id)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: isVoted ? '1px solid var(--accent-orange)' : '1px solid var(--card-border)',
                    background: isVoted ? 'rgba(251, 146, 60, 0.1)' : 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  {userVote && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5 }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        background: 'rgba(251, 146, 60, 0.15)',
                        zIndex: 0
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', zIndex: 1 }} className="flex-between">
                    <span className="font-semibold text-sm">{opt.text}</span>
                    {userVote && <span className="text-sm font-bold">{percent}%</span>}
                  </div>
                </button>
              )
            })}
          </div>
          {userVote && (
            <p className="text-xs text-muted mt-4 text-center">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} total</p>
          )}
        </>
      )}
    </div>
  );
};
