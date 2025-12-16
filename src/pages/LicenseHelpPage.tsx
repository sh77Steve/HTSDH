import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { MessageList } from '../components/MessageList';
import { SendMessage } from '../components/SendMessage';
import { TermsModal } from '../components/TermsModal';
import { useRanch } from '../contexts/RanchContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Key, HelpCircle, RefreshCw } from 'lucide-react';

export function LicenseHelpPage() {
  const { currentRanch, licenseInfo, refreshRanch } = useRanch();
  const { showToast } = useToast();
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [showTermsReminder, setShowTermsReminder] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [savingContact, setSavingContact] = useState(false);
  const [refreshMessages, setRefreshMessages] = useState(0);

  useEffect(() => {
    if (currentRanch) {
      setContactInfo({
        name: currentRanch.contact_name || '',
        email: currentRanch.contact_email || '',
        phone: currentRanch.contact_phone || '',
      });
    }
  }, [currentRanch]);

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licenseKey.trim()) {
      showToast('Please enter a license key', 'error');
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
        .eq('key', licenseKey.trim().toUpperCase())
        .maybeSingle();

      if (keyError || !keyData) {
        showToast('Invalid license key', 'error');
        setActivating(false);
        return;
      }

      if (keyData.used_by_ranch_id && keyData.used_by_ranch_id !== currentRanch.id) {
        showToast('This license key is already in use by another ranch', 'error');
        setActivating(false);
        return;
      }

      const expirationDate = new Date(keyData.expiration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expirationDate < today) {
        showToast('This license key has expired', 'error');
        setActivating(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('ranches')
        .update({
          license_type: keyData.license_type,
          license_expiration: keyData.expiration_date,
          max_animals: keyData.max_animals,
        })
        .eq('id', currentRanch.id);

      if (updateError) throw updateError;

      const { error: keyUpdateError } = await supabase
        .from('license_keys')
        .update({ used_by_ranch_id: currentRanch.id })
        .eq('id', keyData.id);

      if (keyUpdateError) throw keyUpdateError;

      showToast('License activated successfully!', 'success');
      setLicenseKey('');
      await refreshRanch();
      setShowTermsReminder(true);
    } catch (error) {
      console.error('Error activating license:', error);
      showToast('Failed to activate license', 'error');
    } finally {
      setActivating(false);
    }
  };

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRanch) return;

    setSavingContact(true);
    try {
      const { error } = await supabase
        .from('ranches')
        .update({
          contact_name: contactInfo.name || null,
          contact_email: contactInfo.email || null,
          contact_phone: contactInfo.phone || null,
        })
        .eq('id', currentRanch.id);

      if (error) throw error;

      showToast('Contact information saved', 'success');
      await refreshRanch();
    } catch (error) {
      console.error('Error saving contact info:', error);
      showToast('Failed to save contact information', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const getStatusColor = () => {
    switch (licenseInfo.status) {
      case 'valid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'grace_period':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
      case 'no_license':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (licenseInfo.status) {
      case 'valid':
        return `Valid - Expires in ${licenseInfo.daysUntilExpiration} days`;
      case 'grace_period':
        return `Grace Period - ${licenseInfo.daysInGracePeriod} days expired`;
      case 'expired':
        return 'Expired';
      case 'no_license':
        return 'No Active License';
      default:
        return 'Unknown';
    }
  };

  if (!currentRanch) {
    return (
      <Layout currentPage="license">
        <div className="text-center py-12">
          <p className="text-gray-600">Please select a ranch first</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="license">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">License & Help</h1>
          <p className="text-gray-600 mt-1">Manage your license and get support</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">License Status</h2>
          </div>

          <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{getStatusText()}</p>
                {licenseInfo.expirationDate && (
                  <p className="text-sm mt-1">
                    Expiration Date: {new Date(licenseInfo.expirationDate).toLocaleDateString()}
                  </p>
                )}
                {licenseInfo.maxAnimals !== null && (
                  <p className="text-sm mt-1">
                    Animal Limit: {licenseInfo.maxAnimals} animals
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleActivateLicense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter License Key
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                  disabled={activating}
                />
                <button
                  type="submit"
                  disabled={activating || !licenseKey.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {activating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    'Activate'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
          </div>

          <form onSubmit={handleSaveContactInfo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                value={contactInfo.name}
                onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingContact}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingContact ? 'Saving...' : 'Save Contact Info'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Messages</h2>
          <p className="text-sm text-gray-600 mb-4">
            Last 3 messages with HTSDH Bovine Support
          </p>

          <MessageList
            key={refreshMessages}
            ranchId={currentRanch.id}
            limit={3}
          />

          <div className="mt-6 pt-6 border-t border-gray-200">
            <SendMessage
              ranchId={currentRanch.id}
              onMessageSent={() => setRefreshMessages(prev => prev + 1)}
            />
          </div>
        </div>
      </div>

      {showTermsReminder && (
        <TermsModal
          onAccept={() => setShowTermsReminder(false)}
          canClose={true}
        />
      )}
    </Layout>
  );
}
