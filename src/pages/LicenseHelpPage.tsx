import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { MessageList } from '../components/MessageList';
import { SendMessage } from '../components/SendMessage';
import { TermsModal } from '../components/TermsModal';
import { InfrastructureItemModal } from '../components/InfrastructureItemModal';
import { CameraCapture } from '../components/CameraCapture';
import { DirectPhotoUploadModal } from '../components/DirectPhotoUploadModal';
import { PhotoGallery } from '../components/PhotoGallery';
import { useRanch } from '../contexts/RanchContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Key, HelpCircle, RefreshCw, Plus, Camera, Upload, Edit, Trash2, Image, Film, GitBranch } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];
type AnimalPhoto = Database['public']['Tables']['animal_photos']['Row'];

export function LicenseHelpPage() {
  const { currentRanch, licenseInfo, refreshRanchData, isDemoMode, currentUserRole } = useRanch();
  const { showToast } = useToast();
  const isReadOnly = currentUserRole === 'VIEWER' && !isDemoMode;
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [showTermsReminder, setShowTermsReminder] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [savingContact, setSavingContact] = useState(false);
  const [refreshMessages, setRefreshMessages] = useState(0);
  const [infrastructureItems, setInfrastructureItems] = useState<Animal[]>([]);
  const [loadingInfrastructure, setLoadingInfrastructure] = useState(true);
  const [showInfrastructureModal, setShowInfrastructureModal] = useState(false);
  const [selectedInfrastructure, setSelectedInfrastructure] = useState<Animal | null>(null);
  const [showCamera, setShowCamera] = useState<Animal | null>(null);
  const [showImageImport, setShowImageImport] = useState<Animal | null>(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState<string | null>(null);
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  useEffect(() => {
    if (currentRanch) {
      setContactInfo({
        name: currentRanch.contact_name || '',
        email: currentRanch.contact_email || '',
        phone: currentRanch.contact_phone || '',
      });
      fetchInfrastructureItems();
    }
  }, [currentRanch]);

  const fetchInfrastructureItems = async () => {
    if (!currentRanch) return;

    setLoadingInfrastructure(true);
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .eq('animal_type', 'Other')
        .order('description', { ascending: true });

      if (error) throw error;
      setInfrastructureItems(data || []);
    } catch (error) {
      console.error('Error fetching infrastructure items:', error);
    } finally {
      setLoadingInfrastructure(false);
    }
  };

  const handleAddInfrastructure = () => {
    setSelectedInfrastructure(null);
    setShowInfrastructureModal(true);
  };

  const handleEditInfrastructure = (item: Animal) => {
    setSelectedInfrastructure(item);
    setShowInfrastructureModal(true);
  };

  const handleSaveInfrastructure = async (description: string) => {
    if (!currentRanch) return;

    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      return;
    }

    try {
      if (selectedInfrastructure) {
        const { error } = await supabase
          .from('animals')
          .update({ description })
          .eq('id', selectedInfrastructure.id);

        if (error) throw error;
        showToast('Infrastructure item updated', 'success');
      } else {
        const { error } = await supabase
          .from('animals')
          .insert({
            ranch_id: currentRanch.id,
            animal_type: 'Other',
            sex: 'BULL',
            source: 'BORN',
            status: 'PRESENT',
            description,
          });

        if (error) throw error;
        showToast('Infrastructure item added', 'success');
      }

      await fetchInfrastructureItems();
    } catch (error) {
      console.error('Error saving infrastructure item:', error);
      showToast('Failed to save infrastructure item', 'error');
      throw error;
    }
  };

  const handleDeleteInfrastructure = async (item: Animal) => {
    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${item.description}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('animals')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      showToast('Infrastructure item deleted', 'success');
      await fetchInfrastructureItems();
    } catch (error) {
      console.error('Error deleting infrastructure item:', error);
      showToast('Failed to delete infrastructure item', 'error');
    }
  };

  const handleViewPhotos = async (animalId: string) => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('animal_photos')
        .select('*')
        .eq('animal_id', animalId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPhotos(data || []);
      setShowPhotoGallery(animalId);
    } catch (error) {
      console.error('Error fetching photos:', error);
      showToast('Failed to load photos', 'error');
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photo: AnimalPhoto) => {
    if (isDemoMode) {
      showToast('Demonstration Mode - Photo was not deleted.', 'info');
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from('animal-photos')
        .remove([photo.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('animal_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      setPhotos(photos.filter(p => p.id !== photo.id));
      showToast('Photo deleted successfully', 'success');

      if (photos.length <= 1) {
        setShowPhotoGallery(null);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      showToast('Failed to delete photo', 'error');
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licenseKey.trim()) {
      showToast('Please enter a license key', 'error');
      return;
    }

    if (!currentRanch) {
      showToast('No ranch selected', 'error');
      return;
    }

    setActivating(true);
    try {
      const { data: keyData, error: keyError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('key', licenseKey.trim().toUpperCase())
        .maybeSingle();

      if (keyError || !keyData) {
        showToast('Invalid license key', 'error');
        setActivating(false);
        return;
      }

      if (keyData.used_by_ranch_id && keyData.used_by_ranch_id !== currentRanch.id) {
        showToast('This license key is already in use by another ranch', 'error');
        setActivating(false);
        return;
      }

      const expirationDate = new Date(keyData.expiration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expirationDate < today) {
        showToast('This license key has expired', 'error');
        setActivating(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('ranches')
        .update({
          license_type: keyData.license_type,
          license_expiration: keyData.expiration_date,
          max_animals: keyData.max_animals,
        })
        .eq('id', currentRanch.id);

      if (updateError) throw updateError;

      const { error: keyUpdateError } = await supabase
        .from('license_keys')
        .update({ used_by_ranch_id: currentRanch.id })
        .eq('id', keyData.id);

      if (keyUpdateError) throw keyUpdateError;

      showToast('License activated successfully!', 'success');
      setLicenseKey('');
      await refreshRanchData();
      setShowTermsReminder(true);
    } catch (error) {
      console.error('Error activating license:', error);
      showToast('Failed to activate license', 'error');
    } finally {
      setActivating(false);
    }
  };

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRanch) return;

    setSavingContact(true);
    try {
      const { error } = await supabase
        .from('ranches')
        .update({
          contact_name: contactInfo.name || null,
          contact_email: contactInfo.email || null,
          contact_phone: contactInfo.phone || null,
        })
        .eq('id', currentRanch.id);

      if (error) throw error;

      showToast('Contact information saved', 'success');
      await refreshRanchData();
    } catch (error) {
      console.error('Error saving contact info:', error);
      showToast('Failed to save contact information', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  const getStatusColor = () => {
    switch (licenseInfo.status) {
      case 'valid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'grace_period':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
      case 'no_license':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (licenseInfo.status) {
      case 'valid':
        return `Valid - Expires in ${licenseInfo.daysUntilExpiration} days`;
      case 'grace_period':
        return `Grace Period - ${licenseInfo.daysInGracePeriod} days expired`;
      case 'expired':
        return 'Expired';
      case 'no_license':
        return 'No Active License';
      default:
        return 'Unknown';
    }
  };

  if (!currentRanch) {
    return (
      <Layout currentPage="ranch">
        <div className="text-center py-12">
          <p className="text-gray-600">Please select a ranch first</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="ranch">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ranch Management</h1>
          <p className="text-gray-600 mt-1">Manage infrastructure, license, and get support</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Ranch Infrastructure</h2>
            </div>
            <button
              onClick={handleAddInfrastructure}
              disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </button>
          </div>

          {loadingInfrastructure ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading infrastructure items...</p>
            </div>
          ) : infrastructureItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No infrastructure items yet</p>
              <p className="text-sm text-gray-500 mt-2">Add items like buildings, equipment, etc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {infrastructureItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.description || 'Unnamed Item'}</p>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleEditInfrastructure(item)}
                        disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInfrastructure(item)}
                        disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewPhotos(item.id)}
                    disabled={loadingPhotos}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mb-3 shadow-sm"
                  >
                    <Image className="w-5 h-5 mr-2" />
                    Explore
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCamera(item)}
                      disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                      className="flex-1 inline-flex items-center justify-center px-2 py-1.5 text-gray-700 hover:bg-gray-100 text-xs font-medium rounded border border-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      Take Photo
                    </button>
                    <button
                      onClick={() => setShowImageImport(item)}
                      disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                      className="flex-1 inline-flex items-center justify-center px-2 py-1.5 text-gray-700 hover:bg-gray-100 text-xs font-medium rounded border border-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Upload
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center gap-4">
            <a
              href="/movies"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <Film className="w-6 h-6 mr-3" />
              Movies
            </a>
            <a
              href="/check-fences"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <GitBranch className="w-6 h-6 mr-3" />
              Check Fences
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">License Status</h2>
          </div>

          <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{getStatusText()}</p>
                {licenseInfo.expirationDate && (
                  <p className="text-sm mt-1">
                    Expiration Date: {new Date(licenseInfo.expirationDate).toLocaleDateString()}
                  </p>
                )}
                {licenseInfo.maxAnimals !== null && (
                  <p className="text-sm mt-1">
                    Animal Limit: {licenseInfo.maxAnimals} animals
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleActivateLicense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter License Key
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                  disabled={activating}
                />
                <button
                  type="submit"
                  disabled={activating || !licenseKey.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {activating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    'Activate'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
          </div>

          <form onSubmit={handleSaveContactInfo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                value={contactInfo.name}
                onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingContact}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingContact ? 'Saving...' : 'Save Contact Info'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Messages</h2>
          <p className="text-sm text-gray-600 mb-4">
            Last 3 messages with AmadorHerdInfo Support
          </p>

          <MessageList
            key={refreshMessages}
            ranchId={currentRanch.id}
            limit={3}
          />

          <div className="mt-6 pt-6 border-t border-gray-200">
            <SendMessage
              ranchId={currentRanch.id}
              onMessageSent={() => setRefreshMessages(prev => prev + 1)}
            />
          </div>
        </div>
      </div>

      {showTermsReminder && (
        <TermsModal
          onAccept={() => setShowTermsReminder(false)}
          canClose={true}
        />
      )}

      {showInfrastructureModal && (
        <InfrastructureItemModal
          item={selectedInfrastructure ? { id: selectedInfrastructure.id, description: selectedInfrastructure.description || '' } : null}
          onClose={() => {
            setShowInfrastructureModal(false);
            setSelectedInfrastructure(null);
          }}
          onSave={handleSaveInfrastructure}
        />
      )}

      {showCamera && (
        <CameraCapture
          animalId={showCamera.id}
          onClose={() => setShowCamera(null)}
          onPhotoSaved={async () => {
            const animalId = showCamera.id;
            setShowCamera(null);
            showToast('Photo saved successfully', 'success');
            if (showPhotoGallery === animalId) {
              await handleViewPhotos(animalId);
            }
          }}
        />
      )}

      {showImageImport && (
        <DirectPhotoUploadModal
          animalId={showImageImport.id}
          animalName={showImageImport.description || showImageImport.tag_number || 'Infrastructure Item'}
          onClose={() => setShowImageImport(null)}
          onComplete={async () => {
            const animalId = showImageImport.id;
            setShowImageImport(null);
            showToast('Images uploaded successfully', 'success');
            if (showPhotoGallery === animalId) {
              await handleViewPhotos(animalId);
            }
          }}
        />
      )}

      {showPhotoGallery && (
        <PhotoGallery
          photos={photos}
          onClose={() => {
            setShowPhotoGallery(null);
            setPhotos([]);
          }}
          onDelete={handleDeletePhoto}
          isReadOnly={isReadOnly}
          isDemoMode={isDemoMode}
        />
      )}
    </Layout>
  );
}
