import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Users } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useRanch } from '../contexts/RanchContext';
import {
  createRanchMemberInvitation,
  getRanchInvitations,
  deleteInvitation,
  type Invitation,
} from '../utils/invitations';

const AVAILABLE_ROLES = [
  { value: 'MANAGER', label: 'Manager', description: 'Can manage ranch and invite users' },
  { value: 'RANCHHAND', label: 'Ranch Hand', description: 'Can manage animals and records' },
  { value: 'VIEWER', label: 'Viewer', description: 'Can view data only' },
  { value: 'VET', label: 'Veterinarian', description: 'Can view and add medical records' },
];

export function RanchMemberInvitationPanel() {
  const { showToast } = useToast();
  const { currentRanch } = useRanch();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [selectedRole, setSelectedRole] = useState('RANCHHAND');
  const [restrictedEmail, setRestrictedEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');

  useEffect(() => {
    if (currentRanch) {
      loadInvitations();
    }
  }, [currentRanch]);

  const loadInvitations = async () => {
    if (!currentRanch) return;

    setLoading(true);
    try {
      const data = await getRanchInvitations(currentRanch.id);
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
      showToast('Failed to load invitations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRanch) return;

    setCreating(true);

    const { invitation, error } = await createRanchMemberInvitation(
      currentRanch.id,
      selectedRole,
      restrictedEmail.trim() || null,
      parseInt(expiresInDays)
    );

    if (error) {
      showToast(`Failed to create invitation: ${error.message}`, 'error');
    } else if (invitation) {
      showToast('Invitation created successfully!', 'success');
      setShowForm(false);
      setSelectedRole('RANCHHAND');
      setRestrictedEmail('');
      setExpiresInDays('7');
      loadInvitations();
    }

    setCreating(false);
  };

  const handleCopyInvitation = (code: string) => {
    const inviteLink = `${window.location.origin}/signup?invite=${code}`;
    navigator.clipboard.writeText(inviteLink);
    showToast('Invitation link copied to clipboard!', 'success');
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return;

    const success = await deleteInvitation(invitationId);
    if (success) {
      showToast('Invitation deleted', 'success');
      loadInvitations();
    } else {
      showToast('Failed to delete invitation', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
          <h2 className="text-xl font-bold text-gray-900">Invite Users to Ranch</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add team members to {currentRanch?.name || 'your ranch'}
          </p>
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
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              {AVAILABLE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address (optional but recommended)
            </label>
            <input
              type="email"
              value={restrictedEmail}
              onChange={(e) => setRestrictedEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: Only this email address will be able to redeem the invitation
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
                setSelectedRole('RANCHHAND');
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
              disabled={creating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Invitation'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {invitations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No invitations created yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create an invitation to add team members to your ranch
            </p>
          </div>
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
                    <p>
                      Role: <span className="font-medium">{invitation.role}</span>
                    </p>
                    {invitation.restricted_email && <p>For: {invitation.restricted_email}</p>}
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
