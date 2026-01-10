import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { AnimalDetailModal } from '../components/AnimalDetailModal';
import { GenericCSVImportModal } from '../components/GenericCSVImportModal';
import { useRanch } from '../contexts/RanchContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Plus, Upload, Trash2, Lock } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { canAddAnimal, getLicenseMessage } from '../utils/licenseEnforcement';
import { ANIMAL_TYPES, getSexOptions, type AnimalType } from '../utils/animalTypes';

type Animal = Database['public']['Tables']['animals']['Row'];

export function AnimalsPage() {
  const { currentRanch, licenseInfo, currentUserRole, isDemoMode } = useRanch();
  const { showToast } = useToast();
  const isReadOnly = currentUserRole === 'VIEWER' && !isDemoMode;
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'SOLD' | 'DEAD' | 'BUTCHERED'>('PRESENT');
  const [animalTypeFilter, setAnimalTypeFilter] = useState<'ALL' | AnimalType>('ALL');
  const [sexFilter, setSexFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    tag_number: '',
    tag_color: '',
    name: '',
    animal_type: 'Cattle' as AnimalType,
    sex: 'BULL' as any,
    source: 'BORN' as 'BORN' | 'PURCHASED',
    birth_date: '',
    weaning_date: '',
    exit_date: '',
    mother_id: '',
    father_id: '',
    notes: '',
    description: '',
  });

  useEffect(() => {
    if (currentRanch) {
      fetchAnimals();
    }
  }, [currentRanch, statusFilter, animalTypeFilter, sexFilter, searchText]);

  const fetchAnimals = async () => {
    if (!currentRanch) return;

    setLoading(true);
    try {
      let query = supabase
        .from('animals')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .neq('animal_type', 'Other')
        .order('tag_number', { ascending: true, nullsFirst: true });

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      if (animalTypeFilter !== 'ALL') {
        query = query.eq('animal_type', animalTypeFilter);
      }

      if (sexFilter !== 'ALL') {
        query = query.eq('sex', sexFilter);
      }

      if (searchText) {
        const searchLower = searchText.toLowerCase();
        query = query.or(
          `tag_number.ilike.%${searchLower}%,name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      setAnimals(data || []);
    } catch (error) {
      console.error('Error fetching animals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInYears = (today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12);
      return `${months}mo`;
    }
    return `${Math.floor(ageInYears)}yr`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'SOLD':
        return 'bg-blue-100 text-blue-800';
      case 'BUTCHERED':
        return 'bg-orange-100 text-orange-800';
      case 'DEAD':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOpenAddModal = async () => {
    if (!currentRanch) return;

    const { count } = await supabase
      .from('animals')
      .select('*', { count: 'exact', head: true })
      .eq('ranch_id', currentRanch.id);

    const totalAnimals = count || 0;

    if (!canAddAnimal(licenseInfo, totalAnimals)) {
      const message = getLicenseMessage(licenseInfo, totalAnimals);
      if (message) {
        showToast(message, 'error');
      }
      return;
    }

    const { data: settings } = await supabase
      .from('ranch_settings')
      .select('default_animal_type')
      .eq('ranch_id', currentRanch.id)
      .maybeSingle();

    const defaultType = (settings?.default_animal_type as AnimalType) || 'Cattle';
    const sexOptions = getSexOptions(defaultType);

    setFormData({
      tag_number: '',
      tag_color: '',
      name: '',
      animal_type: defaultType,
      sex: sexOptions[0].toUpperCase() as any,
      source: 'BORN',
      birth_date: '',
      weaning_date: '',
      exit_date: '',
      mother_id: '',
      father_id: '',
      notes: '',
      description: '',
    });

    setShowAddModal(true);
  };

  const handleAddAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRanch) return;

    const { count } = await supabase
      .from('animals')
      .select('*', { count: 'exact', head: true })
      .eq('ranch_id', currentRanch.id);

    const totalAnimals = count || 0;

    if (!canAddAnimal(licenseInfo, totalAnimals)) {
      showToast('Cannot add animals with current license status', 'error');
      return;
    }

    if (isDemoMode) {
      setShowAddModal(false);
      setFormData({
        tag_number: '',
        tag_color: '',
        name: '',
        animal_type: 'Cattle',
        sex: 'BULL',
        source: 'BORN',
        birth_date: '',
        weaning_date: '',
        exit_date: '',
        mother_id: '',
        father_id: '',
        notes: '',
        description: '',
      });
      showToast('Demonstration Mode - Animal was not added.', 'info');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('animals').insert({
        ranch_id: currentRanch.id,
        tag_number: formData.tag_number || null,
        tag_color: formData.tag_color || null,
        name: formData.name || null,
        animal_type: formData.animal_type,
        sex: formData.sex,
        source: formData.source,
        birth_date: formData.birth_date || null,
        weaning_date: formData.weaning_date || null,
        exit_date: formData.exit_date || null,
        mother_id: formData.mother_id || null,
        father_id: formData.father_id || null,
        description: formData.description || null,
        notes: formData.notes || null,
        status: 'PRESENT',
      });

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        tag_number: '',
        tag_color: '',
        name: '',
        animal_type: 'Cattle',
        sex: 'BULL',
        source: 'BORN',
        birth_date: '',
        weaning_date: '',
        exit_date: '',
        mother_id: '',
        father_id: '',
        notes: '',
        description: '',
      });
      await fetchAnimals();
    } catch (error: any) {
      console.error('Error adding animal:', error);
      const errorMessage = error?.message || 'Unknown error';
      const errorCode = error?.code || '';
      const errorDetails = error?.details || '';
      alert(`Failed to add animal.\n\nError: ${errorMessage}\nCode: ${errorCode}\nDetails: ${errorDetails}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout currentPage="animals">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Animals</h1>
            <p className="text-gray-600 mt-1">Manage your herd</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (licenseInfo.mode === 'license_expired' || isReadOnly) {
                  showToast(isReadOnly ? 'You have read-only access to this ranch.' : 'Cannot import - license expired. Please activate a valid license.', 'error');
                } else if (isDemoMode) {
                  showToast('Demonstration Mode - Import not available in demo mode.', 'info');
                } else {
                  setShowImportModal(true);
                }
              }}
              disabled={licenseInfo.mode === 'license_expired' || isReadOnly}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(licenseInfo.mode === 'license_expired' || isReadOnly) ? <Lock className="w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
              Import CSV
            </button>
            <button
              onClick={handleOpenAddModal}
              disabled={licenseInfo.mode === 'license_expired' || (licenseInfo.mode === 'max_animals_reached' && !isDemoMode) || isReadOnly}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(licenseInfo.mode === 'license_expired' || (licenseInfo.mode === 'max_animals_reached' && !isDemoMode) || isReadOnly) ? <Lock className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              Add Animal
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <input
              type="text"
              placeholder="Search tag, name, or description..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="md:col-span-2 lg:col-span-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="PRESENT">Present</option>
              <option value="ALL">All Statuses</option>
              <option value="SOLD">Sold</option>
              <option value="BUTCHERED">Butchered</option>
              <option value="DEAD">Dead</option>
            </select>

            <select
              value={animalTypeFilter}
              onChange={(e) => setAnimalTypeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="ALL">All Types</option>
              {ANIMAL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="ALL">All Sexes</option>
              {animalTypeFilter !== 'ALL' ? (
                getSexOptions(animalTypeFilter).map(sex => (
                  <option key={sex} value={sex.toUpperCase()}>{sex}</option>
                ))
              ) : (
                <>
                  <option value="BULL">Bull</option>
                  <option value="COW">Cow</option>
                  <option value="STEER">Steer</option>
                  <option value="HEIFER">Heifer</option>
                  <option value="STALLION">Stallion</option>
                  <option value="MARE">Mare</option>
                  <option value="GELDING">Gelding</option>
                  <option value="RAM">Ram</option>
                  <option value="EWE">Ewe</option>
                  <option value="BUCK">Buck</option>
                  <option value="DOE">Doe</option>
                  <option value="BOAR">Boar</option>
                  <option value="SOW">Sow</option>
                </>
              )}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading animals...</p>
            </div>
          ) : animals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No animals found</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or add a new animal</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tag
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sex
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {animals.map((animal) => (
                    <tr
                      key={animal.id}
                      className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => setSelectedAnimal(animal)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {animal.tag_number || '-'}
                        </div>
                        {animal.tag_color && (
                          <div className="text-xs text-gray-500">{animal.tag_color}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{animal.name || '-'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{animal.sex}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(animal.status)}`}>
                          {animal.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getAge(animal.birth_date)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">{animal.description || '-'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && animals.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {animals.length} animal{animals.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {selectedAnimal && (
          <AnimalDetailModal
            animal={selectedAnimal}
            onClose={() => setSelectedAnimal(null)}
            onUpdate={() => {
              fetchAnimals();
              setSelectedAnimal(null);
            }}
            onDelete={() => {
              fetchAnimals();
            }}
            allAnimals={animals}
            isReadOnly={isReadOnly}
            isDemoMode={isDemoMode}
          />
        )}

        {showImportModal && (
          <GenericCSVImportModal
            onClose={() => setShowImportModal(false)}
            onComplete={() => {
              setShowImportModal(false);
              fetchAnimals();
            }}
          />
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Add New Animal</h3>
              <form onSubmit={handleAddAnimal} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tag Number
                    </label>
                    <input
                      type="text"
                      value={formData.tag_number}
                      onChange={(e) => setFormData({ ...formData, tag_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., 123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tag Color
                    </label>
                    <input
                      type="text"
                      value={formData.tag_color}
                      onChange={(e) => setFormData({ ...formData, tag_color: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Yellow"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Bessie"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Animal Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.animal_type}
                      onChange={(e) => {
                        const newType = e.target.value as AnimalType;
                        const sexOptions = getSexOptions(newType);
                        setFormData({
                          ...formData,
                          animal_type: newType,
                          sex: sexOptions[0].toUpperCase() as any
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      {ANIMAL_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sex <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      {getSexOptions(formData.animal_type).map(sex => (
                        <option key={sex} value={sex.toUpperCase()}>{sex}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value as 'BORN' | 'PURCHASED' })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="BORN">Born on Ranch</option>
                      <option value="PURCHASED">Purchased</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birth Date (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weaning Date (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.weaning_date}
                      onChange={(e) => setFormData({ ...formData, weaning_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exit Date (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.exit_date}
                      onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Date sold or died</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mother (optional)
                    </label>
                    <select
                      value={formData.mother_id}
                      onChange={(e) => setFormData({ ...formData, mother_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select mother...</option>
                      {animals
                        .filter(a => {
                          const animalType = (a as any).animal_type || 'Cattle';
                          if (animalType !== formData.animal_type) return false;
                          const sex = a.sex.toUpperCase();
                          return ['COW', 'HEIFER', 'MARE', 'FILLY', 'EWE', 'DOE', 'SOW', 'GILT'].includes(sex);
                        })
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.tag_number ? `#${a.tag_number}` : ''} {a.name || a.description || 'Unknown'}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Father (optional)
                    </label>
                    <select
                      value={formData.father_id}
                      onChange={(e) => setFormData({ ...formData, father_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select father...</option>
                      {animals
                        .filter(a => {
                          const animalType = (a as any).animal_type || 'Cattle';
                          if (animalType !== formData.animal_type) return false;
                          const sex = a.sex.toUpperCase();
                          return ['BULL', 'STEER', 'STALLION', 'GELDING', 'COLT', 'RAM', 'WETHER', 'BUCK', 'BOAR', 'BARROW'].includes(sex);
                        })
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.tag_number ? `#${a.tag_number}` : ''} {a.name || a.description || 'Unknown'}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Physical description, breed, etc..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormData({
                        tag_number: '',
                        tag_color: '',
                        name: '',
                        animal_type: 'Cattle',
                        sex: 'BULL',
                        source: 'BORN',
                        birth_date: '',
                        weaning_date: '',
                        exit_date: '',
                        mother_id: '',
                        father_id: '',
                        notes: '',
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
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Adding...' : 'Add Animal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
