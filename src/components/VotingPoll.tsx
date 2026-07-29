import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface PollOption {
  id: number;
  text: string;
}

interface PollVote {
  user_id: string;
  option_id: number;
}

export const VotingPoll: React.FC = () => {
  const { user } = useAuth();
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPollData();

    // Subscribe to votes channel for real-time updates
    const channel = supabase.channel('poll_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
        fetchPollData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPollData = async () => {
    const { data: optData } = await supabase.from('poll_options').select('*');
    if (optData) setOptions(optData);

    const { data: voteData } = await supabase.from('poll_votes').select('*');
    if (voteData) setVotes(voteData);

    setLoading(false);
  };

  const handleVote = async (optionId: number) => {
    if (!user) return;
    
    // Upsert vote (relies on UNIQUE(user_id) in DB or just update)
    // Supabase JS upsert needs the primary key or unique constraint. 
    // Since user_id is unique, we can use it if we included it in the conflict constraint, 
    // or we can do a delete/insert or just an upsert if configured properly.
    // For safety, let's try an upsert based on user_id, but usually it requires matching the PK.
    // Let's do a simple approach: delete existing vote, then insert.
    await supabase.from('poll_votes').delete().eq('user_id', user.id);
    await supabase.from('poll_votes').insert([{ user_id: user.id, option_id: optionId }]);
    
    fetchPollData(); // Refresh immediately
  };

  const totalVotes = votes.length;
  const userVote = votes.find(v => v.user_id === user?.id)?.option_id;

  return (
    <div className="glass-panel p-6 mt-6">
      <div className="flex-between mb-4">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <HelpCircle size={18} color="var(--accent-orange)" />
          <h3 className="font-semibold text-lg">Active Poll: Accommodation</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="text-sm text-muted">
          <Clock size={14} /> Ends in 2 days
        </div>
      </div>
      
      <p className="text-sm text-muted mb-4">Admin: Please vote for our primary stay in Hokkaido!</p>

      {loading ? (
        <p className="text-sm text-muted">Loading poll...</p>
      ) : (
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
      )}
      {userVote && (
        <p className="text-xs text-muted mt-4 text-center">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} total</p>
      )}
    </div>
  );
};
