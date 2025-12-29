import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useRanch } from '../contexts/RanchContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Trash2, Upload, Plus, Edit2, X, Key, Shield, Lightbulb, Syringe, Download } from 'lucide-react';
import { ImportModal } from '../components/ImportModal';
import { TipsModal } from '../components/TipsModal';
import { RanchMemberInvitationPanel } from '../components/RanchMemberInvitationPanel';
import { ANIMAL_TYPES, type AnimalType } from '../utils/animalTypes';
import type { Database } from '../lib/database.types';
import { createComprehensiveBackup, downloadComprehensiveBackup } from '../utils/comprehensiveBackup';
import { restoreComprehensiveBackup } from '../utils/comprehensiveRestore';
import { useToast } from '../contexts/ToastContext';

type RanchSettings = Database['public']['Tables']['ranch_settings']['Row'];
type CustomFieldDefinition = Database['public']['Tables']['custom_field_definitions']['Row'];

interface Drug {
  id: string;
  drug_name: string;
  animal_type: string;
  ccs_per_pound: number | null;
  fixed_dose_ml: number | null;
  notes: string | null;
}

export function SettingsPage() {
  const { currentRanch, currentUserRole, refreshRanchData, refreshRanches, selectRanch } = useRanch();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<RanchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [backupCreatedForDelete, setBackupCreatedForDelete] = useState(false);
  const [showDataImport, setShowDataImport] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showInjectionDisclaimer, setShowInjectionDisclaimer] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<{
    animalsAdded: number;
    animalsSkipped: number;
    medicalHistoryAdded: number;
    medicalHistorySkipped: number;
    customFieldsAdded: number;
    errors: string[];
  } | null>(null);
  const [showRestoreSummary, setShowRestoreSummary] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ranchName, setRanchName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savingRanchName, setSavingRanchName] = useState(false);
  const [savingContactInfo, setSavingContactInfo] = useState(false);
  const [fieldForm, setFieldForm] = useState({
    field_name: '',
    field_type: 'text' as 'text' | 'dollar' | 'integer' | 'decimal',
    include_in_totals: false,
    is_required: false,
  });

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [showDrugForm, setShowDrugForm] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [drugForm, setDrugForm] = useState({
    drug_name: '',
    animal_type: 'Cattle' as AnimalType,
    dose_type: 'per_pound' as 'per_pound' | 'fixed',
    ccs_per_pound: '',
    fixed_dose_ml: '',
    notes: '',
  });

  useEffect(() => {
    if (currentRanch) {
      fetchSettings();
      fetchCustomFields();
      fetchDrugs();
      setRanchName(currentRanch.name);
      setContactName(currentRanch.contact_name || '');
      setContactEmail(currentRanch.contact_email || '');
      setContactPhone(currentRanch.contact_phone || '');
    }
  }, [currentRanch]);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    console.log('=== CHECKING ADMIN STATUS ===');
    console.log('User object:', user);

    if (!user) {
      console.log('No user found, setting isAdmin to false');
      setIsAdmin(false);
      return;
    }

    console.log('User ID:', user.id);

    try {
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Supabase query result:', { data, error });

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      const adminStatus = !!data;
      console.log('Setting isAdmin to:', adminStatus);
      setIsAdmin(adminStatus);
      console.log('isAdmin state should now be:', adminStatus);
    } catch (error) {
      console.error('Exception checking admin status:', error);
      setIsAdmin(false);
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
          default_animal_type: (settings as any).default_animal_type,
          cattle_adult_age: (settings as any).cattle_adult_age,
          horse_adult_age: (settings as any).horse_adult_age,
          sheep_adult_age: (settings as any).sheep_adult_age,
          goat_adult_age: (settings as any).goat_adult_age,
          pig_adult_age: (settings as any).pig_adult_age,
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

  const handleSaveContactInfo = async () => {
    if (!currentRanch) return;

    setSavingContactInfo(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('ranches')
        .update({
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
        })
        .eq('id', currentRanch.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Contact information saved successfully' });
      await refreshRanchData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving contact information:', error);
      setMessage({ type: 'error', text: 'Failed to save contact information' });
    } finally {
      setSavingContactInfo(false);
    }
  };

  const handleToggleInjectionFeature = (enabled: boolean) => {
    if (enabled && !(settings as any).enable_injection_feature) {
      setShowInjectionDisclaimer(true);
    } else {
      handleSaveInjectionFeature(enabled);
    }
  };

  const handleSaveInjectionFeature = async (enabled: boolean) => {
    if (!settings || !currentRanch) return;

    setMessage(null);

    try {
      const { error } = await supabase
        .from('ranch_settings')
        .update({ enable_injection_feature: enabled })
        .eq('ranch_id', currentRanch.id);

      if (error) throw error;

      setSettings({ ...settings, enable_injection_feature: enabled } as any);
      setMessage({
        type: 'success',
        text: enabled ? 'Injection feature enabled' : 'Injection feature disabled'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating injection feature:', error);
      setMessage({ type: 'error', text: 'Failed to update injection feature' });
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

  const fetchDrugs = async () => {
    if (!currentRanch) return;

    try {
      const { data, error } = await supabase
        .from('drugs')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .order('animal_type', { ascending: true })
        .order('drug_name', { ascending: true });

      if (error) throw error;
      setDrugs(data || []);
    } catch (error) {
      console.error('Error fetching drugs:', error);
    }
  };

  const handleAddDrug = () => {
    setEditingDrug(null);
    setDrugForm({
      drug_name: '',
      animal_type: 'Cattle',
      dose_type: 'per_pound',
      ccs_per_pound: '',
      fixed_dose_ml: '',
      notes: '',
    });
    setShowDrugForm(true);
  };

  const handleEditDrug = (drug: Drug) => {
    setEditingDrug(drug);
    setDrugForm({
      drug_name: drug.drug_name,
      animal_type: (drug.animal_type || 'Cattle') as AnimalType,
      dose_type: drug.ccs_per_pound !== null ? 'per_pound' : 'fixed',
      ccs_per_pound: drug.ccs_per_pound?.toString() || '',
      fixed_dose_ml: drug.fixed_dose_ml?.toString() || '',
      notes: drug.notes || '',
    });
    setShowDrugForm(true);
  };

  const handleSaveDrug = async () => {
    if (!currentRanch || !drugForm.drug_name.trim()) {
      setMessage({ type: 'error', text: 'Drug name is required' });
      return;
    }

    if (drugForm.dose_type === 'per_pound' && !drugForm.ccs_per_pound) {
      setMessage({ type: 'error', text: 'CCs per pound is required for per-pound dosing' });
      return;
    }

    if (drugForm.dose_type === 'fixed' && !drugForm.fixed_dose_ml) {
      setMessage({ type: 'error', text: 'Fixed dose is required for fixed dosing' });
      return;
    }

    try {
      const drugData = {
        drug_name: drugForm.drug_name.trim(),
        animal_type: drugForm.animal_type,
        ccs_per_pound: drugForm.dose_type === 'per_pound' ? parseFloat(drugForm.ccs_per_pound) : null,
        fixed_dose_ml: drugForm.dose_type === 'fixed' ? parseFloat(drugForm.fixed_dose_ml) : null,
        notes: drugForm.notes.trim() || null,
      };

      if (editingDrug) {
        const { error } = await supabase
          .from('drugs')
          .update(drugData)
          .eq('id', editingDrug.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Drug updated successfully' });
      } else {
        const { error } = await supabase
          .from('drugs')
          .insert({
            ...drugData,
            ranch_id: currentRanch.id,
          });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Drug added successfully' });
      }

      setShowDrugForm(false);
      await fetchDrugs();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving drug:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to save drug' });
    }
  };

  const handleDeleteDrug = async (drugId: string) => {
    if (!confirm('Are you sure you want to delete this drug?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('drugs')
        .delete()
        .eq('id', drugId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Drug deleted successfully' });
      await fetchDrugs();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting drug:', error);
      setMessage({ type: 'error', text: 'Failed to delete drug' });
    }
  };

  const handleExportComprehensiveBackup = async () => {
    if (!currentRanch) return;

    setExportingBackup(true);
    try {
      const { data: animals, error: animalsError } = await supabase
        .from('animals')
        .select('*')
        .eq('ranch_id', currentRanch.id);

      if (animalsError) throw animalsError;

      const { data: injections, error: injectionsError } = await supabase
        .from('medical_history')
        .select('*')
        .eq('ranch_id', currentRanch.id);

      if (injectionsError) throw injectionsError;

      const { data: customFieldDefs, error: customFieldsError } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .order('display_order', { ascending: true });

      if (customFieldsError) throw customFieldsError;

      const { data: customFieldVals, error: customFieldValsError } = await supabase
        .from('custom_field_values')
        .select('*')
        .in('animal_id', animals?.map(a => a.id) || []);

      if (customFieldValsError) throw customFieldValsError;

      const backupBlob = await createComprehensiveBackup(
        {
          animals: animals || [],
          injections: injections || [],
          customFields: customFieldDefs || [],
          customFieldValues: customFieldVals || [],
        },
        currentRanch.id
      );

      downloadComprehensiveBackup(backupBlob, currentRanch.name);

      const { error: updateError } = await supabase
        .from('ranches')
        .update({ last_backup_date: new Date().toISOString() })
        .eq('id', currentRanch.id);

      if (updateError) {
        console.error('Error updating backup timestamp:', updateError);
      }

      setBackupCreatedForDelete(true);
      showToast('Backup exported successfully with all photos', 'success');
    } catch (error: any) {
      console.error('Error creating comprehensive backup:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to create backup' });
    } finally {
      setExportingBackup(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentRanch) return;

    setRestoringBackup(true);
    setRestoreSummary(null);

    try {
      const summary = await restoreComprehensiveBackup(file, currentRanch.id);
      setRestoreSummary(summary);
      setShowRestoreSummary(true);

      if (summary.errors.length === 0) {
        showToast('Backup restored successfully', 'success');
      } else if (summary.animalsAdded > 0) {
        showToast('Backup restored with some errors', 'success');
      } else {
        showToast('Backup restore completed with errors', 'error');
      }
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      setMessage({ type: 'error', text: error?.message || 'Failed to restore backup' });
    } finally {
      setRestoringBackup(false);
      event.target.value = '';
    }
  };


  const handleDeleteAllData = async () => {
    if (deletePassword !== '!delete!') {
      setMessage({ type: 'error', text: 'Incorrect password. Type "!delete!" to confirm.' });
      return;
    }

    if (!backupCreatedForDelete) {
      setMessage({ type: 'error', text: 'You must create a backup before deleting all data.' });
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
      setBackupCreatedForDelete(false);
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

  console.log('=== RENDERING SettingsPage ===');
  console.log('isAdmin value during render:', isAdmin);
  console.log('user value during render:', user);

  return (
    <Layout currentPage="settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ranch Settings</h1>
            <p className="text-gray-600 mt-1">Configure your ranch preferences</p>
            {user && (
              <p className="text-xs text-gray-500 mt-2">
                User ID: {user.id} | Admin Status: {isAdmin ? 'YES' : 'NO'}
              </p>
            )}
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

            <div className="space-y-4">
              <div className="flex gap-3">
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

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Primary contact information for this ranch
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Enter contact name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveContactInfo}
                    disabled={savingContactInfo}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingContactInfo ? 'Saving...' : 'Save Contact Info'}
                  </button>
                </div>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Animal Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Animal Type
                </label>
                <select
                  value={(settings as any).default_animal_type || 'Cattle'}
                  onChange={(e) =>
                    setSettings({ ...settings, default_animal_type: e.target.value } as any)
                  }
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {ANIMAL_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Default animal type when adding new animals
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cattle Adult Age (years)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(settings as any).cattle_adult_age || 2.0}
                    onChange={(e) =>
                      setSettings({ ...settings, cattle_adult_age: parseFloat(e.target.value) } as any)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Heifer becomes Cow</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horse Adult Age (years)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(settings as any).horse_adult_age || 4.0}
                    onChange={(e) =>
                      setSettings({ ...settings, horse_adult_age: parseFloat(e.target.value) } as any)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Filly becomes Mare, Colt becomes Stallion</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sheep Adult Age (years)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(settings as any).sheep_adult_age || 1.0}
                    onChange={(e) =>
                      setSettings({ ...settings, sheep_adult_age: parseFloat(e.target.value) } as any)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard maturity age</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goat Adult Age (years)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(settings as any).goat_adult_age || 1.0}
                    onChange={(e) =>
                      setSettings({ ...settings, goat_adult_age: parseFloat(e.target.value) } as any)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard maturity age</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pig Adult Age (years)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(settings as any).pig_adult_age || 0.75}
                    onChange={(e) =>
                      setSettings({ ...settings, pig_adult_age: parseFloat(e.target.value) } as any)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Standard maturity age</p>
                </div>
              </div>
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
            <div className="flex items-center gap-2 mb-4">
              <Syringe className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Injection Feature</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Enable the injection/medication dosage calculator feature
            </p>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Enable Injection Feature</h3>
                <p className="text-sm text-gray-600">
                  Allow injection dosage calculations for animals
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={(settings as any).enable_injection_feature || false}
                  onChange={(e) => handleToggleInjectionFeature(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Drugs & Medications</h2>
              <p className="text-sm text-gray-600">
                Manage the drugs and medications used for your cattle
              </p>
            </div>
            <button
              onClick={handleAddDrug}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Drug
            </button>
          </div>

          {drugs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Animal Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Drug Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Dosage</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Notes</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {drugs.map((drug) => (
                    <tr key={drug.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{drug.animal_type || 'Cattle'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{drug.drug_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {drug.ccs_per_pound !== null
                          ? `${drug.ccs_per_pound} ml/lb`
                          : drug.fixed_dose_ml !== null
                          ? `${drug.fixed_dose_ml} ml (fixed)`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{drug.notes || '-'}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleEditDrug(drug)}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDrug(drug.id)}
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
              No drugs defined. Click "Add Drug" to create one.
            </div>
          )}
        </div>

        {showDrugForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingDrug ? 'Edit Drug' : 'Add Drug'}
                </h3>
                <button
                  onClick={() => setShowDrugForm(false)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drug Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={drugForm.drug_name}
                    onChange={(e) => setDrugForm({ ...drugForm, drug_name: e.target.value })}
                    placeholder="e.g., LA200, Nuflor"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animal Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={drugForm.animal_type}
                    onChange={(e) => setDrugForm({ ...drugForm, animal_type: e.target.value as AnimalType })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {ANIMAL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dose Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={drugForm.dose_type}
                    onChange={(e) => setDrugForm({ ...drugForm, dose_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="per_pound">Per Pound (ml/lb)</option>
                    <option value="fixed">Fixed Dose (ml)</option>
                  </select>
                </div>

                {drugForm.dose_type === 'per_pound' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CCs (ml) per Pound <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={drugForm.ccs_per_pound}
                      onChange={(e) => setDrugForm({ ...drugForm, ccs_per_pound: e.target.value })}
                      placeholder="e.g., 0.045"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fixed Dose (ml) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={drugForm.fixed_dose_ml}
                      onChange={(e) => setDrugForm({ ...drugForm, fixed_dose_ml: e.target.value })}
                      placeholder="e.g., 10.0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={drugForm.notes}
                    onChange={(e) => setDrugForm({ ...drugForm, notes: e.target.value })}
                    placeholder="e.g., Intramuscular, Subcutaneous"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDrugForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDrug}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
                >
                  {editingDrug ? 'Update' : 'Add'} Drug
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import animal data from external sources or create demo data
            </p>

            <div className="space-y-3">
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
            </div>

            <p className="text-xs text-gray-500 italic mt-3">
              "RanchR" is a trademark of its respective owner. This app is not affiliated with or endorsed by RanchR.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Backup & Export</h2>
            <p className="text-sm text-gray-600 mb-4">
              Create a complete backup of all your animal data, medical records, and photos
            </p>

            <div className="space-y-3">
              <button
                onClick={handleExportComprehensiveBackup}
                disabled={exportingBackup}
                className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left w-full max-w-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Download className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {exportingBackup ? 'Creating Backup...' : 'Export Complete Backup'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Download a ZIP file with CSV data and all animal photos
                  </p>
                </div>
              </button>

              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left w-full max-w-md cursor-pointer">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleRestoreBackup}
                  disabled={restoringBackup}
                  className="hidden"
                />
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {restoringBackup ? 'Restoring Backup...' : 'Restore Complete Backup'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Merge data from a previous backup (non-destructive)
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 font-medium mb-2">
                Your Data, Your Freedom
              </p>
              <p className="text-sm text-green-800">
                This backup is designed to be portable and human-readable. The CSV file can be opened in any spreadsheet application, and photos are named with animal IDs and tag numbers for easy identification. You're never locked in.
              </p>
            </div>
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

        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
          <RanchMemberInvitationPanel />
        )}

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

                {!backupCreatedForDelete && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <p className="text-sm text-yellow-900 font-medium mb-2">
                      Backup Required
                    </p>
                    <p className="text-sm text-yellow-800 mb-3">
                      You must export a complete backup before deleting all data. This ensures you have a copy of your data in case you need it later.
                    </p>
                    <button
                      onClick={handleExportComprehensiveBackup}
                      disabled={exportingBackup}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      {exportingBackup ? 'Creating Backup...' : 'Export Backup Now'}
                    </button>
                  </div>
                )}

                {backupCreatedForDelete && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                    <p className="text-sm text-green-900 font-medium mb-1">
                      Backup Created
                    </p>
                    <p className="text-sm text-green-800">
                      Your backup has been downloaded. You can now proceed with deletion if needed.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono">!delete!</code> to confirm
                  </label>
                  <input
                    type="text"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Type !delete! to confirm"
                    disabled={!backupCreatedForDelete}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setBackupCreatedForDelete(false);
                    }}
                    disabled={deleting}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAllData}
                    disabled={deleting || deletePassword !== '!delete!' || !backupCreatedForDelete}
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

      {showRestoreSummary && restoreSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Restore Summary</h3>
              <button
                onClick={() => setShowRestoreSummary(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-gray-600">Animals Added</p>
                  <p className="text-2xl font-bold text-green-700">{restoreSummary.animalsAdded}</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600">Animals Skipped</p>
                  <p className="text-2xl font-bold text-blue-700">{restoreSummary.animalsSkipped}</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-gray-600">Medical Records Added</p>
                  <p className="text-2xl font-bold text-green-700">{restoreSummary.medicalHistoryAdded}</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600">Medical Records Skipped</p>
                  <p className="text-2xl font-bold text-blue-700">{restoreSummary.medicalHistorySkipped}</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg col-span-2">
                  <p className="text-sm text-gray-600">Custom Fields Added</p>
                  <p className="text-2xl font-bold text-green-700">{restoreSummary.customFieldsAdded}</p>
                </div>
              </div>

              {restoreSummary.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-900 mb-2">Errors:</p>
                  <ul className="space-y-1 text-sm text-red-800 max-h-40 overflow-y-auto">
                    {restoreSummary.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  {restoreSummary.animalsSkipped > 0
                    ? 'Existing animals were not modified. Only new animals and medical records were added.'
                    : 'All animals from the backup have been added to your ranch.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowRestoreSummary(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showInjectionDisclaimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-red-900">Injection Feature Disclaimer</h3>
              <button
                onClick={() => setShowInjectionDisclaimer(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <p className="text-sm text-gray-900 leading-relaxed">
                It is your responsibility to properly maintain your drug table with accurate dosages.
                This feature is an estimator not a veterinarian. It is designed for use in a particular
                common scenario where injections are administered by ranch personnel for vaccinations or
                sickness. This feature will help you with the math and save you from reading small labels
                for dosages over-and-over, but we assume that you have the expertise to know if the App
                suggests an unreasonable dosage. If you are not already a reasonably qualified animal
                medical technician, do not use this feature. This feature can also help you estimate the
                animal's weight, but this is only an estimate. If the particular drug is highly dosage
                sensitive, use a scale rather than this weight estimate. If you cannot do a reasonable
                job verifying the weight estimate based on experience, do not use this feature.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowInjectionDisclaimer(false)}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveInjectionFeature(true);
                  setShowInjectionDisclaimer(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
              >
                Enable Injection Feature
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
