import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];

interface ProrateSaleModalProps {
  onClose: () => void;
  onSuccess: () => void;
  ranchId: string;
}

export function ProrateSaleModal({ onClose, onSuccess, ranchId }: ProrateSaleModalProps) {
  const { showToast } = useToast();
  const [saleDate, setSaleDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewAnimals, setPreviewAnimals] = useState<Animal[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = async () => {
    if (!saleDate) {
      showToast('Please select a sale date', 'error');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      showToast('Please enter a valid total amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('ranch_id', ranchId)
        .eq('status', 'SOLD')
        .eq('exit_date', saleDate);

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast(`No animals found sold on ${saleDate}`, 'error');
        setShowPreview(false);
        return;
      }

      setPreviewAnimals(data);
      setShowPreview(true);
    } catch (error: any) {
      console.error('Error fetching animals:', error);
      showToast(`Failed to fetch animals: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (previewAnimals.length === 0) return;

    const total = parseFloat(totalAmount);
    const pricePerAnimal = total / previewAnimals.length;

    setLoading(true);
    try {
      const updates = previewAnimals.map(animal => ({
        id: animal.id,
        sale_price: pricePerAnimal
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('animals')
          .update({ sale_price: update.sale_price })
          .eq('id', update.id);

        if (error) throw error;
      }

      showToast(`Successfully prorated $${total.toFixed(2)} across ${previewAnimals.length} animals`, 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating sale prices:', error);
      showToast(`Failed to update sale prices: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Prorate Sale</h2>
              <p className="text-sm text-gray-600 mt-1">
                Distribute total sale amount across all animals sold on a specific date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Select the date when animals were sold</li>
              <li>Enter the total check amount received</li>
              <li>Preview which animals will be updated</li>
              <li>Apply to evenly distribute the amount across all animals</li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => {
                  setSaleDate(e.target.value);
                  setShowPreview(false);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Sale Amount <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => {
                    setTotalAmount(e.target.value);
                    setShowPreview(false);
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handlePreview}
              disabled={loading || !saleDate || !totalAmount}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
            >
              {loading ? 'Loading...' : 'Preview Distribution'}
            </button>
          </div>

          {showPreview && previewAnimals.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">
                Preview: {previewAnimals.length} animal{previewAnimals.length !== 1 ? 's' : ''} found
              </h3>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="text-sm text-green-800">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-bold">${parseFloat(totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Price Per Animal:</span>
                    <span className="font-bold">
                      ${(parseFloat(totalAmount) / previewAnimals.length).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewAnimals.map(animal => (
                  <div
                    key={animal.id}
                    className="flex items-center justify-between p-3 bg-white rounded border border-gray-200"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {animal.tag_number ? `Tag #${animal.tag_number}` : 'No Tag'}
                        {animal.name && ` - ${animal.name}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {animal.sex} • Exit Date: {animal.exit_date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Will be set to:</div>
                      <div className="font-semibold text-green-600">
                        ${(parseFloat(totalAmount) / previewAnimals.length).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition shadow-md hover:shadow-lg"
                >
                  {loading ? 'Applying...' : `Apply Prorated Prices to ${previewAnimals.length} Animals`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
