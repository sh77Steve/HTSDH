import { useRanch } from '../contexts/RanchContext';
import { Home, Mail } from 'lucide-react';

export function RanchSelector() {
  const { userRanches, selectRanch } = useRanch();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-green-600 rounded-full p-3">
            <Home className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Select a Ranch
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Choose which ranch you'd like to manage
        </p>

        <div className="space-y-3 mb-6">
          {userRanches.map((userRanch) => (
            <button
              key={userRanch.ranch_id}
              onClick={() => selectRanch(userRanch.ranch_id)}
              className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition duration-200 text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700">
                    {userRanch.ranch.name}
                  </h3>
                  {userRanch.ranch.location && (
                    <p className="text-sm text-gray-600 mt-1">{userRanch.ranch.location}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Role: {userRanch.role}</p>
                </div>
                <div className="text-green-600 opacity-0 group-hover:opacity-100 transition">
                  →
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Mail className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need a Ranch Invitation?</h3>
          <p className="text-sm text-gray-600">
            To create a new ranch or join an existing one, you'll need an invitation from a system
            administrator or ranch owner. Contact your administrator to get an invitation link.
          </p>
        </div>
      </div>
    </div>
  );
}
