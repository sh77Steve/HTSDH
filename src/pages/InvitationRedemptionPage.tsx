import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
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
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ranchName, setRanchName] = useState('');
  const [ranchLocation, setRanchLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (invitationCode) {
      validateAndProcess(invitationCode);
    } else {
      setValidating(false);
      setError('No invitation code provided');
    }
  }, [invitationCode, user]);

  const validateAndProcess = async (code: string) => {
    setValidating(true);
    setError(null);

    const { invitation: validatedInvitation, error: validationError } =
      await validateInvitationCode(code);

    if (validationError) {
      setError(validationError);
      setInvitation(null);
      setValidating(false);
      return;
    }

    setInvitation(validatedInvitation);

    if (validatedInvitation?.type === 'ranch_member' && user) {
      if (
        validatedInvitation.restricted_email &&
        user.email === validatedInvitation.restricted_email
      ) {
        const { data: existingMember } = await supabase
          .from('user_ranches')
          .select('id')
          .eq('user_id', user.id)
          .eq('ranch_id', validatedInvitation.ranch_id!)
          .maybeSingle();

        if (existingMember) {
          setAlreadyMember(true);
          setValidating(false);
          return;
        }

        await handleRedeemRanchMember(validatedInvitation.id, user.id);
      }
    }

    setValidating(false);
  };

  const handleRedeemRanchMember = async (invitationId: string, userId: string, shouldRedirect: boolean = true) => {
    const { success: redeemSuccess, error: redeemError } = await redeemRanchMemberInvitation(
      invitationId,
      userId
    );

    if (redeemError) {
      setError(`Failed to join ranch: ${redeemError.message}`);
      return;
    }

    if (redeemSuccess) {
      setSuccess(true);
      showToast('User successfully added to ranch!', 'success');

      if (shouldRedirect) {
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation?.restricted_email) {
      setError('Invalid invitation: no email specified');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentSession = user ? await supabase.auth.getSession() : null;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.restricted_email,
        password: password.trim(),
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: invitation.restricted_email,
              password: password.trim(),
            });

          if (signInError) {
            setError('Incorrect password. Please try again.');
            setLoading(false);
            return;
          }

          if (signInData.user) {
            await handleRedeemRanchMember(invitation.id, signInData.user.id, !currentSession?.data.session);

            if (currentSession?.data.session) {
              await supabase.auth.setSession(currentSession.data.session);
            }
          }
        } else {
          throw signUpError;
        }
      } else if (signUpData.user) {
        await handleRedeemRanchMember(invitation.id, signUpData.user.id, !currentSession?.data.session);

        if (currentSession?.data.session) {
          await supabase.auth.setSession(currentSession.data.session);
        }
      }
    } catch (err: any) {
      console.error('Error during authentication:', err);
      setError(err.message || 'Failed to authenticate');
      setLoading(false);
    }
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

  const handleLogout = async () => {
    try {
      await signOut();
      setError(null);
      setAlreadyMember(false);
    } catch (error) {
      showToast('Failed to log out', 'error');
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
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
              ? 'Ranch created successfully.'
              : 'User added to ranch successfully.'}
          </p>
          <p className="text-gray-600 mt-2">Refreshing page...</p>
        </div>
      </div>
    );
  }

  if (alreadyMember) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Already a Member</h2>
          <p className="text-gray-600 mb-6">You're already a member of this ranch.</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h2>
          {error && <p className="text-red-600 mb-6">{error}</p>}
          <a
            href="/"
            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (invitation.type === 'ranch_creation') {
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your Ranch</h2>
            <p className="text-gray-600 mb-6">
              Sign up or log in to create your ranch with this license.
            </p>
            <div className="space-y-3">
              <a
                href={`/signup${invitationCode ? `?invite=${invitationCode}` : ''}`}
                className="block w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
              >
                Sign Up
              </a>
              <a
                href={`/login${invitationCode ? `?invite=${invitationCode}` : ''}`}
                className="block w-full px-6 py-3 bg-white hover:bg-gray-50 text-green-600 font-semibold rounded-lg border-2 border-green-600 transition"
              >
                Log In
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Ranch</h1>
          <p className="text-gray-600 mb-6">Complete the details to create your ranch</p>

          <form onSubmit={handleRedeemRanchCreation} className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-green-900">Ranch Creation Invitation</p>
              <p className="text-sm text-green-700 mt-1">
                You're creating a new ranch with a licensed account.
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Ranch</h1>
        <p className="text-gray-600 mb-6">
          Set a password for <strong>{invitation.restricted_email}</strong> to join the ranch
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900">Ranch Member Invitation</p>
            <p className="text-sm text-blue-700 mt-1">
              They'll join as a <strong>{invitation.role}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={invitation.restricted_email || ''}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password for this user"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              If the account doesn't exist, it will be created
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Add to Ranch'}
          </button>
        </form>
      </div>
    </div>
  );
}
