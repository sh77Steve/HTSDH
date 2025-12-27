import { useState, useEffect } from 'react';
import { X, Syringe, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getTodayLocalDate, parseLocalDate } from '../utils/printHelpers';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];
type MedicalHistory = Database['public']['Tables']['medical_history']['Row'];

interface Drug {
  id: string;
  drug_name: string;
  animal_type: string;
  ccs_per_pound: number | null;
  fixed_dose_ml: number | null;
  notes: string | null;
}

interface InjectionModalProps {
  animal: Animal;
  ranchId: string;
  onClose: () => void;
  onUpdate: () => void;
  isDemoMode?: boolean;
}

export function InjectionModal({ animal, ranchId, onClose, onUpdate, isDemoMode = false }: InjectionModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [saving, setSaving] = useState(false);

  const [estimatedWeight, setEstimatedWeight] = useState<string>(
    (animal as any).weight_lbs?.toString() || ''
  );
  const [selectedDrugId, setSelectedDrugId] = useState<string>('');
  const [injectionDate, setInjectionDate] = useState<string>(getTodayLocalDate());
  const [adminNotes, setAdminNotes] = useState<string>('');

  const [showWeightCalculator, setShowWeightCalculator] = useState(false);
  const [heartGirth, setHeartGirth] = useState<string>('');
  const [bodyLength, setBodyLength] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [animal.id, ranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const animalType = (animal as any).animal_type || 'Cattle';

      const [historyResult, drugsResult] = await Promise.all([
        supabase
          .from('medical_history')
          .select('*')
          .eq('animal_id', animal.id)
          .order('date', { ascending: false }),
        supabase
          .from('drugs')
          .select('*')
          .eq('ranch_id', ranchId)
          .eq('animal_type', animalType)
          .order('drug_name', { ascending: true })
      ]);

      if (historyResult.error) throw historyResult.error;
      if (drugsResult.error) throw drugsResult.error;

      setMedicalHistory(historyResult.data || []);
      setDrugs(drugsResult.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showToast(`Failed to load data: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedDrug = drugs.find(d => d.id === selectedDrugId);

  const calculateDose = (): number | null => {
    if (!selectedDrug || !estimatedWeight) return null;

    const weight = parseFloat(estimatedWeight);
    if (isNaN(weight)) return null;

    if (selectedDrug.fixed_dose_ml !== null) {
      return selectedDrug.fixed_dose_ml;
    }

    if (selectedDrug.ccs_per_pound !== null) {
      return weight * selectedDrug.ccs_per_pound;
    }

    return null;
  };

  const dose = calculateDose();

  const handleAdminister = async (e: React.FormEvent) => {
    e.preventDefault();

    const weight = parseFloat(estimatedWeight);
    if (isNaN(weight) || weight < 1 || weight > 6000) {
      showToast('Please enter a valid weight between 1 and 6000 lbs', 'error');
      return;
    }

    if (!selectedDrug) {
      showToast('Please select a drug', 'error');
      return;
    }

    if (dose === null) {
      showToast('Unable to calculate dose', 'error');
      return;
    }

    if (isDemoMode) {
      const description = `${selectedDrug.drug_name} - ${dose.toFixed(2)} ml${adminNotes ? '\n' + adminNotes : ''}`;
      const demoMessage = `Demonstration Mode - The following medical history was not added:\n\nDate: ${injectionDate}\nDrug: ${selectedDrug.drug_name}\nDose: ${dose.toFixed(2)} ml\nWeight: ${weight} lbs${adminNotes ? '\nNotes: ' + adminNotes : ''}`;
      alert(demoMessage);
      onClose();
      return;
    }

    setSaving(true);

    try {
      const description = `${selectedDrug.drug_name} - ${dose.toFixed(2)} ml${adminNotes ? '\n' + adminNotes : ''}`;

      const { error: historyError } = await supabase.from('medical_history').insert({
        animal_id: animal.id,
        ranch_id: ranchId,
        date: injectionDate,
        description,
        created_by_user_id: user?.id || null,
      });

      if (historyError) throw historyError;

      const currentAnimalWeight = (animal as any).weight_lbs;
      if (currentAnimalWeight !== weight) {
        const shouldUpdate = window.confirm(
          `Save your weight estimate as the animal's new weight?\n\nCurrent weight: ${currentAnimalWeight || 'Not set'} lbs\nNew weight: ${weight} lbs`
        );

        if (shouldUpdate) {
          const { error: updateError } = await supabase
            .from('animals')
            .update({ weight_lbs: weight })
            .eq('id', animal.id);

          if (updateError) throw updateError;
        }
      }

      showToast('Injection administered successfully', 'success');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error administering injection:', error);
      showToast(`Failed to administer injection: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) => {
    return parseLocalDate(date).toLocaleDateString();
  };

  const getWeightFormula = (animalType: string) => {
    switch (animalType.toLowerCase()) {
      case 'cattle':
        return {
          divisor: 300,
          hgLabel: 'Heart Girth (HG)',
          hgDescription: 'Circumference around the chest behind the front legs',
          blLabel: 'Body Length (BL)',
          blDescription: 'Distance from point of shoulder to pin bone',
          imagePath: '/weightmeasure.jpg',
        };
      case 'horse':
        return {
          divisor: 330,
          hgLabel: 'Heart Girth (HG)',
          hgDescription: 'Around the barrel where the girth/cinch sits (just behind the elbow)',
          blLabel: 'Body Length (BL)',
          blDescription: 'Point of shoulder to point of buttock',
          imagePath: '/horse.jpg',
        };
      case 'pig':
        return {
          divisor: 400,
          hgLabel: 'Heart Girth (HG)',
          hgDescription: 'Circumference just behind the forelegs',
          blLabel: 'Body Length (BL)',
          blDescription: 'Between the ears (poll) to base of tail, along the back',
          imagePath: '/pig.jpg',
        };
      case 'sheep':
      case 'goat':
        return {
          divisor: 300,
          hgLabel: 'Heart Girth (HG)',
          hgDescription: 'Circumference around the chest behind the front legs (part/compress wool if unshorn)',
          blLabel: 'Body Length (BL)',
          blDescription: 'Distance from point of shoulder to pin bone',
          imagePath: '/sheep_goat.jpg',
        };
      default:
        return null;
    }
  };

  const animalType = (animal as any).animal_type || 'Cattle';
  const weightFormula = getWeightFormula(animalType);

  const handleCalculateWeight = () => {
    const hg = parseFloat(heartGirth);
    const bl = parseFloat(bodyLength);

    if (isNaN(hg) || isNaN(bl) || hg <= 0 || bl <= 0) {
      showToast('Please enter valid measurements', 'error');
      return;
    }

    if (!weightFormula) return;

    const calculatedWeight = (hg * hg * bl) / weightFormula.divisor;
    setEstimatedWeight(Math.round(calculatedWeight).toString());
    setShowWeightCalculator(false);
    setHeartGirth('');
    setBodyLength('');
    showToast(`Estimated weight: ${Math.round(calculatedWeight)} lbs`, 'success');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Administer Injection</h2>
            <p className="text-sm text-gray-600 mt-1">
              {animal.name || animal.tag_number || 'Unknown'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Previous Medical History</h3>
                {medicalHistory.length === 0 ? (
                  <p className="text-gray-600 text-sm">No medical history on record</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {medicalHistory.slice(0, 5).map((record) => (
                      <div key={record.id} className="flex gap-3 text-sm">
                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                          {formatDate(record.date)}
                        </span>
                        <span className="text-gray-700">{record.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAdminister} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Injection Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={injectionDate}
                    onChange={(e) => setInjectionDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Date the injection was/will be administered</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Estimated Animal Weight (lbs) <span className="text-red-500">*</span>
                    </label>
                    {weightFormula && (
                      <button
                        type="button"
                        onClick={() => setShowWeightCalculator(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                        title="Help Estimate Weight"
                      >
                        <Calculator className="w-4 h-4" />
                        Help Estimate Weight
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={estimatedWeight}
                    onChange={(e) => setEstimatedWeight(e.target.value)}
                    placeholder="Enter weight in pounds"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    min="1"
                    max="6000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Weight must be between 1 and 6000 lbs</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Drug <span className="text-red-500">*</span>
                  </label>
                  {drugs.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No drugs configured. Please add drugs in Settings before administering injections.
                    </p>
                  ) : (
                    <select
                      value={selectedDrugId}
                      onChange={(e) => setSelectedDrugId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a drug...</option>
                      {drugs.map((drug) => (
                        <option key={drug.id} value={drug.id}>
                          {drug.drug_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedDrug && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-gray-900">Drug Information</h4>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="font-medium">Drug Name:</span> {selectedDrug.drug_name}
                      </p>
                      {selectedDrug.ccs_per_pound !== null ? (
                        <p>
                          <span className="font-medium">Dosage:</span> {selectedDrug.ccs_per_pound} ml per pound
                        </p>
                      ) : selectedDrug.fixed_dose_ml !== null ? (
                        <p>
                          <span className="font-medium">Dosage:</span> {selectedDrug.fixed_dose_ml} ml (fixed dose)
                        </p>
                      ) : null}
                      {selectedDrug.notes && (
                        <p>
                          <span className="font-medium">Notes:</span> {selectedDrug.notes}
                        </p>
                      )}
                      {dose !== null && (
                        <p className="text-lg font-bold text-blue-900 mt-2">
                          Calculated Dose: {dose.toFixed(2)} ml
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Administration Notes (optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Administered in left hindquarter, animal was calm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || drugs.length === 0}
                    className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    <Syringe className="w-4 h-4 mr-2" />
                    {saving ? 'Administering...' : 'Administer'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {showWeightCalculator && weightFormula && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h3 className="text-xl font-semibold text-gray-900">Estimate Weight - {animalType}</h3>
              <button
                onClick={() => {
                  setShowWeightCalculator(false);
                  setHeartGirth('');
                  setBodyLength('');
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 pb-6 flex-1">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-900">
                <p className="font-medium">⚠️ Disclaimer:</p>
                <p className="mt-1">This method of weight estimating is not always accurate. Please double check based on your ranching experience.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-medium mb-2">How to Measure:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>{weightFormula.hgLabel}:</strong> {weightFormula.hgDescription}</li>
                  <li><strong>{weightFormula.blLabel}:</strong> {weightFormula.blDescription}</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-2">
                <img
                  src={weightFormula.imagePath}
                  alt="Measurement diagram showing Heart Girth and Body Length"
                  className="w-full h-auto rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {weightFormula.hgLabel} (inches) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={heartGirth}
                  onChange={(e) => setHeartGirth(e.target.value)}
                  placeholder="e.g., 76"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {weightFormula.blLabel} (inches) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bodyLength}
                  onChange={(e) => setBodyLength(e.target.value)}
                  placeholder="e.g., 66"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                />
              </div>

              {heartGirth && bodyLength && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-1">Formula: (HG × HG × BL) / {weightFormula.divisor}</p>
                  <p className="text-lg font-bold text-green-900">
                    Estimated Weight: {Math.round((parseFloat(heartGirth) ** 2 * parseFloat(bodyLength)) / weightFormula.divisor)} lbs
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowWeightCalculator(false);
                    setHeartGirth('');
                    setBodyLength('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCalculateWeight}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition"
                >
                  Use This Weight
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
