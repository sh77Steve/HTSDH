import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useRanch } from '../contexts/RanchContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Film, Plus, Search, FileText, Upload, Edit, Trash2, X } from 'lucide-react';

interface Movie {
  id: string;
  ranch_id: string;
  movie_name: string;
  rating: string | null;
  genre: string | null;
  actor: string | null;
  notes: string | null;
  folder: string | null;
  created_at: string;
}

type ViewMode = 'list' | 'search' | 'report';

const GENRE_MAP: Record<string, string> = {
  'W': 'Western',
  'C': 'Comedy',
  'A': 'Action/Suspense',
  'S': 'Science Fiction',
  'D': 'Drama',
  'O': 'Other',
};

export function MoviesPage() {
  const { currentRanch, licenseInfo, isDemoMode, currentUserRole } = useRanch();
  const { showToast } = useToast();
  const isReadOnly = currentUserRole === 'VIEWER' && !isDemoMode;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  const [formData, setFormData] = useState({
    movie_name: '',
    rating: '',
    genre: '',
    actor: '',
    notes: '',
    folder: '',
  });

  useEffect(() => {
    if (currentRanch) {
      fetchMovies();
    }
  }, [currentRanch]);

  const fetchMovies = async () => {
    if (!currentRanch) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .order('movie_name', { ascending: true });

      if (error) throw error;
      setMovies(data || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
      showToast('Failed to load movies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovie = () => {
    setEditingMovie(null);
    setFormData({
      movie_name: '',
      rating: '',
      genre: '',
      actor: '',
      notes: '',
      folder: '',
    });
    setShowEditModal(true);
  };

  const handleEditMovie = (movie: Movie) => {
    setEditingMovie(movie);
    setFormData({
      movie_name: movie.movie_name,
      rating: movie.rating || '',
      genre: movie.genre || '',
      actor: movie.actor || '',
      notes: movie.notes || '',
      folder: movie.folder || '',
    });
    setShowEditModal(true);
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRanch) return;

    if (!formData.movie_name.trim()) {
      showToast('Movie name is required', 'error');
      return;
    }

    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      setShowEditModal(false);
      return;
    }

    try {
      if (editingMovie) {
        const { error } = await supabase
          .from('movies')
          .update({
            movie_name: formData.movie_name.trim(),
            rating: formData.rating.trim() || null,
            genre: formData.genre.trim() || null,
            actor: formData.actor.trim() || null,
            notes: formData.notes.trim() || null,
            folder: formData.folder.trim() || null,
          })
          .eq('id', editingMovie.id);

        if (error) throw error;
        showToast('Movie updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('movies')
          .insert({
            ranch_id: currentRanch.id,
            movie_name: formData.movie_name.trim(),
            rating: formData.rating.trim() || null,
            genre: formData.genre.trim() || null,
            actor: formData.actor.trim() || null,
            notes: formData.notes.trim() || null,
            folder: formData.folder.trim() || null,
          });

        if (error) throw error;
        showToast('Movie added successfully', 'success');
      }

      setShowEditModal(false);
      await fetchMovies();
    } catch (error) {
      console.error('Error saving movie:', error);
      showToast('Failed to save movie', 'error');
    }
  };

  const handleDeleteMovie = async (movie: Movie) => {
    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${movie.movie_name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', movie.id);

      if (error) throw error;

      showToast('Movie deleted successfully', 'success');
      await fetchMovies();
    } catch (error) {
      console.error('Error deleting movie:', error);
      showToast('Failed to delete movie', 'error');
    }
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRanch) return;

    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      showToast('Please select a CSV file', 'error');
      return;
    }

    if (isDemoMode) {
      showToast('Demonstration Mode - Changes not saved.', 'info');
      setShowImportModal(false);
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      const moviesToInsert = lines.map(line => {
        const parts = line.split(',');
        return {
          ranch_id: currentRanch.id,
          movie_name: parts[0]?.trim() || '',
          rating: parts[1]?.trim() || null,
          genre: parts[2]?.trim() || null,
          actor: parts[3]?.trim() || null,
          notes: parts[4]?.trim() || null,
          folder: parts[5]?.trim() || null,
        };
      }).filter(movie => movie.movie_name);

      if (moviesToInsert.length === 0) {
        showToast('No valid movies found in CSV file', 'error');
        return;
      }

      const { error } = await supabase
        .from('movies')
        .insert(moviesToInsert);

      if (error) throw error;

      showToast(`${moviesToInsert.length} movies imported successfully`, 'success');
      setShowImportModal(false);
      await fetchMovies();
    } catch (error) {
      console.error('Error importing CSV:', error);
      showToast('Failed to import movies', 'error');
    }
  };

  const getFilteredMovies = () => {
    let filtered = movies;

    if (viewMode === 'search' && searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = movies.filter(movie => {
        return (
          movie.movie_name.toLowerCase().includes(query) ||
          movie.rating?.toLowerCase().includes(query) ||
          movie.genre?.toLowerCase().includes(query) ||
          movie.actor?.toLowerCase().includes(query) ||
          movie.notes?.toLowerCase().includes(query) ||
          movie.folder?.toLowerCase().includes(query)
        );
      });
    }

    if (viewMode === 'report' && selectedGenre) {
      filtered = filtered.filter(movie => movie.genre === selectedGenre);
    }

    return filtered;
  };

  const filteredMovies = getFilteredMovies();

  if (!currentRanch) {
    return (
      <Layout currentPage="animals">
        <div className="text-center py-12">
          <p className="text-gray-600">Please select a ranch first</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="animals">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Movie Collection</h1>
            <p className="text-gray-600 mt-1">Manage your movie library</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </button>
            <button
              onClick={handleAddMovie}
              disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Film className="w-4 h-4 inline mr-2" />
              All Movies
            </button>
            <button
              onClick={() => setViewMode('search')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                viewMode === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              Search
            </button>
            <button
              onClick={() => setViewMode('report')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                viewMode === 'report'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Report
            </button>
          </div>

          {viewMode === 'search' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Movies
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, actor, genre, rating, notes, or folder..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {viewMode === 'report' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Genres</option>
                {Object.entries(GENRE_MAP).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading movies...</p>
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="text-center py-12">
              <Film className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {viewMode === 'search' && searchQuery
                  ? 'No movies found matching your search'
                  : viewMode === 'report' && selectedGenre
                  ? 'No movies found for this genre'
                  : 'No movies yet'}
              </p>
              {movies.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Add movies manually or import from a CSV file
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Movie Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Rating</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Genre</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actor</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Folder</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovies.map((movie) => (
                    <tr key={movie.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{movie.movie_name}</td>
                      <td className="py-3 px-4 text-gray-700">{movie.rating || '-'}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {movie.genre ? GENRE_MAP[movie.genre] || movie.genre : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{movie.actor || '-'}</td>
                      <td className="py-3 px-4 text-gray-700">{movie.notes || '-'}</td>
                      <td className="py-3 px-4 text-gray-700">{movie.folder || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditMovie(movie)}
                            disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMovie(movie)}
                            disabled={isReadOnly || licenseInfo.mode === 'license_expired'}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMovie ? 'Edit Movie' : 'Add Movie'}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveMovie} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Movie Name *
                </label>
                <input
                  type="text"
                  value={formData.movie_name}
                  onChange={(e) => setFormData({ ...formData, movie_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select rating</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genre
                  </label>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select genre</option>
                    {Object.entries(GENRE_MAP).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actor
                </label>
                <input
                  type="text"
                  value={formData.actor}
                  onChange={(e) => setFormData({ ...formData, actor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Code
                </label>
                <input
                  type="text"
                  value={formData.folder}
                  onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave blank if not in a folder"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  {editingMovie ? 'Update Movie' : 'Add Movie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Import Movies from CSV</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">CSV Format</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Your CSV file should have 6 columns in this order:
                </p>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>Movie Name</li>
                  <li>Rating (A, B, or C)</li>
                  <li>Genre (W=Western, C=Comedy, A=Action/Suspense, S=Science Fiction, D=Drama, O=Other)</li>
                  <li>Actor</li>
                  <li>Notes</li>
                  <li>Folder Code (optional - leave blank if not in a folder)</li>
                </ol>
                <p className="text-sm text-blue-800 mt-2">
                  Example: <code className="bg-blue-100 px-1 rounded">3000 MILES TO GRACELAND,A,A,KURT RUSSELL,KEVIN COSTNER,</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                  Import Movies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
