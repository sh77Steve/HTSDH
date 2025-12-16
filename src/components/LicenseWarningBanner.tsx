import { AlertTriangle, AlertCircle, Lock } from 'lucide-react';
import { useRanch } from '../contexts/RanchContext';
import { useState } from 'react';
import LicenseActivationModal from './LicenseActivationModal';

export default function LicenseWarningBanner() {
  const { licenseInfo } = useRanch();
  const [showActivationModal, setShowActivationModal] = useState(false);

  if (licenseInfo.status === 'valid' && licenseInfo.daysUntilExpiration !== null && licenseInfo.daysUntilExpiration > 14) {
    return null;
  }

  if (licenseInfo.status === 'valid' && licenseInfo.daysUntilExpiration !== null && licenseInfo.daysUntilExpiration <= 14) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">License Expiring Soon:</span> Your license will expire in {licenseInfo.daysUntilExpiration} day{licenseInfo.daysUntilExpiration !== 1 ? 's' : ''}. Please renew to avoid service interruption.
              </p>
            </div>
            <button
              onClick={() => setShowActivationModal(true)}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
            >
              Renew License
            </button>
          </div>
        </div>
        {showActivationModal && (
          <LicenseActivationModal
            onClose={() => setShowActivationModal(false)}
            onActivated={() => setShowActivationModal(false)}
          />
        )}
      </div>
    );
  }

  if (licenseInfo.status === 'grace_period') {
    return (
      <div className="bg-orange-50 border-b border-orange-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-orange-800">
                <span className="font-semibold">License Expired:</span> Your license expired {licenseInfo.daysInGracePeriod} day{licenseInfo.daysInGracePeriod !== 1 ? 's' : ''} ago. You have {30 - (licenseInfo.daysInGracePeriod || 0)} days remaining in your grace period before the application becomes read-only.
              </p>
            </div>
            <button
              onClick={() => setShowActivationModal(true)}
              className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
            >
              Renew Now
            </button>
          </div>
        </div>
        {showActivationModal && (
          <LicenseActivationModal
            onClose={() => setShowActivationModal(false)}
            onActivated={() => setShowActivationModal(false)}
          />
        )}
      </div>
    );
  }

  if (licenseInfo.status === 'expired') {
    return (
      <div className="bg-red-50 border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">License Expired:</span> Your grace period has ended. The application is now in read-only mode. Please activate a new license to continue.
              </p>
            </div>
            <button
              onClick={() => setShowActivationModal(true)}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Activate License
            </button>
          </div>
        </div>
        {showActivationModal && (
          <LicenseActivationModal
            onClose={() => setShowActivationModal(false)}
            onActivated={() => setShowActivationModal(false)}
          />
        )}
      </div>
    );
  }

  if (licenseInfo.status === 'no_license') {
    return (
      <div className="bg-red-50 border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">No Active License:</span> This application requires an active license. Please enter your license key to continue.
              </p>
            </div>
            <button
              onClick={() => setShowActivationModal(true)}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Activate License
            </button>
          </div>
        </div>
        {showActivationModal && (
          <LicenseActivationModal
            onClose={() => setShowActivationModal(false)}
            onActivated={() => setShowActivationModal(false)}
          />
        )}
      </div>
    );
  }

  return null;
}
