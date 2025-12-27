import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getTodayLocalDate, parseLocalDate } from '../utils/printHelpers';
import type { Database } from '../lib/database.types';

type MedicalHistory = Database['public']['Tables']['medical_history']['Row'];

interface MedicalHistoryModalProps {
  animalId: string;
  animalName: string;
  ranchId: string;
  onClose: () => void;
  isDemoMode?: boolean;
}

export function MedicalHistoryModal({ animalId, animalName, ranchId, onClose, isDemoMode = false }: MedicalHistoryModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [records, setRecords] = useState<MedicalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayLocalDate(),
    description: '',
  });

  useEffect(() => {
    fetchRecords();
  }, [animalId]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_history')
        .select('*')
        .eq('animal_id', animalId)
        .order('date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching medical history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoMode) {
      setShowAddForm(false);
      setFormData({
        date: getTodayLocalDate(),
        description: '',
      });
      showToast('Demonstration Mode - Medical record was not added.', 'info');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('medical_history').insert({
        animal_id: animalId,
        ranch_id: ranchId,
        date: formData.date,
        description: formData.description,
        created_by_user_id: user?.id || null,
      });

      if (error) throw error;

      setShowAddForm(false);
      setFormData({
        date: getTodayLocalDate(),
        description: '',
      });
      await fetchRecords();
    } catch (error: any) {
      console.error('Error adding medical record:', error);
      alert(`Failed to add medical record: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    if (isDemoMode) {
      setEditingId(null);
      setFormData({
        date: getTodayLocalDate(),
        description: '',
      });
      showToast('Demonstration Mode - Medical record was not updated.', 'info');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('medical_history')
        .update({
          date: formData.date,
          description: formData.description,
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      setFormData({
        date: getTodayLocalDate(),
        description: '',
      });
      await fetchRecords();
    } catch (error: any) {
      console.error('Error updating medical record:', error);
      alert(`Failed to update medical record: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemoMode) {
      showToast('Demonstration Mode - Medical record was not deleted.', 'info');
      return;
    }

    if (!confirm('Are you sure you want to delete this medical record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('medical_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchRecords();
    } catch (error: any) {
      console.error('Error deleting medical record:', error);
      alert(`Failed to delete medical record: ${error?.message || 'Unknown error'}`);
    }
  };

  const startEdit = (record: MedicalHistory) => {
    setEditingId(record.id);
    setFormData({
      date: record.date,
      description: record.description,
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      date: getTodayLocalDate(),
      description: '',
    });
  };

  const formatDate = (date: string) => {
    return parseLocalDate(date).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Medical History</h2>
            <p className="text-sm text-gray-600 mt-1">{animalName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingId(null);
                setFormData({
                  date: getTodayLocalDate(),
                  description: '',
                });
              }}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {showAddForm && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Medical Record</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 8-way vaccine, LA200 for Pneumonia - 10cc, Calving assistance needed"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({
                        date: getTodayLocalDate(),
                        description: '',
                      });
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Record'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading medical history...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No medical records found</p>
              <p className="text-sm text-gray-500 mt-2">Click "Add Record" to create the first entry</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div key={record.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingId === record.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate(record.id);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-semibold text-gray-900">{formatDate(record.date)}</span>
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap">{record.description}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEdit(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
