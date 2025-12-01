import { useState } from 'react';
import { Layout } from '../components/Layout';
import { AnimalDetailModal } from '../components/AnimalDetailModal';
import { useRanch } from '../contexts/RanchContext';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];

type SearchType = 'all' | 'tag' | 'name' | 'description';
type StatusFilter = 'ALL' | 'PRESENT' | 'SOLD' | 'DEAD';

export function SearchPage() {
  const { currentRanch } = useRanch();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [results, setResults] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentRanch) return;

    setLoading(true);
    setSearched(true);

    try {
      let query = supabase
        .from('animals')
        .select('*')
        .eq('ranch_id', currentRanch.id)
        .eq('is_active', true);

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();

        switch (searchType) {
          case 'tag':
            query = query.eq('tag_number', searchTerm);
            break;
          case 'name':
            query = query.ilike('name', searchTerm);
            break;
          case 'description':
            query = query.ilike('description', `%${searchLower}%`);
            break;
          case 'all':
          default:
            query = query.or(
              `tag_number.ilike.%${searchLower}%,name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`
            );
            break;
        }
      }

      query = query.order('tag_number', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching animals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowAll = () => {
    setSearchTerm('');
    setSearchType('all');
    handleSearch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'SOLD':
        return 'bg-blue-100 text-blue-800';
      case 'DEAD':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const today = new Date();
    const ageInYears = (today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12);
      return `${months}mo`;
    }
    return `${Math.floor(ageInYears)}yr`;
  };

  return (
    <Layout currentPage="search">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Search Animals</h1>
          <p className="text-gray-600 mt-1">Find animals by tag, name, or description</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as SearchType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Fields</option>
                  <option value="tag">Tag Number (Exact)</option>
                  <option value="name">Name (Exact)</option>
                  <option value="description">Description (Contains)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animals to Include
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present Only</option>
                  <option value="SOLD">Sold Only</option>
                  <option value="DEAD">Dead Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Term
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter search term..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-5 h-5 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </button>

              <button
                type="button"
                onClick={handleShowAll}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition disabled:opacity-50"
              >
                Show All
              </button>
            </div>
          </form>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Searching...</p>
          </div>
        )}

        {!loading && searched && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No animals found</p>
                <p className="text-sm text-gray-500 mt-2">
                  {searchTerm ? `Try a different search term or adjust your filters` : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Found {results.length} result{results.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tag
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sex
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((animal) => (
                        <tr
                          key={animal.id}
                          className="hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => setSelectedAnimal(animal)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {animal.tag_number || '-'}
                            </div>
                            {animal.tag_color && (
                              <div className="text-xs text-gray-500">{animal.tag_color}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{animal.name || '-'}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{animal.sex}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                animal.status
                              )}`}
                            >
                              {animal.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getAge(animal.birth_date)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate">
                              {animal.description || '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedAnimal && (
          <AnimalDetailModal
            animal={selectedAnimal}
            onClose={() => setSelectedAnimal(null)}
            onUpdate={() => {
              handleSearch();
              setSelectedAnimal(null);
            }}
            onDelete={() => {
              handleSearch();
            }}
            allAnimals={results}
          />
        )}
      </div>
    </Layout>
  );
}
