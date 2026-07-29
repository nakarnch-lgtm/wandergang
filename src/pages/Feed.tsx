import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Activity, Bell, UserPlus, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Feed: React.FC = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    const channel = supabase.channel('feed_activities')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => {
        fetchActivities(); // Re-fetch to get joined profile data
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select(`
        *,
        profiles:user_id(first_name, last_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setActivities(data);
    }
    setLoading(false);
  };

  const renderActivityIcon = (type: string) => {
    switch(type) {
      case 'USER_JOINED':
        return <div className="p-2" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '50%' }}><UserPlus size={20} /></div>;
      case 'PAYMENT_APPROVED':
        return <div className="p-2" style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)', borderRadius: '50%' }}><DollarSign size={20} /></div>;
      default:
        return <div className="p-2" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', borderRadius: '50%' }}><Activity size={20} /></div>;
    }
  };

  const renderActivityText = (activity: any) => {
    const name = activity.profiles ? `${activity.profiles.first_name} ${activity.profiles.last_name}` : 'Someone';
    
    switch(activity.action_type) {
      case 'USER_JOINED':
        return <span>🎉 <strong>{name}</strong> joined the trip!</span>;
      case 'PAYMENT_APPROVED':
        return <span>💸 <strong>{name}</strong> paid their installment! (Amount: {activity.details?.amount || 0} THB)</span>;
      default:
        return <span>New activity from <strong>{name}</strong></span>;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="main-content" style={{ overflowY: 'auto' }}>
        <header className="flex-between w-full mb-6">
          <div>
            <h2 className="text-xl font-bold flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} className="text-accent-teal" /> {t('Activity Feed')}
            </h2>
            <p className="text-muted text-sm">Stay updated on trip progress and member actions</p>
          </div>
          <button className="glass-panel" style={{ padding: '0.6rem', borderRadius: '50%' }}>
            <Bell size={18} />
          </button>
        </header>

        <div className="glass-panel p-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {loading ? (
            <p className="text-center text-muted py-8">Loading activities...</p>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity size={48} className="text-muted mb-4 mx-auto" opacity={0.5} />
              <p className="text-muted">No activities yet. Join the trip to see updates here!</p>
            </div>
          ) : (
            <div className="flex-col gap-6 relative">
              {/* Timeline vertical line */}
              <div style={{ position: 'absolute', left: '1.4rem', top: '1rem', bottom: '1rem', width: '2px', background: 'var(--card-border)', zIndex: 0 }}></div>
              
              {activities.map((activity, index) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-4 relative z-10"
                  style={{ alignItems: 'flex-start' }}
                >
                  <div style={{ zIndex: 2, background: 'var(--bg-main)', padding: '0.2rem' }}>
                    {renderActivityIcon(activity.action_type)}
                  </div>
                  
                  <div className="glass-panel p-4" style={{ flex: 1, borderRadius: 'var(--radius-md)' }}>
                    <p className="text-sm mb-1">{renderActivityText(activity)}</p>
                    <p className="text-xs text-muted">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
