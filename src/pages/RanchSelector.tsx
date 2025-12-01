import { useState } from 'react';
import { useRanch } from '../contexts/RanchContext';
import { Home, Plus } from 'lucide-react';

export function RanchSelector() {
  const { userRanches, selectRanch, createRanch } = useRanch();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRanch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createRanch(name, location || undefined);
      setShowCreateForm(false);
      setName('');
      setLocation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ranch');
    } finally {
      setLoading(false);
    }
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Ranch</h2>

          <form onSubmit={handleCreateRanch} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Ranch Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="My Ranch"
                required
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location (Optional)
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="City, State"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Creating...' : 'Create Ranch'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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

        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-green-500 hover:text-green-600 transition"
        >
          <Plus className="w-5 h-5" />
          Create New Ranch
        </button>
      </div>
    </div>
  );
}
