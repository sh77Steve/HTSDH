import { useState, useRef } from 'react';
import { X, Upload, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRanch } from '../contexts/RanchContext';
import { useAuth } from '../contexts/AuthContext';

interface DirectPhotoUploadModalProps {
  animalId: string;
  animalName: string;
  onClose: () => void;
  onComplete: () => void;
}

interface ImageFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function DirectPhotoUploadModal({ animalId, animalName, onClose, onComplete }: DirectPhotoUploadModalProps) {
  const { currentRanch } = useRanch();
  const { user } = useAuth();
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    const newImageFiles: ImageFile[] = files
      .filter(file => imageFileTypes.includes(file.type))
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
      }));

    setImageFiles(prev => [...prev, ...newImageFiles]);
  };

  const handleRemove = (index: number) => {
    const img = imageFiles[index];
    URL.revokeObjectURL(img.preview);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!currentRanch || !user) return;

    const filesToUpload = imageFiles.filter(img => img.status === 'pending');
    if (filesToUpload.length === 0) return;

    setUploading(true);

    const existingPhotosCount = await getAnimalPhotoCount();

    for (let i = 0; i < imageFiles.length; i++) {
      const img = imageFiles[i];

      if (img.status !== 'pending') continue;

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

        const { error: dbError } = await supabase
          .from('animal_photos')
          .insert({
            animal_id: animalId,
            ranch_id: currentRanch.id,
            storage_url: publicUrl,
            taken_by_user_id: user.id,
            is_primary: existingPhotosCount === 0 && i === 0,
            caption: `Photo for ${animalName}`,
            is_synced: true,
            file_size_bytes: img.file.size
          });

        if (dbError) throw dbError;

        setImageFiles(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'success' } : item
        ));
      } catch (error: any) {
        console.error('Error uploading image:', error);
        setImageFiles(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: error.message } : item
        ));
      }
    }

    setUploading(false);

    const successCount = imageFiles.filter(img => img.status === 'success').length;
    if (successCount > 0) {
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  const getAnimalPhotoCount = async (): Promise<number> => {
    const { count } = await supabase
      .from('animal_photos')
      .select('*', { count: 'exact', head: true })
      .eq('animal_id', animalId);

    return count || 0;
  };

  const pendingCount = imageFiles.filter(img => img.status === 'pending').length;
  const successCount = imageFiles.filter(img => img.status === 'success').length;
  const errorCount = imageFiles.filter(img => img.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Photos</h2>
            <p className="text-sm text-gray-600 mt-1">
              For: <span className="font-medium">{animalName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            disabled={uploading}
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
                    <p className="font-medium mb-1">Tip:</p>
                    <p>You can select multiple photos at once. All selected photos will be uploaded to this item.</p>
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
                    disabled={uploading}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
                  >
                    Add More
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
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
                    <div className="relative aspect-square bg-gray-100">
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
                          <div className="bg-white rounded-lg px-3 py-1.5 text-xs font-medium">
                            Uploading...
                          </div>
                        </div>
                      )}
                      {img.status === 'pending' && (
                        <button
                          onClick={() => handleRemove(index)}
                          disabled={uploading}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition disabled:opacity-50"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {img.status === 'error' && (
                      <div className="p-2">
                        <p className="text-xs text-red-600 truncate">{img.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  disabled={uploading}
                >
                  {successCount > 0 ? 'Done' : 'Cancel'}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={pendingCount === 0 || uploading}
                  className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : `Upload ${pendingCount} Photo${pendingCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
