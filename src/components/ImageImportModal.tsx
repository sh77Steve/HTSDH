import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRanch } from '../contexts/RanchContext';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];

interface ImageImportModalProps {
  onClose: () => void;
  onComplete: () => void;
  animals: Animal[];
}

interface ImageFile {
  file: File;
  preview: string;
  selectedAnimalId: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function ImageImportModal({ onClose, onComplete, animals }: ImageImportModalProps) {
  const { currentRanch } = useRanch();
  const { user } = useAuth();
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    const newImageFiles: ImageFile[] = files
      .filter(file => imageFileTypes.includes(file.type))
      .map(file => {
        const preview = URL.createObjectURL(file);
        const matchedAnimal = findMatchingAnimal(file.name);

        return {
          file,
          preview,
          selectedAnimalId: matchedAnimal?.id || null,
          status: 'pending' as const,
        };
      });

    setImageFiles(prev => [...prev, ...newImageFiles]);
  };

  const findMatchingAnimal = (filename: string): Animal | null => {
    const cleanName = filename.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, '');

    return animals.find(animal => {
      const tagNumber = animal.tag_number?.toLowerCase();
      const legacyUid = animal.legacy_uid?.toLowerCase();
      const name = animal.name?.toLowerCase();

      if (tagNumber && cleanName.includes(tagNumber)) return true;
      if (legacyUid && cleanName.includes(legacyUid)) return true;
      if (name && cleanName.includes(name)) return true;

      return false;
    }) || null;
  };

  const handleAnimalSelect = (index: number, animalId: string) => {
    setImageFiles(prev => prev.map((img, i) =>
      i === index ? { ...img, selectedAnimalId: animalId } : img
    ));
  };

  const handleRemove = (index: number) => {
    const img = imageFiles[index];
    URL.revokeObjectURL(img.preview);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!currentRanch || !user) return;

    const filesToImport = imageFiles.filter(img => img.selectedAnimalId && img.status === 'pending');
    if (filesToImport.length === 0) return;

    setImporting(true);

    for (let i = 0; i < imageFiles.length; i++) {
      const img = imageFiles[i];

      if (!img.selectedAnimalId || img.status !== 'pending') continue;

      setImageFiles(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'uploading' } : item
      ));

      try {
        const fileExt = img.file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${currentRanch.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('animal-photos')
          .upload(filePath, img.file, {
            contentType: img.file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('animal-photos')
          .getPublicUrl(filePath);

        const animal = animals.find(a => a.id === img.selectedAnimalId);
        const existingPhotosCount = await getAnimalPhotoCount(img.selectedAnimalId);

        const { error: dbError } = await supabase
          .from('animal_photos')
          .insert({
            animal_id: img.selectedAnimalId,
            ranch_id: currentRanch.id,
            storage_url: publicUrl,
            taken_by_user_id: user.id,
            is_primary: existingPhotosCount === 0,
            description: `Imported photo for ${animal?.name || animal?.tag_number || 'animal'}`,
            is_synced: true,
          });

        if (dbError) throw dbError;

        setImageFiles(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'success' } : item
        ));
      } catch (error: any) {
        console.error('Error importing image:', error);
        setImageFiles(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: error.message } : item
        ));
      }
    }

    setImporting(false);

    const successCount = imageFiles.filter(img => img.status === 'success').length;
    if (successCount > 0) {
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
  };

  const getAnimalPhotoCount = async (animalId: string): Promise<number> => {
    const { count } = await supabase
      .from('animal_photos')
      .select('*', { count: 'exact', head: true })
      .eq('animal_id', animalId);

    return count || 0;
  };

  const pendingCount = imageFiles.filter(img => img.status === 'pending' && img.selectedAnimalId).length;
  const successCount = imageFiles.filter(img => img.status === 'success').length;
  const errorCount = imageFiles.filter(img => img.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import Animal Photos</h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload photos and link them to animals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            disabled={importing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {imageFiles.length === 0 ? (
            <div className="text-center py-12">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex flex-col items-center gap-3 px-8 py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
              >
                <Upload className="w-16 h-16 text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-900">Select Photos</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose one or more images (JPEG, PNG, WebP)
                  </p>
                </div>
              </button>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-2xl mx-auto">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">Tips for importing photos:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Name your files with the animal's tag number or name for auto-matching</li>
                      <li>Example: "30Red.jpg" will auto-match to animal with tag "30Red"</li>
                      <li>You can manually select the animal for each photo after upload</li>
                      <li>The first photo imported for an animal becomes its primary photo</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {imageFiles.length} photo{imageFiles.length !== 1 ? 's' : ''} selected
                  {successCount > 0 && ` • ${successCount} uploaded`}
                  {errorCount > 0 && ` • ${errorCount} failed`}
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
                  >
                    Add More
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {imageFiles.map((img, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg overflow-hidden ${
                      img.status === 'success' ? 'border-green-500 bg-green-50' :
                      img.status === 'error' ? 'border-red-500 bg-red-50' :
                      img.status === 'uploading' ? 'border-blue-500 bg-blue-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-100">
                      <img
                        src={img.preview}
                        alt={img.file.name}
                        className="w-full h-full object-cover"
                      />
                      {img.status === 'success' && (
                        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                          <div className="bg-green-500 rounded-full p-2">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                      {img.status === 'uploading' && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <div className="bg-white rounded-lg px-4 py-2 text-sm font-medium">
                            Uploading...
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate mb-2">
                        {img.file.name}
                      </p>
                      {img.status === 'error' && (
                        <p className="text-xs text-red-600 mb-2">{img.error}</p>
                      )}
                      {img.status !== 'success' && (
                        <div className="flex gap-2">
                          <select
                            value={img.selectedAnimalId || ''}
                            onChange={(e) => handleAnimalSelect(index, e.target.value)}
                            disabled={importing}
                            className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                          >
                            <option value="">Select animal...</option>
                            {animals.map(animal => (
                              <option key={animal.id} value={animal.id}>
                                {animal.tag_number || animal.name || animal.legacy_uid || `Animal ${animal.id.slice(0, 8)}`}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemove(index)}
                            disabled={importing}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  disabled={importing}
                >
                  {successCount > 0 ? 'Done' : 'Cancel'}
                </button>
                <button
                  onClick={handleImport}
                  disabled={pendingCount === 0 || importing}
                  className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importing ? 'Importing...' : `Import ${pendingCount} Photo${pendingCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
