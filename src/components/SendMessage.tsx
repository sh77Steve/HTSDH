import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Send } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface SendMessageProps {
  ranchId: string;
  isAdmin?: boolean;
  onMessageSent?: () => void;
}

export function SendMessage({ ranchId, isAdmin = false, onMessageSent }: SendMessageProps) {
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        ranch_id: ranchId,
        from_admin: isAdmin,
        content: content.trim(),
        read: false,
      });

      if (error) throw error;

      showToast('Message sent successfully', 'success');
      setContent('');
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isAdmin ? 'Message to Ranch' : 'Message to Support'}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Type your message here..."
          disabled={sending}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  );
}
