import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { generateLicenseKey } from '../utils/licenseKeyGenerator';
import { MessageList } from '../components/MessageList';
import { SendMessage } from '../components/SendMessage';
import { AdminRanchInvitationPanel } from '../components/AdminRanchInvitationPanel';
import { Key, Plus, CheckCircle, XCircle, ArrowLeft, Users, RefreshCw, Lock, MessageSquare, Send, FileText, Upload, Download, UploadCloud } from 'lucide-react';
import type { LicenseType } from '../lib/database.types';
import { downloadBackup, restoreFromBackup } from '../utils/backupRestore';

interface LicenseKey {
  id: string;
  key: string;
  license_type: LicenseType;
  expiration_date: string;
  used_by_ranch_id: string | null;
  created_at: string;
  max_animals: number;
}

interface Ranch {
  id: string;
  name: string;
  license_type: LicenseType | null;
  license_expiration: string | null;
  max_animals: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface RanchWithStats extends Ranch {
  animal_count: number;
  unread_messages: number;
}

export default function LicenseManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [licenseKeys, setLicenseKeys] = useState<LicenseKey[]>([]);
  const [ranches, setRanches] = useState<RanchWithStats[]>([]);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [selectedRanch, setSelectedRanch] = useState<RanchWithStats | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshMessages, setRefreshMessages] = useState(0);
  const [showTipsImport, setShowTipsImport] = useState(false);
  const [tipsFile, setTipsFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreRanchId, setRestoreRanchId] = useState('');
  const [restoreMode, setRestoreMode] = useState<'missing' | 'replace'>('missing');
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  const [invitationRefreshTrigger, setInvitationRefreshTrigger] = useState(0);

  const [keyFormData, setKeyFormData] = useState({
    expirationDate: '',
    maxAnimals: 50,
  });

  const [passwordResetData, setPasswordResetData] = useState({
    ranchId: '',
    newPassword: '',
  });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [settingUpDemo, setSettingUpDemo] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin === true) {
      setRanches([]);
      setLicenseKeys([]);
      loadLicenseKeys();
      loadRanches();
    }
  }, [isAdmin]);

  async function checkAdminStatus() {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } else {
      setIsAdmin(!!data);
    }
    setLoading(false);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  }

  async function loadLicenseKeys() {
    const { data, error } = await supabase
      .from('license_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading license keys:', error);
      showToast('Failed to load license keys', 'error');
    } else {
      setLicenseKeys(data || []);
    }
  }

  async function loadRanches() {
    try {
      const { data: ranchesData, error: ranchesError } = await supabase
        .from('ranches')
        .select('*')
        .order('name', { ascending: true });

      if (ranchesError) throw ranchesError;

      const ranchesWithStats: RanchWithStats[] = await Promise.all(
        (ranchesData || []).map(async (ranch) => {
          const { count: animalCount } = await supabase
            .from('animals')
            .select('*', { count: 'exact', head: true })
            .eq('ranch_id', ranch.id);

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('ranch_id', ranch.id)
            .eq('from_admin', false)
            .eq('read', false);

          return {
            ...ranch,
            animal_count: animalCount || 0,
            unread_messages: unreadCount || 0,
          };
        })
      );

      setRanches(ranchesWithStats);
    } catch (error) {
      console.error('Error loading ranches:', error);
      showToast('Failed to load ranches', 'error');
    }
  }

  async function handleGenerateKey() {
    if (!keyFormData.expirationDate) {
      showToast('Please select an expiration date', 'error');
      return;
    }

    const key = generateLicenseKey();

    const { error } = await supabase.from('license_keys').insert({
      key,
      license_type: 'full',
      expiration_date: keyFormData.expirationDate,
      created_by_user_id: user?.id,
      max_animals: keyFormData.maxAnimals,
    });

    if (error) {
      console.error('Error generating license key:', error);
      showToast('Failed to generate license key', 'error');
    } else {
      showToast('License key generated successfully', 'success');
      setShowKeyForm(false);
      setKeyFormData({ expirationDate: '', maxAnimals: 50 });
      loadLicenseKeys();
      setInvitationRefreshTrigger(prev => prev + 1);
    }
  }

  async function handleBroadcast() {
    if (!broadcastMessage.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    setSending(true);
    try {
      const messages = ranches.map((ranch) => ({
        ranch_id: ranch.id,
        from_admin: true,
        content: broadcastMessage.trim(),
        read: false,
      }));

      const { error } = await supabase.from('messages').insert(messages);

      if (error) throw error;

      showToast(`Broadcast sent to ${ranches.length} ranches`, 'success');
      setBroadcastMessage('');
      setShowBroadcast(false);
      loadRanches();
    } catch (error) {
      console.error('Error broadcasting message:', error);
      showToast('Failed to send broadcast', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleResetPassword() {
    if (!passwordResetData.ranchId || !passwordResetData.newPassword) {
      showToast('Please select a ranch and enter a new password', 'error');
      return;
    }

    if (passwordResetData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setResettingPassword(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranch_id: passwordResetData.ranchId,
          new_password: passwordResetData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      showToast('Password reset successfully', 'success');
      setPasswordResetData({ ranchId: '', newPassword: '' });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showToast(error.message || 'Failed to reset password', 'error');
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleTipsImport() {
    if (!tipsFile) {
      showToast('Please select a file', 'error');
      return;
    }

    if (!tipsFile.name.endsWith('.txt')) {
      showToast('Please select a .txt file', 'error');
      return;
    }

    setUploading(true);
    try {
      const content = await tipsFile.text();

      const { error } = await supabase
        .from('tips_tricks')
        .update({
          content,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      showToast('Tips & Tricks updated successfully', 'success');
      setShowTipsImport(false);
      setTipsFile(null);
    } catch (error) {
      console.error('Error updating tips & tricks:', error);
      showToast('Failed to update Tips & Tricks', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    setBackupProgress('Starting backup...');
    try {
      await downloadBackup((message) => {
        setBackupProgress(message);
      });
      showToast('Backup completed successfully', 'success');
    } catch (error: any) {
      console.error('Error creating backup:', error);
      showToast(`Backup failed: ${error.message}`, 'error');
    } finally {
      setBackingUp(false);
      setBackupProgress('');
    }
  }

  async function handleRestore() {
    if (!restoreFile) {
      showToast('Please select a backup file', 'error');
      return;
    }

    if (!restoreFile.name.endsWith('.zip')) {
      showToast('Please select a .zip backup file', 'error');
      return;
    }

    if (!restoreRanchId) {
      showToast('Please select a ranch to restore', 'error');
      return;
    }

    const selectedRanch = ranches.find(r => r.id === restoreRanchId);
    const ranchName = selectedRanch?.name || 'the selected ranch';

    const confirmMessage = restoreMode === 'replace'
      ? `This will DELETE all existing animals in ${ranchName} and replace them with the backup. Are you absolutely sure?`
      : `This will restore any missing animals to ${ranchName} from the backup. Continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setRestoring(true);
    setRestoreProgress('Starting restore...');
    try {
      await restoreFromBackup(
        restoreFile,
        { mode: restoreMode, ranchId: restoreRanchId },
        (message) => {
          setRestoreProgress(message);
        }
      );
      showToast('Restore completed successfully', 'success');
      setShowRestore(false);
      setRestoreFile(null);
      setRestoreRanchId('');
      loadRanches();
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      showToast(`Restore failed: ${error.message}`, 'error');
    } finally {
      setRestoring(false);
      setRestoreProgress('');
    }
  }

  async function handleSetupDemoRanch() {
    if (!user) {
      showToast('You must be logged in to set up a demo ranch', 'error');
      return;
    }

    setSettingUpDemo(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        showToast('No active session found. Please log in again.', 'error');
        setSettingUpDemo(false);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-demo-ranch`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceRecreate: true })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to setup demo ranch: ${response.status}`);
      }

      if (result.success) {
        showToast(result.message || 'Demo ranch created successfully!', 'success');
        await loadRanches();
      } else {
        showToast(result.message || result.error || 'Failed to create demo ranch', 'error');
      }
    } catch (error: any) {
      console.error('Error setting up demo ranch:', error);
      showToast(error?.message || 'Failed to setup demo ranch', 'error');
    } finally {
      setSettingUpDemo(false);
    }
  }

  const getLicenseStatus = (ranch: Ranch) => {
    if (!ranch.license_expiration) {
      return { status: 'No License', color: 'text-red-600' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = new Date(ranch.license_expiration);
    expiration.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 0) {
      return { status: `Valid (${daysDiff} days left)`, color: 'text-green-600' };
    } else if (daysDiff >= -30) {
      return { status: `Grace Period (${Math.abs(daysDiff)} days expired)`, color: 'text-yellow-600' };
    } else {
      return { status: 'Expired', color: 'text-red-600' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  if (selectedRanch) {
    const licenseStatus = getLicenseStatus(selectedRanch);

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={() => setSelectedRanch(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Ranch List
          </button>

          <div className="border-b border-gray-200 pb-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedRanch.name}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">License Status</p>
                <p className={`font-semibold ${licenseStatus.color}`}>{licenseStatus.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Animal Count</p>
                <p className="font-semibold text-gray-900">
                  {selectedRanch.animal_count}
                  {selectedRanch.max_animals && ` / ${selectedRanch.max_animals}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Name</p>
                <p className="font-semibold text-gray-900">{selectedRanch.contact_name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Email</p>
                <p className="font-semibold text-gray-900">{selectedRanch.contact_email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact Phone</p>
                <p className="font-semibold text-gray-900">{selectedRanch.contact_phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Password Reset</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={passwordResetData.ranchId === selectedRanch.id ? passwordResetData.newPassword : ''}
                onChange={(e) =>
                  setPasswordResetData({
                    ranchId: selectedRanch.id,
                    newPassword: e.target.value,
                  })
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new temporary password (min 6 characters)"
                disabled={resettingPassword}
              />
              <button
                onClick={handleResetPassword}
                disabled={
                  resettingPassword ||
                  !passwordResetData.newPassword ||
                  passwordResetData.ranchId !== selectedRanch.id
                }
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {resettingPassword ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Set a temporary password for the user. Send them the password via message below.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Messages</h2>
            <MessageList
              key={refreshMessages}
              ranchId={selectedRanch.id}
              isAdmin={true}
            />
            <div className="mt-6 pt-6 border-t border-gray-200">
              <SendMessage
                ranchId={selectedRanch.id}
                isAdmin={true}
                onMessageSent={() => {
                  setRefreshMessages(prev => prev + 1);
                  loadRanches();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Settings
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">License Management</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSetupDemoRanch}
              disabled={settingUpDemo}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              {settingUpDemo ? 'Creating...' : 'Create Demo Ranch'}
            </button>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {backingUp ? 'Backing up...' : 'Backup Ranches'}
            </button>
            <button
              onClick={() => setShowRestore(!showRestore)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <UploadCloud className="w-5 h-5" />
              Restore Ranch
            </button>
            <button
              onClick={() => setShowTipsImport(!showTipsImport)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Import Tips
            </button>
            <button
              onClick={() => setShowBroadcast(!showBroadcast)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Broadcast
            </button>
            <button
              onClick={() => setShowKeyForm(!showKeyForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Generate Key
            </button>
          </div>
        </div>

        {backingUp && (
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h2 className="text-lg font-semibold mb-4">Creating Backup</h2>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-orange-600 animate-spin" />
              <p className="text-gray-700">{backupProgress}</p>
            </div>
          </div>
        )}

        {showRestore && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <h2 className="text-lg font-semibold mb-4">Restore Ranch</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select backup file (.zip)
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                disabled={restoring}
              />
              {restoreFile && (
                <p className="text-sm text-gray-600 mt-2">Selected: {restoreFile.name}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select ranch to restore <span className="text-red-600">*</span>
              </label>
              <select
                value={restoreRanchId}
                onChange={(e) => setRestoreRanchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={restoring}
              >
                <option value="">-- Select a ranch --</option>
                {ranches.map((ranch) => (
                  <option key={ranch.id} value={ranch.id}>
                    {ranch.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Only the selected ranch will be restored from the backup
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restore Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="missing"
                    checked={restoreMode === 'missing'}
                    onChange={(e) => setRestoreMode(e.target.value as 'missing' | 'replace')}
                    disabled={restoring}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Restore Missing:</strong> Only add animals that don't exist (safe, recommended)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={(e) => setRestoreMode(e.target.value as 'missing' | 'replace')}
                    disabled={restoring}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Full Replace:</strong> Delete all existing animals and replace with backup (destructive!)
                  </span>
                </label>
              </div>
            </div>
            {restoring && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-red-300">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-red-600 animate-spin" />
                  <p className="text-gray-700">{restoreProgress}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestore(false);
                  setRestoreFile(null);
                  setRestoreRanchId('');
                  setRestoreMode('missing');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={restoring}
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring || !restoreFile || !restoreRanchId}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadCloud className="w-4 h-4" />
                {restoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        )}

        {showTipsImport && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h2 className="text-lg font-semibold mb-4">Import Tips & Tricks</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a plain text file (.txt)
              </label>
              <input
                type="file"
                accept=".txt"
                onChange={(e) => setTipsFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                disabled={uploading}
              />
              {tipsFile && (
                <p className="text-sm text-gray-600 mt-2">Selected: {tipsFile.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTipsImport(false);
                  setTipsFile(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleTipsImport}
                disabled={uploading || !tipsFile}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {showBroadcast && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h2 className="text-lg font-semibold mb-4">Broadcast Message to All Ranches</h2>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none mb-3"
              placeholder="Type your broadcast message here..."
              disabled={sending}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBroadcast(false);
                  setBroadcastMessage('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcast}
                disabled={sending || !broadcastMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : `Send to ${ranches.length} Ranches`}
              </button>
            </div>
          </div>
        )}

        {showKeyForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Generate New License Key</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Animals
                </label>
                <input
                  type="number"
                  min="1"
                  value={keyFormData.maxAnimals}
                  onChange={(e) =>
                    setKeyFormData({ ...keyFormData, maxAnimals: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter maximum number of animals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={keyFormData.expirationDate}
                  onChange={(e) =>
                    setKeyFormData({ ...keyFormData, expirationDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowKeyForm(false);
                  setKeyFormData({ expirationDate: '', maxAnimals: 50 });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Key
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold mb-3">Generated License Keys</h2>
          {licenseKeys.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No license keys generated yet</p>
          ) : (
            <div className="space-y-2">
              {licenseKeys.map((license) => (
                <div
                  key={license.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-mono font-semibold text-gray-800">
                        {license.key}
                      </code>
                      {license.used_by_ranch_id ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          <XCircle className="w-3 h-3" />
                          Used
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          <CheckCircle className="w-3 h-3" />
                          Available
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>
                        Max Animals: <span className="font-medium">{license.max_animals}</span>
                      </span>
                      <span>
                        Expires: <span className="font-medium">{formatDate(license.expiration_date)}</span>
                      </span>
                      <span>
                        Created: <span className="font-medium">{formatDate(license.created_at)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminRanchInvitationPanel refreshTrigger={invitationRefreshTrigger} />

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">All Ranches</h2>
          </div>
          <button
            onClick={loadRanches}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {ranches.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No ranches found</p>
        ) : (
          <div className="space-y-2">
            {ranches.map((ranch) => {
              const licenseStatus = getLicenseStatus(ranch);
              return (
                <div
                  key={ranch.id}
                  onClick={() => setSelectedRanch(ranch)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{ranch.name}</h3>
                      {ranch.unread_messages > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {ranch.unread_messages} unread
                        </span>
                      )}
                    </div>
                    <div className="flex gap-6 mt-2 text-sm text-gray-600">
                      <span>
                        License: <span className={`font-medium ${licenseStatus.color}`}>{licenseStatus.status}</span>
                      </span>
                      <span>
                        Animals: <span className="font-medium text-gray-900">
                          {ranch.animal_count}
                          {ranch.max_animals && ` / ${ranch.max_animals}`}
                        </span>
                      </span>
                      <span>
                        Contact: <span className="font-medium text-gray-900">
                          {ranch.contact_name || ranch.contact_email || 'Not provided'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 transform rotate-180" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
