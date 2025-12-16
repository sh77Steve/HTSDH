import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TermsModalProps {
  onAccept: () => void;
  canClose?: boolean;
}

const TERMS_VERSION = '2.0';

const TERMS_TEXT = `
HERDINFO - TERMS OF SERVICE AND SOFTWARE LICENSE
by Amador Software

By using this software, you agree to the following terms:

1. LICENSE GRANT
Subject to these terms and payment of applicable license fees, you are granted a non-exclusive, non-transferable license to use this software for ranch management and cattle record-keeping purposes.

2. SOFTWARE "AS IS"
This software is provided "as is" without warranty of any kind, either expressed or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.

3. USER RESPONSIBILITIES
You are solely responsible for:
- The accuracy and completeness of all data entered into the system
- Maintaining adequate backups of your data
- Compliance with all applicable laws and regulations regarding animal record keeping
- Protecting access credentials and maintaining data security
- Verifying all information before making business decisions

4. INTENDED USE
This software is intended as a record-keeping and management tool only. It is designed to assist with organizing and tracking cattle-related information. All decisions regarding animal health, breeding, sales, and ranch management remain your sole responsibility.

5. PROFESSIONAL CONSULTATION
Always consult with qualified professionals (veterinarians, agricultural advisors, legal counsel, accountants, etc.) before making important decisions related to your ranch operations, animal health, or business matters.

6. MEDICAL DISCLAIMER
This software does not provide veterinary or medical advice. The medical history features are for record-keeping purposes only. For any health concerns, diagnosis, treatment, or medical advice regarding your animals, always consult a licensed veterinarian.

7. DATA SECURITY AND PRIVACY
While we implement reasonable security measures to protect your data, you acknowledge that no system can be completely secure. We use industry-standard practices to safeguard your information, but you remain responsible for maintaining the confidentiality of your account credentials.

8. LICENSE COMPLIANCE
You agree to use only valid, properly licensed copies of this software. Unauthorized use, distribution, or sharing of license keys is prohibited and may result in termination of your license.

9. UPDATES AND MODIFICATIONS
We may update, modify, or enhance the software from time to time. We reserve the right to modify these terms with notice to users. Continued use of the software after changes constitutes acceptance of the updated terms.

10. TERMINATION
Your license to use this software continues until terminated. Your rights under this license will terminate automatically if you fail to comply with any of these terms. Upon termination, you must cease all use of the software.

11. LIMITATION OF LIABILITY
To the maximum extent permitted by applicable law, in no event shall the software provider be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of or inability to use the software.

12. DISPUTE RESOLUTION
Any disputes arising from the use of this software shall be resolved through good faith negotiation. If negotiation fails, disputes shall be resolved in accordance with applicable law.

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
