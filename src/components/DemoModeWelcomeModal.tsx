import { X } from 'lucide-react';

interface DemoModeWelcomeModalProps {
  onClose: () => void;
}

export function DemoModeWelcomeModal({ onClose }: DemoModeWelcomeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Welcome to Demonstration Mode</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-gray-700">
          <p className="text-lg">
            Thank you for trying AmadorHerdInfo Demonstration Mode. Please feel free to explore the App,
            but if you add or edit animals, your changes will not be saved.
          </p>

          <p className="text-lg">
            Please be sure to try <span className="font-semibold">Tips & Tricks</span> on the Settings page.
            It contains a pretty comprehensive description of this Web App.
          </p>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
