import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function parseFormattedText(text: string): JSX.Element[] {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    const boldRegex = /\*\*(.*?)\*\*/g;
    const underlineRegex = /__(.*?)__/g;

    const allMatches: Array<{ index: number; length: number; text: string; type: 'bold' | 'underline' }> = [];

    let match;
    while ((match = boldRegex.exec(line)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        text: match[1],
        type: 'bold'
      });
    }

    while ((match = underlineRegex.exec(line)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        text: match[1],
        type: 'underline'
      });
    }

    allMatches.sort((a, b) => a.index - b.index);

    allMatches.forEach((m, i) => {
      if (m.index > lastIndex) {
        parts.push(
          <span key={`text-${lineIndex}-${i}`}>
            {line.substring(lastIndex, m.index)}
          </span>
        );
      }

      if (m.type === 'bold') {
        parts.push(
          <strong key={`bold-${lineIndex}-${i}`} className="font-bold">
            {m.text}
          </strong>
        );
      } else {
        parts.push(
          <span key={`underline-${lineIndex}-${i}`} className="underline">
            {m.text}
          </span>
        );
      }

      lastIndex = m.index + m.length;
    });

    if (lastIndex < line.length) {
      parts.push(
        <span key={`text-${lineIndex}-end`}>
          {line.substring(lastIndex)}
        </span>
      );
    }

    if (parts.length === 0) {
      parts.push(<span key={`empty-${lineIndex}`}>{line}</span>);
    }

    const isEmpty = line.trim().length === 0;

    return (
      <div key={`line-${lineIndex}`} className={isEmpty ? 'h-4' : ''}>
        {parts}
      </div>
    );
  });
}

export function TipsModal({ isOpen, onClose }: TipsModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTips();
    }
  }, [isOpen]);

  async function loadTips() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tips_tricks')
        .select('content')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (error) throw error;

      setContent(data?.content || 'No tips & tricks available yet.');
    } catch (error) {
      console.error('Error loading tips & tricks:', error);
      setContent('Failed to load tips & tricks.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Tips & Tricks</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors -mr-2"
            aria-label="Close"
          >
            <X className="w-6 h-6 md:w-7 md:h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Loading...</div>
            </div>
          ) : (
            <div className="prose max-w-none">
              <div className="font-sans text-gray-800 text-base leading-relaxed">
                {parseFormattedText(content)}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center md:justify-end p-4 md:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
