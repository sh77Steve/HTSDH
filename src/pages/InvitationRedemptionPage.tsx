import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  validateInvitationCode,
  redeemRanchCreationInvitation,
  redeemRanchMemberInvitation,
  type Invitation,
} from '../utils/invitations';

interface InvitationRedemptionPageProps {
  invitationCode?: string;
}

export function InvitationRedemptionPage({ invitationCode }: InvitationRedemptionPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(!!invitationCode);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [code, setCode] = useState(invitationCode || '');
  const [ranchName, setRanchName] = useState('');
  const [ranchLocation, setRanchLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (invitationCode && user) {
      validateCode(invitationCode);
    }
  }, [invitationCode, user]);

  const validateCode = async (codeToValidate: string) => {
    if (!codeToValidate.trim()) {
      setError('Please enter an invitation code');
      return;
    }

    setValidating(true);
    setError(null);

    const { invitation: validatedInvitation, error: validationError } =
      await validateInvitationCode(codeToValidate);

    if (validationError) {
      setError(validationError);
      setInvitation(null);
    } else {
      setInvitation(validatedInvitation);
      setError(null);
    }

    setValidating(false);
  };

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    validateCode(code);
  };

  const handleRedeemRanchCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation || !user) return;

    if (!ranchName.trim()) {
      showToast('Please enter a ranch name', 'error');
      return;
    }

    setLoading(true);

    const { ranchId, error: redeemError } = await redeemRanchCreationInvitation(
      invitation.id,
      user.id,
      ranchName.trim(),
      ranchLocation.trim() || null
    );

    if (redeemError) {
      showToast(`Failed to create ranch: ${redeemError.message}`, 'error');
      setLoading(false);
      return;
    }

    setSuccess(true);
    showToast('Ranch created successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  const handleRedeemRanchMember = async () => {
    if (!invitation || !user) return;

    setLoading(true);

    const { success: redeemSuccess, error: redeemError } = await redeemRanchMemberInvitation(
      invitation.id,
      user.id
    );

    if (redeemError) {
      showToast(`Failed to join ranch: ${redeemError.message}`, 'error');
      setLoading(false);
      return;
    }

    if (redeemSuccess) {
      setSuccess(true);
      showToast('Successfully joined ranch!', 'success');

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            You need to sign in or create an account to redeem this invitation.
          </p>
          <a
            href={`/signup${invitationCode ? `?invite=${invitationCode}` : ''}`}
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Sign Up
          </a>
          <a
            href={`/login${invitationCode ? `?invite=${invitationCode}` : ''}`}
            className="inline-block ml-4 px-6 py-3 text-green-600 hover:bg-green-50 font-semibold rounded-lg transition"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Success!</h2>
          <p className="text-gray-600">
            {invitation?.type === 'ranch_creation'
              ? 'Your ranch has been created.'
              : 'You have joined the ranch.'}
          </p>
          <p className="text-gray-600 mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Redeem Invitation</h1>
        <p className="text-gray-600 text-center mb-8">Enter your invitation code to continue</p>

        {!invitation ? (
          <form onSubmit={handleValidate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC12345"
                maxLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-mono text-center uppercase"
                required
                disabled={validating}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={validating}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {validating ? 'Validating...' : 'Validate Code'}
            </button>
          </form>
        ) : invitation.type === 'ranch_creation' ? (
          <form onSubmit={handleRedeemRanchCreation} className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-green-900">Ranch Creation Invitation</p>
              <p className="text-sm text-green-700 mt-1">
                You're invited to create a new ranch with a licensed account.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ranch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ranchName}
                onChange={(e) => setRanchName(e.target.value)}
                placeholder="Enter ranch name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ranch Location (optional)
              </label>
              <input
                type="text"
                value={ranchLocation}
                onChange={(e) => setRanchLocation(e.target.value)}
                placeholder="City, State"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creating Ranch...' : 'Create Ranch'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Ranch Member Invitation</p>
              <p className="text-sm text-blue-700 mt-1">
                You're invited to join a ranch as a <strong>{invitation.role}</strong>.
              </p>
            </div>

            <button
              onClick={handleRedeemRanchMember}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Joining Ranch...' : 'Accept Invitation'}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
