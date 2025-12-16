import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useRanch } from '../contexts/RanchContext';
import { X, Key } from 'lucide-react';
import { validateLicenseKeyFormat } from '../utils/licenseKeyGenerator';

interface LicenseActivationModalProps {
  onClose: () => void;
  onActivated: () => void;
}

export default function LicenseActivationModal({ onClose, onActivated }: LicenseActivationModalProps) {
  const { showToast } = useToast();
  const { currentRanch, refreshRanchData } = useRanch();
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    const trimmedKey = licenseKey.trim().toUpperCase();

    if (!trimmedKey) {
      showToast('Please enter a license key', 'error');
      return;
    }

    if (!validateLicenseKeyFormat(trimmedKey)) {
      showToast('Invalid license key format', 'error');
      return;
    }

    if (!currentRanch) {
      showToast('No ranch selected', 'error');
      return;
    }

    setActivating(true);

    try {
      const { data: keyData, error: keyError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('key', trimmedKey)
        .maybeSingle();

      if (keyError) {
        console.error('Error checking license key:', keyError);
        showToast('Failed to validate license key', 'error');
        setActivating(false);
        return;
      }

      if (!keyData) {
        showToast('License key not found', 'error');
        setActivating(false);
        return;
      }

      if (keyData.used_by_ranch_id) {
        showToast('This license key has already been used', 'error');
        setActivating(false);
        return;
      }

      const { error: updateKeyError } = await supabase
        .from('license_keys')
        .update({ used_by_ranch_id: currentRanch.id })
        .eq('id', keyData.id);

      if (updateKeyError) {
        console.error('Error updating license key:', updateKeyError);
        showToast('Failed to activate license key', 'error');
        setActivating(false);
        return;
      }

      const { error: updateRanchError } = await supabase
        .from('ranches')
        .update({
          active_license_key: trimmedKey,
          license_type: keyData.license_type,
          license_expiration: keyData.expiration_date,
          license_activated_at: new Date().toISOString(),
          max_animals: keyData.max_animals,
        })
        .eq('id', currentRanch.id);

      if (updateRanchError) {
        console.error('Error updating ranch license:', updateRanchError);
        showToast('Failed to activate license', 'error');
        setActivating(false);
        return;
      }

      showToast('License activated successfully!', 'success');
      await refreshRanchData();
      onActivated();
      onClose();
    } catch (error) {
      console.error('Error activating license:', error);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Activate License</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Enter your license key to activate your subscription and unlock full access to the application.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Key
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="HERD-2025-XXXX-XXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
              disabled={activating}
            />
            <p className="mt-2 text-xs text-gray-500">
              Format: HERD-YYYY-XXXX-XXXX
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={activating}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {activating ? 'Activating...' : 'Activate License'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
