import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, MailOpen } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

interface MessageListProps {
  ranchId: string;
  isAdmin?: boolean;
  limit?: number;
}

export function MessageList({ ranchId, isAdmin = false, limit }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [ranchId, limit]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('ranch_id', ranchId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`p-4 rounded-lg border ${
            message.read
              ? 'bg-gray-50 border-gray-200'
              : 'bg-blue-50 border-blue-200'
          }`}
          onClick={() => !message.read && markAsRead(message.id)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {message.read ? (
                <MailOpen className="w-4 h-4 text-gray-400" />
              ) : (
                <Mail className="w-4 h-4 text-blue-600" />
              )}
              <span className="text-sm font-semibold text-gray-900">
                {message.from_admin ? 'HTSDH Bovine Support' : 'You'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(message.created_at)}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      ))}
    </div>
  );
}
