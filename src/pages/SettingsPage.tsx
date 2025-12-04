import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useRanch } from '../contexts/RanchContext';
import { supabase } from '../lib/supabase';
import { Save, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { ImageImportModal } from '../components/ImageImportModal';
import { ImportModal } from '../components/ImportModal';
import type { Database } from '../lib/database.types';

type RanchSettings = Database['public']['Tables']['ranch_settings']['Row'];
type Animal = Database['public']['Tables']['animals']['Row'];

export function SettingsPage() {
  const { currentRanch } = useRanch();
  const [settings, setSettings] = useState<RanchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageImport, setShowImageImport] = useState(false);
  const [showDataImport, setShowDataImport] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentRanch) {
      fetchSettings();
      fetchAnimals();
    }
  }, [currentRanch]);

  const fetchAnimals = async () => {
    if (!currentRanch) return;

    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error('Error fetching animals:', error);
    }
  };

  const fetchSettings = async () => {
    if (!currentRanch) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ranch_settings')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        const { data: newSettings, error: createError } = await supabase
          .from('ranch_settings')
          .insert({ ranch_id: currentRanch.id })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !currentRanch) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('ranch_settings')
        .update({
          report_line1: settings.report_line1,
          report_line2: settings.report_line2,
          adult_age_years: settings.adult_age_years,
          print_program: (settings as any).print_program || '',
        })
        .eq('ranch_id', currentRanch.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (deletePassword !== '!delete!') {
      setMessage({ type: 'error', text: 'Incorrect password. Type "!delete!" to confirm.' });
      return;
    }

    if (!currentRanch) return;

    setDeleting(true);
    setMessage(null);

    try {
      const { error: medicalError } = await supabase
        .from('medical_history')
        .delete()
        .eq('ranch_id', currentRanch.id);

      if (medicalError) throw medicalError;

      const { error: animalsError } = await supabase
        .from('animals')
        .delete()
        .eq('ranch_id', currentRanch.id);

      if (animalsError) throw animalsError;

      setMessage({ type: 'success', text: 'All cattle and related data deleted successfully' });
      setShowDeleteConfirm(false);
      setDeletePassword('');
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error deleting data:', error);
      setMessage({ type: 'error', text: 'Failed to delete data' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout currentPage="settings">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          <p className="text-gray-600 mt-4">Loading settings...</p>
        </div>
      </Layout>
    );
  }

  if (!settings) {
    return (
      <Layout currentPage="settings">
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load settings</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ranch Settings</h1>
            <p className="text-gray-600 mt-1">Configure your ranch preferences</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Settings</h2>
            <p className="text-sm text-gray-600 mb-4">
              This text will appear at the top of all reports
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Line 1
                </label>
                <input
                  type="text"
                  value={settings.report_line1 || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, report_line1: e.target.value })
                  }
                  placeholder="e.g., Your Ranch Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Line 2
                </label>
                <input
                  type="text"
                  value={settings.report_line2 || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, report_line2: e.target.value })
                  }
                  placeholder="e.g., Location or Additional Info"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Animal Classification</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adult Age Threshold (years)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={settings.adult_age_years || ''}
                onChange={(e) =>
                  setSettings({ ...settings, adult_age_years: e.target.value })
                }
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Animals younger than this age are considered calves in reports
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Print/Export Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Print Program Path (optional)
              </label>
              <input
                type="text"
                value={(settings as any).print_program || ''}
                onChange={(e) =>
                  setSettings({ ...settings, print_program: e.target.value } as any)
                }
                placeholder="e.g., /usr/bin/lp or C:\Program Files\Adobe\Acrobat\Acrobat.exe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Path to the program used to print or open exported reports (optional)
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import animal data and photos from external sources
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setShowDataImport(true)}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Import RanchR Data</h3>
                  <p className="text-sm text-gray-600">Import cattle and treatments from RanchR CSV files</p>
                </div>
              </button>

              <button
                onClick={() => setShowImageImport(true)}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Import Photos</h3>
                  <p className="text-sm text-gray-600">Upload animal photos from your computer</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete all cattle and related data from this ranch
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete All Data
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-medium mb-2">
                    This action cannot be undone!
                  </p>
                  <p className="text-sm text-red-800">
                    All animals and medical history records will be permanently deleted.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono">!delete!</code> to confirm
                  </label>
                  <input
                    type="text"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Type !delete! to confirm"
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    disabled={deleting}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAllData}
                    disabled={deleting || deletePassword !== '!delete!'}
                    className="inline-flex items-center px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    {deleting ? 'Deleting...' : 'Confirm Delete All'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showImageImport && (
        <ImageImportModal
          onClose={() => setShowImageImport(false)}
          onComplete={() => {
            setShowImageImport(false);
            setMessage({ type: 'success', text: 'Photos imported successfully' });
            setTimeout(() => setMessage(null), 3000);
          }}
          animals={animals}
        />
      )}

      {showDataImport && (
        <ImportModal
          onClose={() => setShowDataImport(false)}
          onComplete={() => {
            setShowDataImport(false);
            fetchAnimals();
            setMessage({ type: 'success', text: 'Data imported successfully' });
            setTimeout(() => setMessage(null), 3000);
          }}
        />
      )}
    </Layout>
  );
}
