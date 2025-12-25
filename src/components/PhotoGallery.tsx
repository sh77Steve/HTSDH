import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import type { Database } from '../lib/database.types';

type AnimalPhoto = Database['public']['Tables']['animal_photos']['Row'];

interface PhotoGalleryProps {
  photos: AnimalPhoto[];
  onClose: () => void;
  onDelete: (photo: AnimalPhoto) => void;
  isReadOnly?: boolean;
}

export function PhotoGallery({ photos, onClose, onDelete, isReadOnly = false }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Photos</h2>
          <p className="text-gray-600 mb-6">This animal doesn't have any photos yet.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleDeleteCurrent = () => {
    if (confirm('Are you sure you want to delete this photo?')) {
      onDelete(currentPhoto);
      if (currentIndex >= photos.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition z-10"
        title="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {!isReadOnly && (
        <button
          onClick={handleDeleteCurrent}
          className="absolute top-4 left-4 p-2 text-white hover:bg-red-600 rounded-lg transition z-10"
          title="Delete Photo"
        >
          <Trash className="w-6 h-6" />
        </button>
      )}

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
        {currentIndex + 1} / {photos.length}
      </div>

      {photos.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-60 text-white hover:bg-opacity-80 rounded-full transition"
            title="Previous"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-60 text-white hover:bg-opacity-80 rounded-full transition"
            title="Next"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
        <img
          src={currentPhoto.storage_url}
          alt="Animal photo"
          className="max-w-full max-h-full object-contain rounded-lg"
          onError={(e) => {
            console.error('Failed to load image:', currentPhoto.storage_url);
            e.currentTarget.style.display = 'none';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-white text-center bg-red-600 bg-opacity-80 p-8 rounded-lg';
            errorDiv.innerHTML = `
              <p class="text-lg font-semibold mb-2">Failed to load image</p>
              <p class="text-sm opacity-90">The photo could not be displayed.</p>
              <p class="text-xs opacity-75 mt-2">URL: ${currentPhoto.storage_url}</p>
            `;
            e.currentTarget.parentElement?.appendChild(errorDiv);
          }}
        />
      </div>

      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                index === currentIndex
                  ? 'border-green-500 ring-2 ring-green-500'
                  : 'border-white border-opacity-50 hover:border-opacity-100'
              }`}
            >
              <img
                src={photo.storage_url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
