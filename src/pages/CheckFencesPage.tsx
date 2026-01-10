import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useRanch } from '../contexts/RanchContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { GitBranch, Plus, Edit, Trash2, X, CheckCircle } from 'lucide-react';

interface Fence {
  id: string;
  ranch_id: string;
  description: string;
  last_checked_date: string | null;
  last_checked_by: string | null;
  created_at: string;
}

export function CheckFencesPage() {
  const { currentRanch, licenseInfo, isDemoMode, currentUserRole } = useRanch();
  const { showToast } = useToast();
  const isReadOnly = currentUserRole === 'VIEWER' && !isDemoMode;

  const [fences, setFences] = useState<Fence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [editingFence, setEditingFence] = useState<Fence | null>(null);
  const [checkingFence, setCheckingFence] = useState<Fence | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    last_checked_date: '',
    last_checked_by: '',
  });

  const [checkData, setCheckData] = useState({
    last_checked_date: '',
    last_checked_by: '',
  });

  useEffect(() => {
    if (currentRanch) {
      fetchFences();
    }
  }, [currentRanch]);

  const fetchFences = async () => {
    if (!currentRanch) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fences')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .order('description', { ascending: true });

      if (error) throw error;
      setFences(data || []);
    } catch (error) {
      console.error('Error fetching fences:', error);
      showToast('Failed to load fences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFence = () => {
    setEditingFence(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      description: '',
      last_checked_date: today,
      last_checked_by: '',
    });
    setShowEditModal(true);
  };

  const handleEditFence = (fence: Fence) => {
    setEditingFence(fence);
    setFormData({
      description: fence.description,
      last_checked_date: fence.last_checked_date || '',
      last_checked_by: fence.last_checked_by || '',
    });
    setShowEditModal(true);
  };

  const handleCheckFence = (fence: Fence) => {
    setCheckingFence(fence);
    const today = new Date().toISOString().split('T')[0];
    setCheckData({
      last_checked_date: today,
      last_checked_by: fence.last_checked_by || '',
    });
    setShowCheckModal(true);
  };

  const handleSaveFence = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRanch) return;

    if (!formData.description.trim()) {
      showToast('Fence description is required', 'error');
      return;
    }

    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      setShowEditModal(false);
      return;
    }

    try {
      if (editingFence) {
        const { error } = await supabase
          .from('fences')
          .update({
            description: formData.description.trim(),
            last_checked_date: formData.last_checked_date || null,
            last_checked_by: formData.last_checked_by.trim() || null,
          })
          .eq('id', editingFence.id);

        if (error) throw error;
        showToast('Fence updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('fences')
          .insert({
            ranch_id: currentRanch.id,
            description: formData.description.trim(),
            last_checked_date: formData.last_checked_date || null,
            last_checked_by: formData.last_checked_by.trim() || null,
          });

        if (error) throw error;
        showToast('Fence added successfully', 'success');
      }

      setShowEditModal(false);
      await fetchFences();
    } catch (error) {
      console.error('Error saving fence:', error);
      showToast('Failed to save fence', 'error');
    }
  };

  const handleSubmitCheck = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkingFence) return;

    if (!checkData.last_checked_date) {
      showToast('Date is required', 'error');
      return;
    }

    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      setShowCheckModal(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('fences')
        .update({
          last_checked_date: checkData.last_checked_date,
          last_checked_by: checkData.last_checked_by.trim() || null,
        })
        .eq('id', checkingFence.id);

      if (error) throw error;

      showToast('Fence check recorded successfully', 'success');
      setShowCheckModal(false);
      await fetchFences();
    } catch (error) {
      console.error('Error recording fence check:', error);
      showToast('Failed to record fence check', 'error');
    }
  };

  const handleDeleteFence = async (fence: Fence) => {
    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${fence.description}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('fences')
        .delete()
        .eq('id', fence.id);

      if (error) throw error;

      showToast('Fence deleted successfully', 'success');
      await fetchFences();
    } catch (error) {
      console.error('Error deleting fence:', error);
      showToast('Failed to delete fence', 'error');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  if (!currentRanch) {
    return (
      <Layout currentPage="animals">
        <div className="text-center py-12">
          <p className="text-gray-600">Please select a ranch first</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="animals">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Check Fences</h1>
            <p className="text-gray-600 mt-1">Manage and track fence maintenance</p>
          </div>
          <button
            onClick={handleAddFence}
            disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Fence
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading fences...</p>
            </div>
          ) : fences.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No fences yet</p>
              <p className="text-sm text-gray-500 mt-2">Add fences to track maintenance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fence Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Checked Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Checked By</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fences.map((fence) => (
                    <tr key={fence.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{fence.description}</td>
                      <td className="py-3 px-4 text-gray-700">{formatDate(fence.last_checked_date)}</td>
                      <td className="py-3 px-4 text-gray-700">{fence.last_checked_by || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleCheckFence(fence)}
                            disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50 inline-flex items-center"
                            title="Check Fence"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Check
                          </button>
                          <button
                            onClick={() => handleEditFence(fence)}
                            disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-50"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFence(fence)}
                            disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingFence ? 'Edit Fence' : 'Add Fence'}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveFence} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fence Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., North Pasture Fence"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Checked Date
                </label>
                <input
                  type="date"
                  value={formData.last_checked_date}
                  onChange={(e) => setFormData({ ...formData, last_checked_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Checked By
                </label>
                <input
                  type="text"
                  value={formData.last_checked_by}
                  onChange={(e) => setFormData({ ...formData, last_checked_by: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Name of person who checked"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  {editingFence ? 'Update Fence' : 'Add Fence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCheckModal && checkingFence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Check Fence</h2>
              <button
                onClick={() => setShowCheckModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCheck} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900">{checkingFence.description}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Last checked: {formatDate(checkingFence.last_checked_date)}
                  {checkingFence.last_checked_by && ` by ${checkingFence.last_checked_by}`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Checked *
                </label>
                <input
                  type="date"
                  value={checkData.last_checked_date}
                  onChange={(e) => setCheckData({ ...checkData, last_checked_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Checked By
                </label>
                <input
                  type="text"
                  value={checkData.last_checked_by}
                  onChange={(e) => setCheckData({ ...checkData, last_checked_by: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCheckModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                  Record Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
