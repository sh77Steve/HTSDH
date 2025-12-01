import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TermsModalProps {
  onAccept: () => void;
  canClose?: boolean;
}

const TERMS_VERSION = '1.0';

const TERMS_TEXT = `
HTSDH BOVINE DATABASE - LIABILITY AGREEMENT

By using this software, you agree to the following terms:

1. NO WARRANTY
This software is provided "as is" without warranty of any kind, either expressed or implied, including but not limited to the implied warranties of merchantability and fitness for a particular purpose.

2. LIMITATION OF LIABILITY
In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

3. DATA RESPONSIBILITY
You are solely responsible for:
- The accuracy and completeness of all data entered into the system
- Maintaining adequate backups of your data
- Compliance with all applicable laws and regulations regarding animal record keeping
- Protecting access credentials and maintaining data security

4. USE AT YOUR OWN RISK
The software is intended as a record-keeping tool only. All decisions regarding animal health, breeding, sales, and management remain your sole responsibility. Always consult with qualified professionals (veterinarians, agricultural advisors, etc.) before making important decisions.

5. MEDICAL DISCLAIMER
This software does not provide medical advice. The medical history features are for record-keeping purposes only. Always consult a licensed veterinarian for diagnosis, treatment, and medical advice.

6. DATA PRIVACY
While we implement security measures to protect your data, you acknowledge that no system is completely secure. You are responsible for maintaining the confidentiality of your account credentials.

7. CHANGES TO SOFTWARE
The software may be updated, modified, or discontinued at any time without notice. We reserve the right to modify these terms at any time.

By clicking "I Accept" below, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
`.trim();

export function TermsModal({ onAccept, canClose = false }: TermsModalProps) {
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    if (scrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!user) return;

    setAccepting(true);
    try {
      const { error } = await supabase.from('terms_acceptances').insert({
        user_id: user.id,
        terms_version: TERMS_VERSION,
        accepted_at: new Date().toISOString(),
      });

      if (error) throw error;

      onAccept();
    } catch (error: any) {
      console.error('Error saving terms acceptance:', error);
      alert(`Failed to save terms acceptance: ${error?.message || 'Unknown error'}`);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Terms and Conditions</h2>
              <p className="text-sm text-gray-600 mt-1">Please read and accept to continue</p>
            </div>
          </div>
          {canClose && (
            <button
              onClick={onAccept}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          onScroll={handleScroll}
        >
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
              {TERMS_TEXT}
            </pre>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              {!hasScrolledToBottom && 'Please scroll to the bottom to accept the terms'}
              {hasScrolledToBottom && 'You have read the terms and conditions'}
            </p>
            <button
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || accepting}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Accepting...' : 'I Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
