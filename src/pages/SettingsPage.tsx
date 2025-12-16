import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useRanch } from '../contexts/RanchContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Trash2, Upload, Plus, Edit2, X, Key, Shield, Lightbulb } from 'lucide-react';
import { ImportModal } from '../components/ImportModal';
import { TipsModal } from '../components/TipsModal';
import type { Database } from '../lib/database.types';

type RanchSettings = Database['public']['Tables']['ranch_settings']['Row'];
type CustomFieldDefinition = Database['public']['Tables']['custom_field_definitions']['Row'];

export function SettingsPage() {
  const { currentRanch, currentUserRole, refreshRanchData } = useRanch();
  const { user } = useAuth();
  const [settings, setSettings] = useState<RanchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDataImport, setShowDataImport] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ranchName, setRanchName] = useState('');
  const [savingRanchName, setSavingRanchName] = useState(false);
  const [fieldForm, setFieldForm] = useState({
    field_name: '',
    field_type: 'text' as 'text' | 'dollar' | 'integer' | 'decimal',
    include_in_totals: false,
    is_required: false,
  });

  useEffect(() => {
    if (currentRanch) {
      fetchSettings();
      fetchCustomFields();
      setRanchName(currentRanch.name);
    }
  }, [currentRanch]);

  useEffect(() => {
    setIsAdmin(currentUserRole === 'ADMIN');
  }, [currentUserRole]);

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

  const handleSaveRanchName = async () => {
    if (!currentRanch || !ranchName.trim()) {
      setMessage({ type: 'error', text: 'Ranch name cannot be empty' });
      return;
    }

    setSavingRanchName(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('ranches')
        .update({ name: ranchName.trim() })
        .eq('id', currentRanch.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Ranch name updated successfully' });
      await refreshRanchData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving ranch name:', error);
      setMessage({ type: 'error', text: 'Failed to save ranch name' });
    } finally {
      setSavingRanchName(false);
    }
  };

  const fetchCustomFields = async () => {
    if (!currentRanch) return;

    try {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const handleAddField = () => {
    setEditingField(null);
    setFieldForm({
      field_name: '',
      field_type: 'text',
      include_in_totals: false,
      is_required: false,
    });
    setShowFieldForm(true);
  };

  const handleEditField = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFieldForm({
      field_name: field.field_name,
      field_type: field.field_type,
      include_in_totals: field.include_in_totals,
      is_required: field.is_required,
    });
    setShowFieldForm(true);
  };

  const handleSaveField = async () => {
    if (!currentRanch || !fieldForm.field_name.trim()) {
      setMessage({ type: 'error', text: 'Field name is required' });
      return;
    }

    try {
      if (editingField) {
        const { error } = await supabase
          .from('custom_field_definitions')
          .update({
            field_name: fieldForm.field_name,
            field_type: fieldForm.field_type,
            include_in_totals: fieldForm.include_in_totals,
            is_required: fieldForm.is_required,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingField.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Custom field updated successfully' });
      } else {
        const maxOrder = customFields.length > 0
          ? Math.max(...customFields.map(f => f.display_order))
          : -1;

        const { error } = await supabase
          .from('custom_field_definitions')
          .insert({
            ranch_id: currentRanch.id,
            field_name: fieldForm.field_name,
            field_type: fieldForm.field_type,
            include_in_totals: fieldForm.include_in_totals,
            is_required: fieldForm.is_required,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Custom field added successfully' });
      }

      setShowFieldForm(false);
      await fetchCustomFields();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving custom field:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to save custom field' });
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? All associated data will be lost.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_field_definitions')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Custom field deleted successfully' });
      await fetchCustomFields();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting custom field:', error);
      setMessage({ type: 'error', text: 'Failed to delete custom field' });
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ranch Information</h2>
            <p className="text-sm text-gray-600 mb-4">
              Basic information about your ranch
            </p>

            <div className="flex gap-3 max-w-2xl">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ranch Name
                </label>
                <input
                  type="text"
                  value={ranchName}
                  onChange={(e) => setRanchName(e.target.value)}
                  placeholder="Enter ranch name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSaveRanchName}
                  disabled={savingRanchName || !ranchName.trim() || ranchName === currentRanch?.name}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {savingRanchName ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </div>
          </div>
        </div>

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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Custom Fields</h2>
              <p className="text-sm text-gray-600">
                Define custom fields to track additional information for your animals
              </p>
            </div>
            <button
              onClick={handleAddField}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Field
            </button>
          </div>

          {customFields.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Field Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Include in Totals</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Required</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customFields.map((field) => (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{field.field_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{field.field_type}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          field.include_in_totals
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {field.include_in_totals ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          field.is_required
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {field.is_required ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleEditField(field)}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No custom fields defined. Click "Add Field" to create one.
            </div>
          )}
        </div>

        {showFieldForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
                </h3>
                <button
                  onClick={() => setShowFieldForm(false)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={fieldForm.field_name}
                    onChange={(e) => setFieldForm({ ...fieldForm, field_name: e.target.value })}
                    placeholder="e.g., Sire, Sale Price"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Type
                  </label>
                  <select
                    value={fieldForm.field_type}
                    onChange={(e) => setFieldForm({ ...fieldForm, field_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="integer">Integer</option>
                    <option value="decimal">Decimal Number</option>
                    <option value="dollar">Dollar Amount</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="include_in_totals"
                    checked={fieldForm.include_in_totals}
                    onChange={(e) => setFieldForm({ ...fieldForm, include_in_totals: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="include_in_totals" className="ml-2 text-sm text-gray-700">
                    Include in Report Totals
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_required"
                    checked={fieldForm.is_required}
                    onChange={(e) => setFieldForm({ ...fieldForm, is_required: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="is_required" className="ml-2 text-sm text-gray-700">
                    Required Field
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFieldForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveField}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
                >
                  {editingField ? 'Update' : 'Add'} Field
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import animal data from external sources
            </p>

            <button
              onClick={() => setShowDataImport(true)}
              className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left w-full max-w-md"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Import RanchR Data</h3>
                <p className="text-sm text-gray-600">Import cattle and treatments from RanchR CSV files</p>
              </div>
            </button>

            <p className="text-xs text-gray-500 italic mt-3">
              "RanchR" is a trademark of its respective owner. This app is not affiliated with or endorsed by RanchR.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Help & Resources</h2>
            <p className="text-sm text-gray-600 mb-4">
              Learn tips and tricks to get the most out of your ranch management system
            </p>

            <button
              onClick={() => setShowTipsModal(true)}
              className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-left w-full max-w-md"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Tips & Tricks</h3>
                <p className="text-sm text-gray-600">View helpful tips and best practices</p>
              </div>
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-blue-900">Admin Controls</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Administrative tools for system management
              </p>

              <a
                href="/license-management"
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left w-full max-w-md"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Key className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">License Management</h3>
                  <p className="text-sm text-gray-600">Generate and manage license keys</p>
                </div>
              </a>
            </div>
          </div>
        )}

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

      {showDataImport && (
        <ImportModal
          onClose={() => setShowDataImport(false)}
          onComplete={() => {
            setShowDataImport(false);
            setMessage({ type: 'success', text: 'Data imported successfully' });
            setTimeout(() => setMessage(null), 3000);
          }}
        />
      )}

      <TipsModal
        isOpen={showTipsModal}
        onClose={() => setShowTipsModal(false)}
      />
    </Layout>
  );
}
