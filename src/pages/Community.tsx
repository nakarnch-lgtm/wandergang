import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Users, Send, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export const Community: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase.channel('community_messages_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, () => {
        fetchMessages(); // Re-fetch to get joined profile data
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('community_messages')
      .select(`
        *,
        profiles:user_id(first_name, last_name, avatar_url)
      `)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear input optimistically

    const { error } = await supabase.from('community_messages').insert({
      user_id: user.id,
      message: messageText
    });

    if (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message.');
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <main className="main-content flex-col" style={{ height: '100vh', overflow: 'hidden', paddingRight: 0 }}>
        <header className="flex-between w-full mb-6" style={{ paddingRight: '2rem' }}>
          <div>
            <h2 className="text-xl font-bold flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <Users size={24} className="text-accent-teal" /> {t('Community Webboard')}
            </h2>
            <p className="text-muted text-sm">Chat and discuss the trip with your gang!</p>
          </div>
        </header>

        <div className="glass-panel flex-col" style={{ flex: 1, marginRight: '2rem', marginBottom: '2rem', overflow: 'hidden', position: 'relative' }}>
          
          {/* Chat Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <p className="text-center text-muted py-8">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 flex-col flex-center" style={{ flex: 1 }}>
                <MessageSquare size={48} className="text-muted mb-4" opacity={0.5} />
                <p className="text-muted">No messages yet. Be the first to say hi!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === user?.id;
                const name = msg.profiles ? `${msg.profiles.first_name} ${msg.profiles.last_name}` : 'Unknown';
                
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isMe && <span className="text-xs text-muted mb-1 ml-1">{name}</span>}
                    
                    <div 
                      style={{ 
                        background: isMe ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
                        color: isMe ? '#000' : 'var(--text-main)',
                        padding: '0.75rem 1rem',
                        borderRadius: isMe ? 'var(--radius-lg) var(--radius-lg) 0 var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 0',
                        border: isMe ? 'none' : '1px solid var(--card-border)'
                      }}
                    >
                      {msg.message}
                    </div>
                    
                    <span className="text-xs text-muted mt-1 mr-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..." 
                style={{ 
                  flex: 1, 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--card-border)', 
                  padding: '0.75rem 1rem', 
                  borderRadius: 'var(--radius-full)', 
                  color: 'var(--text-main)',
                  outline: 'none'
                }} 
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                style={{ 
                  background: newMessage.trim() ? 'var(--accent-teal)' : 'rgba(255,255,255,0.1)',
                  color: newMessage.trim() ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: newMessage.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
