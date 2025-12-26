import { useState, useEffect, useRef } from 'react';
import { X, Edit2, Save, Trash2, FileText, Camera, Trash, Upload, Image as ImageIcon, Syringe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MedicalHistoryModal } from './MedicalHistoryModal';
import { InjectionModal } from './InjectionModal';
import { CameraCapture } from './CameraCapture';
import { PhotoGallery } from './PhotoGallery';
import { useToast } from '../contexts/ToastContext';
import { useRanch } from '../contexts/RanchContext';
import { ANIMAL_TYPES, getSexOptions, type AnimalType } from '../utils/animalTypes';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];
type AnimalPhoto = Database['public']['Tables']['animal_photos']['Row'];
type CustomFieldDefinition = Database['public']['Tables']['custom_field_definitions']['Row'];
type CustomFieldValue = Database['public']['Tables']['custom_field_values']['Row'];

interface AnimalDetailModalProps {
  animal: Animal;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  allAnimals: Animal[];
  isReadOnly?: boolean;
  isDemoMode?: boolean;
}

export function AnimalDetailModal({ animal, onClose, onUpdate, onDelete, allAnimals, isReadOnly = false, isDemoMode = false }: AnimalDetailModalProps) {
  const { showToast } = useToast();
  const { currentRanch } = useRanch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [showInjection, setShowInjection] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [injectionFeatureEnabled, setInjectionFeatureEnabled] = useState(false);

  const [formData, setFormData] = useState({
    tag_number: animal.tag_number || '',
    tag_color: animal.tag_color || '',
    name: animal.name || '',
    animal_type: ((animal as any).animal_type || 'Cattle') as AnimalType,
    sex: animal.sex,
    source: animal.source,
    status: animal.status,
    birth_date: animal.birth_date || '',
    weaning_date: animal.weaning_date || '',
    exit_date: animal.exit_date || '',
    sale_price: (animal as any).sale_price || '',
    mother_id: animal.mother_id || '',
    father_id: (animal as any).father_id || '',
    weight_lbs: (animal as any).weight_lbs || '',
    notes: animal.notes || '',
    description: animal.description || '',
  });


  const handleSave = async () => {
    if (isDemoMode) {
      setIsEditing(false);
      showToast('Demonstration Mode - Animal was not edited.', 'info');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('animals')
        .update({
          tag_number: formData.tag_number || null,
          tag_color: formData.tag_color || null,
          name: formData.name || null,
          animal_type: formData.animal_type,
          sex: formData.sex,
          source: formData.source,
          status: formData.status,
          birth_date: formData.birth_date || null,
          weaning_date: formData.weaning_date || null,
          exit_date: formData.exit_date || null,
          sale_price: formData.sale_price ? parseFloat(formData.sale_price as string) : null,
          mother_id: formData.mother_id || null,
          father_id: formData.father_id || null,
          weight_lbs: formData.weight_lbs ? parseFloat(formData.weight_lbs as string) : null,
          description: formData.description || null,
          notes: formData.notes || null,
        })
        .eq('id', animal.id);

      if (error) throw error;

      for (const field of customFields) {
        const value = customFieldValues[field.id] || null;

        if (value) {
          const { error: upsertError } = await supabase
            .from('custom_field_values')
            .upsert({
              animal_id: animal.id,
              field_id: field.id,
              value: value,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'animal_id,field_id'
            });

          if (upsertError) throw upsertError;
        } else {
          await supabase
            .from('custom_field_values')
            .delete()
            .eq('animal_id', animal.id)
            .eq('field_id', field.id);
        }
      }

      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating animal:', error);
      alert(`Failed to update animal: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDemoMode) {
      showToast('Demonstration Mode - Animal was not deleted.', 'info');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this animal and all its history? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('animals')
        .delete()
        .eq('id', animal.id);

      if (error) throw error;

      onDelete();
      onClose();
    } catch (error: any) {
      console.error('Error deleting animal:', error);
      alert(`Failed to delete animal: ${error?.message || 'Unknown error'}`);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInYears = (today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12);
      return `${months} months`;
    }
    return `${Math.floor(ageInYears)} years`;
  };

  const getMother = () => {
    if (!animal.mother_id) return null;
    return allAnimals.find(a => a.id === animal.mother_id);
  };

  const getFather = () => {
    if (!(animal as any).father_id) return null;
    return allAnimals.find(a => a.id === (animal as any).father_id);
  };

  const mother = getMother();
  const father = getFather();

  useEffect(() => {
    loadPhotos();
    loadCustomFields();
    loadInjectionFeatureSetting();
  }, [animal.id]);

  const loadInjectionFeatureSetting = async () => {
    if (!currentRanch) return;

    try {
      const { data, error } = await supabase
        .from('ranch_settings')
        .select('enable_injection_feature')
        .eq('ranch_id', currentRanch.id)
        .maybeSingle();

      if (error) throw error;
      setInjectionFeatureEnabled((data as any)?.enable_injection_feature || false);
    } catch (error) {
      console.error('Error loading injection feature setting:', error);
      setInjectionFeatureEnabled(false);
    }
  };

  const loadCustomFields = async () => {
    try {
      const { data: fieldDefs, error: fieldError } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('ranch_id', animal.ranch_id)
        .order('display_order', { ascending: true });

      if (fieldError) throw fieldError;
      setCustomFields(fieldDefs || []);

      const { data: fieldVals, error: valError } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('animal_id', animal.id);

      if (valError) throw valError;

      const values: Record<string, string> = {};
      (fieldVals || []).forEach((val) => {
        values[val.field_id] = val.value || '';
      });
      setCustomFieldValues(values);
    } catch (error: any) {
      console.error('Error loading custom fields:', error);
    }
  };

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('animal_photos')
        .select('*')
        .eq('animal_id', animal.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      console.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handlePhotoCapture = async (blob: Blob) => {
    setShowCamera(false);

    if (isDemoMode) {
      showToast('Demonstration Mode - Photo was not saved.', 'info');
      return;
    }

    setUploading(true);

    try {
      const timestamp = Date.now();
      const fileName = `${animal.ranch_id}/${animal.id}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('animal-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('animal-photos')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('animal_photos')
        .insert({
          animal_id: animal.id,
          ranch_id: animal.ranch_id,
          storage_url: publicUrl,
          is_primary: photos.length === 0
        });

      if (dbError) throw dbError;

      showToast('Photo added successfully', 'success');
      await loadPhotos();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      showToast(`Failed to upload photo: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (isDemoMode) {
      showToast('Demonstration Mode - Photo was not saved.', 'info');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploading(true);

    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${animal.ranch_id}/${animal.id}/${timestamp}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('animal-photos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('animal-photos')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('animal_photos')
        .insert({
          animal_id: animal.id,
          ranch_id: animal.ranch_id,
          storage_url: publicUrl,
          is_primary: photos.length === 0
        });

      if (dbError) throw dbError;

      showToast('Photo uploaded successfully', 'success');
      await loadPhotos();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      showToast(`Failed to upload photo: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatCustomFieldValue = (field: CustomFieldDefinition, value: string | null) => {
    if (!value) return '-';

    switch (field.field_type) {
      case 'dollar':
        const dollarValue = parseFloat(value);
        return isNaN(dollarValue) ? value : `$${dollarValue.toFixed(2)}`;
      case 'integer':
        return value;
      case 'decimal':
        const decimalValue = parseFloat(value);
        return isNaN(decimalValue) ? value : decimalValue.toFixed(2);
      case 'text':
      default:
        return value;
    }
  };

  const handleDeletePhoto = async (photo: AnimalPhoto) => {
    try {
      const urlParts = photo.storage_url.split('/animal-photos/');
      const filePath = urlParts[1];

      const { error: storageError } = await supabase.storage
        .from('animal-photos')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('animal_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      showToast('Photo deleted successfully', 'success');
      await loadPhotos();

      if (photos.length <= 1) {
        setShowGallery(false);
      }
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      showToast(`Failed to delete photo: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {animal.name || animal.tag_number || 'Animal Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {animal.sex} • {animal.status}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                {(!isReadOnly || isDemoMode) && (
                  <>
                    <button
                      onClick={() => setShowCamera(true)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Take Photo"
                      disabled={uploading}
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Upload Photo"
                      disabled={uploading}
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </>
                )}
                {photos.length > 0 && (
                  <button
                    onClick={() => setShowGallery(true)}
                    className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="View Images"
                  >
                    <ImageIcon className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {photos.length}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setShowMedical(!showMedical)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                  title="Medical History"
                >
                  <FileText className="w-5 h-5" />
                </button>
                {(!isReadOnly || isDemoMode) && (
                  <>
                    <button
                      onClick={() => {
                        if (!injectionFeatureEnabled && !isDemoMode) {
                          alert('The injection feature is disabled. Go to Settings to enable this feature.');
                          return;
                        }
                        setShowInjection(true);
                      }}
                      className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                      title="Administer Injection"
                    >
                      <Syringe className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </>
            ) : null}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Tag Number</h3>
                <p className="text-gray-900">{animal.tag_number || '-'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Tag Color</h3>
                <p className="text-gray-900">{animal.tag_color || '-'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Name</h3>
                <p className="text-gray-900">{animal.name || '-'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Animal Type</h3>
                <p className="text-gray-900">{(animal as any).animal_type || 'Cattle'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Sex</h3>
                <p className="text-gray-900">{animal.sex}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Source</h3>
                <p className="text-gray-900">{animal.source}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <p className="text-gray-900">{animal.status}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Birth Date</h3>
                <p className="text-gray-900">{formatDate(animal.birth_date)}</p>
                <p className="text-sm text-gray-500">Age: {getAge(animal.birth_date)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Weaning Date</h3>
                <p className="text-gray-900">{formatDate(animal.weaning_date)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Exit Date</h3>
                <p className="text-gray-900">{formatDate(animal.exit_date)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Sale Price</h3>
                <p className="text-gray-900">
                  {(animal as any).sale_price ? `$${parseFloat((animal as any).sale_price).toFixed(2)}` : '-'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Mother</h3>
                <p className="text-gray-900">
                  {mother ? `${mother.tag_number ? `#${mother.tag_number}` : ''} ${mother.name || mother.description || 'Unknown'}` : '-'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Father</h3>
                <p className="text-gray-900">
                  {father ? `${father.tag_number ? `#${father.tag_number}` : ''} ${father.name || father.description || 'Unknown'}` : '-'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Weight</h3>
                <p className="text-gray-900">
                  {(animal as any).weight_lbs ? `${(animal as any).weight_lbs} lbs` : '-'}
                </p>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{animal.description || '-'}</p>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{animal.notes || '-'}</p>
              </div>

              {customFields.length > 0 && (
                <>
                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Fields</h3>
                  </div>
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">{field.field_name}</h3>
                      <p className="text-gray-900">
                        {formatCustomFieldValue(field, customFieldValues[field.id] || null)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tag Number</label>
                  <input
                    type="text"
                    value={formData.tag_number}
                    onChange={(e) => setFormData({ ...formData, tag_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tag Color</label>
                  <input
                    type="text"
                    value={formData.tag_color}
                    onChange={(e) => setFormData({ ...formData, tag_color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Animal Type</label>
                  <select
                    value={formData.animal_type}
                    onChange={(e) => {
                      const newType = e.target.value as AnimalType;
                      const sexOptions = getSexOptions(newType);
                      setFormData({
                        ...formData,
                        animal_type: newType,
                        sex: sexOptions[0] as any
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="BORN">Born on Ranch</option>
                    <option value="PURCHASED">Purchased</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="PRESENT">Present</option>
                    <option value="SOLD">Sold</option>
                    <option value="BUTCHERED">Butchered</option>
                    <option value="DEAD">Dead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weaning Date</label>
                  <input
                    type="date"
                    value={formData.weaning_date}
                    onChange={(e) => setFormData({ ...formData, weaning_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exit Date</label>
                  <input
                    type="date"
                    value={formData.exit_date}
                    onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mother</label>
                  <select
                    value={formData.mother_id}
                    onChange={(e) => setFormData({ ...formData, mother_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select mother...</option>
                    {allAnimals
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Father</label>
                  <select
                    value={formData.father_id}
                    onChange={(e) => setFormData({ ...formData, father_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select father...</option>
                    {allAnimals
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight_lbs}
                    onChange={(e) => setFormData({ ...formData, weight_lbs: e.target.value })}
                    placeholder="Enter weight in pounds"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {customFields.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Fields</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.field_name}
                          {field.is_required && <span className="text-red-600 ml-1">*</span>}
                        </label>
                        {field.field_type === 'text' ? (
                          <input
                            type="text"
                            value={customFieldValues[field.id] || ''}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            required={field.is_required}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        ) : field.field_type === 'integer' ? (
                          <input
                            type="number"
                            step="1"
                            value={customFieldValues[field.id] || ''}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            required={field.is_required}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        ) : field.field_type === 'decimal' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={customFieldValues[field.id] || ''}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                            required={field.is_required}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        ) : field.field_type === 'dollar' ? (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={customFieldValues[field.id] || ''}
                              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                              required={field.is_required}
                              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
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
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

        </div>

        {showMedical && (
          <MedicalHistoryModal
            animalId={animal.id}
            animalName={animal.name || animal.tag_number || 'Unknown'}
            ranchId={animal.ranch_id}
            onClose={() => setShowMedical(false)}
            isDemoMode={isDemoMode}
          />
        )}

        {showInjection && (
          <InjectionModal
            animal={animal}
            ranchId={animal.ranch_id}
            onClose={() => setShowInjection(false)}
            onUpdate={onUpdate}
            isDemoMode={isDemoMode}
          />
        )}

        {showCamera && (
          <CameraCapture
            onCapture={handlePhotoCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        {showGallery && (
          <PhotoGallery
            photos={photos}
            onClose={() => setShowGallery(false)}
            onDelete={handleDeletePhoto}
            isReadOnly={isReadOnly}
            isDemoMode={isDemoMode}
          />
        )}
      </div>
    </div>
  );
}
