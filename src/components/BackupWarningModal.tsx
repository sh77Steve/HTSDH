import { X, AlertTriangle } from 'lucide-react';

interface BackupWarningModalProps {
  lastBackupDate: string | null;
  daysSinceBackup: number | null;
  onClose: () => void;
}

export function BackupWarningModal({ lastBackupDate, daysSinceBackup, onClose }: BackupWarningModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            <h2 className="text-2xl font-bold text-gray-900">Backup Reminder</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            Last Backup Date: {lastBackupDate ? `${formatDate(lastBackupDate)} (${daysSinceBackup} days ago)` : 'Never'}
          </p>
        </div>

        <div className="space-y-4 text-gray-700">
          <p className="text-base leading-relaxed">
            Please use <strong>Settings &gt; Export Complete Backup</strong> to backup your data.
            This is your ultimate protection against data loss and it just takes a few minutes.
          </p>

          <p className="text-base leading-relaxed">
            This feature will create a compressed file (.zip) and allow you to download it.
            This zip file will contain your animal data, drug table, and photos.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Important Tips:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Run the backup from a device that has enough storage to hold the zip file</li>
              <li>Keep these zip files (especially the latest one) safe on a device that is routinely backed up</li>
              <li>Consider backing up to cloud storage (Dropbox, Google Drive, iCloud, etc.)</li>
              <li>Regular backups ensure you never lose your valuable herd data</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
