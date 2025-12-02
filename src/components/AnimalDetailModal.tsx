import { useState, useEffect } from 'react';
import { X, Edit2, Save, Trash2, FileText, Camera, Trash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MedicalHistoryModal } from './MedicalHistoryModal';
import { CameraCapture } from './CameraCapture';
import { useToast } from '../contexts/ToastContext';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];
type AnimalPhoto = Database['public']['Tables']['animal_photos']['Row'];

interface AnimalDetailModalProps {
  animal: Animal;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  allAnimals: Animal[];
}

export function AnimalDetailModal({ animal, onClose, onUpdate, onDelete, allAnimals }: AnimalDetailModalProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    tag_number: animal.tag_number || '',
    tag_color: animal.tag_color || '',
    name: animal.name || '',
    sex: animal.sex,
    source: animal.source,
    status: animal.status,
    birth_date: animal.birth_date || '',
    weaning_date: animal.weaning_date || '',
    exit_date: animal.exit_date || '',
    mother_id: animal.mother_id || '',
    father_id: (animal as any).father_id || '',
    weight_lbs: (animal as any).weight_lbs || '',
    notes: animal.notes || '',
    description: animal.description || '',
  });


  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('animals')
        .update({
          tag_number: formData.tag_number || null,
          tag_color: formData.tag_color || null,
          name: formData.name || null,
          sex: formData.sex,
          source: formData.source,
          status: formData.status,
          birth_date: formData.birth_date || null,
          weaning_date: formData.weaning_date || null,
          exit_date: formData.exit_date || null,
          mother_id: formData.mother_id || null,
          father_id: formData.father_id || null,
          weight_lbs: formData.weight_lbs ? parseFloat(formData.weight_lbs as string) : null,
          description: formData.description || null,
          notes: formData.notes || null,
        })
        .eq('id', animal.id);

      if (error) throw error;

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
    if (!confirm('Are you sure you want to delete this animal? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('animals')
        .update({ is_active: false })
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
  }, [animal.id]);

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
    setUploading(true);
    setShowCamera(false);

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

  const handleDeletePhoto = async (photo: AnimalPhoto) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

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
                <button
                  onClick={() => setShowCamera(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Take Photo"
                  disabled={uploading}
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowMedical(!showMedical)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                  title="Medical History"
                >
                  <FileText className="w-5 h-5" />
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
          {!isEditing && photos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square">
                    <img
                      src={photo.storage_url}
                      alt="Animal photo"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      title="Delete photo"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="BULL">Bull</option>
                    <option value="COW">Cow</option>
                    <option value="STEER">Steer</option>
                    <option value="HEIFER">Heifer</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mother</label>
                  <select
                    value={formData.mother_id}
                    onChange={(e) => setFormData({ ...formData, mother_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select mother...</option>
                    {allAnimals
                      .filter(a => a.sex === 'COW' || a.sex === 'HEIFER')
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
                      .filter(a => a.sex === 'BULL' || a.sex === 'STEER')
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
          />
        )}

        {showCamera && (
          <CameraCapture
            onCapture={handlePhotoCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </div>
    </div>
  );
}
