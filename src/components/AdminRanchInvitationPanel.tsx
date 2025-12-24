import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Mail } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import {
  createRanchCreationInvitation,
  getAvailableLicenseKeys,
  deleteInvitation,
  type LicenseKey,
  type Invitation,
} from '../utils/invitations';
import { supabase } from '../lib/supabase';

interface AdminRanchInvitationPanelProps {
  refreshTrigger?: number;
}

export function AdminRanchInvitationPanel({ refreshTrigger }: AdminRanchInvitationPanelProps) {
  const { showToast } = useToast();
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [selectedLicenseKey, setSelectedLicenseKey] = useState('');
  const [restrictedEmail, setRestrictedEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const keys = await getAvailableLicenseKeys();
      setLicenseKeys(keys);

      const { data: invitesData } = await supabase
        .from('invitations')
        .select('*')
        .eq('type', 'ranch_creation')
        .order('created_at', { ascending: false });

      setInvitations(invitesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load invitation data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLicenseKey) {
      showToast('Please select a license key', 'error');
      return;
    }

    setCreating(true);

    const { invitation, error } = await createRanchCreationInvitation(
      selectedLicenseKey,
      restrictedEmail.trim() || null,
      parseInt(expiresInDays)
    );

    if (error) {
      showToast(`Failed to create invitation: ${error.message}`, 'error');
    } else if (invitation) {
      showToast('Invitation created successfully!', 'success');
      setShowForm(false);
      setSelectedLicenseKey('');
      setRestrictedEmail('');
      setExpiresInDays('7');
      loadData();
    }

    setCreating(false);
  };

  const handleCopyInvitation = (code: string) => {
    const inviteLink = `${window.location.origin}/redeem-invitation?code=${code}`;
    navigator.clipboard.writeText(inviteLink);
    showToast('Invitation link copied to clipboard!', 'success');
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return;

    const success = await deleteInvitation(invitationId);
    if (success) {
      showToast('Invitation deleted', 'success');
      loadData();
    } else {
      showToast('Failed to delete invitation', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ranch Creation Invitations</h2>
          <p className="text-sm text-gray-600 mt-1">Create invitations for new ranch owners</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Invitation
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateInvitation} className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Key <span className="text-red-500">*</span>
            </label>
            {licenseKeys.length === 0 ? (
              <p className="text-sm text-gray-600">
                No available license keys. Please create license keys before creating invitations.
              </p>
            ) : (
              <select
                value={selectedLicenseKey}
                onChange={(e) => setSelectedLicenseKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select a license key...</option>
                {licenseKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.key} - {key.license_type} ({key.max_animals} animals) - Expires{' '}
                    {formatDate(key.expiration_date)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restrict to Email (optional)
            </label>
            <input
              type="email"
              value={restrictedEmail}
              onChange={(e) => setRestrictedEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              If set, only this email address can redeem the invitation
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires In (days)
            </label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              min="1"
              max="90"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setSelectedLicenseKey('');
                setRestrictedEmail('');
                setExpiresInDays('7');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || licenseKeys.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Invitation'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {invitations.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No invitations created yet</p>
        ) : (
          invitations.map((invitation) => (
            <div
              key={invitation.id}
              className={`border rounded-lg p-4 ${
                invitation.used_at
                  ? 'bg-gray-50 border-gray-200'
                  : new Date(invitation.expires_at) < new Date()
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-lg font-bold text-gray-900">{invitation.code}</p>
                    {invitation.used_at ? (
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                        Used
                      </span>
                    ) : new Date(invitation.expires_at) < new Date() ? (
                      <span className="px-2 py-1 bg-red-200 text-red-700 text-xs font-medium rounded">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-200 text-green-700 text-xs font-medium rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {invitation.restricted_email && (
                      <p className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Restricted to: {invitation.restricted_email}
                      </p>
                    )}
                    <p>Expires: {formatDate(invitation.expires_at)}</p>
                    {invitation.used_at && <p>Used: {formatDate(invitation.used_at)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!invitation.used_at && new Date(invitation.expires_at) >= new Date() && (
                    <button
                      onClick={() => handleCopyInvitation(invitation.code)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Copy invitation link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteInvitation(invitation.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete invitation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
