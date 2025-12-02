import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PrintableReport, ReportSection, ReportTable, ReportGrid } from '../components/PrintableReport';
import { useRanch } from '../contexts/RanchContext';
import { supabase } from '../lib/supabase';
import { Printer, FileDown, Calendar, BarChart3 } from 'lucide-react';
import {
  generateCountsReport,
  generateCalvesByMotherReport,
  exportToCSV,
  formatAnimalForExport,
  formatAnimalWithMedicalForExport,
  type CountsReport,
} from '../utils/reportGenerators';
import { printReport, formatDateForDisplay, calculateAge } from '../utils/printHelpers';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];
type MedicalHistory = Database['public']['Tables']['medical_history']['Row'];
type RanchSettings = Database['public']['Tables']['ranch_settings']['Row'];

type ReportType = 'counts' | 'inventory' | 'calves' | 'sales' | null;

export function ReportsPage() {
  const { currentRanch } = useRanch();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalHistory[]>([]);
  const [settings, setSettings] = useState<RanchSettings | null>(null);
  const [counts, setCounts] = useState<CountsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentReport, setCurrentReport] = useState<ReportType>(null);
  const [salesDate, setSalesDate] = useState<string>('');

  useEffect(() => {
    if (currentRanch) {
      fetchData();
    }
  }, [currentRanch]);

  const fetchData = async () => {
    if (!currentRanch) return;

    setLoading(true);
    try {
      const [animalsRes, medicalRes, settingsRes] = await Promise.all([
        supabase
          .from('animals')
          .select('*')
          .eq('ranch_id', currentRanch.id)
          .eq('is_active', true),
        supabase
          .from('medical_history')
          .select('*')
          .eq('ranch_id', currentRanch.id),
        supabase
          .from('ranch_settings')
          .select('*')
          .eq('ranch_id', currentRanch.id)
          .maybeSingle(),
      ]);

      if (animalsRes.error) throw animalsRes.error;
      if (medicalRes.error) throw medicalRes.error;
      if (settingsRes.error) throw settingsRes.error;

      const fetchedAnimals = animalsRes.data || [];
      const fetchedSettings = settingsRes.data || {
        ranch_id: currentRanch.id,
        report_line1: '',
        report_line2: '',
        adult_age_years: '1.1',
        time_zone: 'America/Denver',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAnimals(fetchedAnimals);
      setMedicalRecords(medicalRes.data || []);
      setSettings(fetchedSettings as RanchSettings);
      setCounts(generateCountsReport(fetchedAnimals, fetchedSettings as RanchSettings));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCountSnapshot = async () => {
    if (!currentRanch || !counts) return;

    try {
      const { error } = await supabase
        .from('count_report_snapshots')
        .insert({
          ranch_id: currentRanch.id,
          data: counts,
        });

      if (error) throw error;
      alert('Count snapshot saved successfully');
    } catch (error: any) {
      console.error('Error saving snapshot:', error);
      alert(`Failed to save snapshot: ${error?.message || 'Unknown error'}`);
    }
  };

  const handlePrint = () => {
    printReport('printable-report');
  };

  const exportCountsCSV = () => {
    if (!counts) return;
    const reportData = [
      { Category: 'TOTAL PRESENT', Count: counts.totalPresent },
      { Category: 'TOTAL SOLD', Count: counts.totalSold },
      { Category: 'TOTAL DEAD', Count: counts.totalDead },
      { Category: '', Count: '' },
      { Category: 'Present Bulls', Count: counts.presentBulls },
      { Category: 'Present Cows', Count: counts.presentCows },
      { Category: 'Present Steers', Count: counts.presentSteers },
      { Category: 'Present Heifers', Count: counts.presentHeifers },
      { Category: '', Count: '' },
      { Category: 'Present Adults', Count: counts.presentAdults },
      { Category: 'Present Calves', Count: counts.presentCalves },
    ];
    exportToCSV(reportData, ['Category', 'Count'], 'HTBD_Counts.csv');
  };

  const exportInventoryCSV = () => {
    const present = animals.filter(a => a.status === 'PRESENT');
    const data = present.map(formatAnimalForExport);
    exportToCSV(data, Object.keys(data[0] || {}), 'HTBD_Inventory.csv');
  };

  const exportCalvesCSV = () => {
    const report = generateCalvesByMotherReport(animals);
    const data = report.map(r => ({
      'Mother Tag': r.motherTag || '',
      'Mother Name': r.motherName || '',
      'Number of Calves': r.calves.length,
      'Calf Tags': r.calves.map(c => c.tag_number || 'No tag').join(', '),
    }));
    exportToCSV(data, ['Mother Tag', 'Mother Name', 'Number of Calves', 'Calf Tags'], 'HTBD_Calves.csv');
  };

  const exportSalesCSV = () => {
    const sold = animals
      .filter(a => a.status === 'SOLD' && a.exit_date)
      .sort((a, b) => new Date(b.exit_date!).getTime() - new Date(a.exit_date!).getTime());
    const data = sold.map(animal => ({
      'Sale Date': animal.exit_date || '',
      'Tag Number': animal.tag_number || '',
      'Name': animal.name || '',
      'Sex': animal.sex,
      'Birth Date': animal.birth_date || '',
      'Description': animal.description || '',
    }));
    exportToCSV(data, Object.keys(data[0] || {}), 'HTBD_Sales.csv');
  };

  if (loading) {
    return (
      <Layout currentPage="reports">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          <p className="text-gray-600 mt-4">Loading reports...</p>
        </div>
      </Layout>
    );
  }

  if (currentReport && animals.length > 0) {
    const presentAnimals = animals.filter(a => a.status === 'PRESENT');
    const allSoldAnimals = animals.filter(a => a.status === 'SOLD');
    const soldAnimals = salesDate
      ? allSoldAnimals.filter(a => a.exit_date === salesDate)
      : allSoldAnimals;
    const calvesReport = generateCalvesByMotherReport(animals);

    return (
      <Layout currentPage="reports">
        <div className="space-y-6">
          <div className="space-y-4 no-print">
            <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setCurrentReport(null);
                setSalesDate('');
              }}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              ← Back to Reports
            </button>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                onClick={() => {
                  if (currentReport === 'counts') exportCountsCSV();
                  if (currentReport === 'inventory') exportInventoryCSV();
                  if (currentReport === 'calves') exportCalvesCSV();
                  if (currentReport === 'sales') exportSalesCSV();
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
            </div>

            {currentReport === 'sales' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Sale Date (optional)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={salesDate}
                    onChange={(e) => setSalesDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {salesDate && (
                    <button
                      onClick={() => setSalesDate('')}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-sm text-gray-600">
                    {salesDate ? `Showing sales on ${salesDate}` : 'Showing all sold animals'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div id="printable-report" className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <PrintableReport
              title={
                currentReport === 'counts' ? 'Herd Count Report' :
                currentReport === 'inventory' ? 'Current Inventory Report' :
                currentReport === 'calves' ? 'Calves by Mother Report' :
                currentReport === 'sales' ? 'Sales History Report' :
                'Report'
              }
              settings={settings}
            >
              {currentReport === 'counts' && counts && (
                <>
                  <ReportSection title="Summary Totals">
                    <ReportGrid
                      items={[
                        { label: 'Total Present', value: counts.totalPresent },
                        { label: 'Total Sold', value: counts.totalSold },
                        { label: 'Total Dead', value: counts.totalDead },
                      ]}
                    />
                  </ReportSection>

                  <ReportSection title="Present Animals by Type">
                    <ReportGrid
                      items={[
                        { label: 'Bulls', value: counts.presentBulls },
                        { label: 'Cows', value: counts.presentCows },
                        { label: 'Steers', value: counts.presentSteers },
                        { label: 'Heifers', value: counts.presentHeifers },
                      ]}
                    />
                  </ReportSection>

                  <ReportSection title="Age Classification">
                    <ReportGrid
                      items={[
                        { label: 'Adults', value: counts.presentAdults },
                        { label: 'Calves', value: counts.presentCalves },
                      ]}
                    />
                  </ReportSection>
                </>
              )}

              {currentReport === 'inventory' && (
                <ReportSection>
                  {presentAnimals.map(animal => {
                    const animalMedical = medicalRecords.filter(m => m.animal_id === animal.id);
                    return (
                      <div key={animal.id} className="mb-4 border-b border-gray-100 pb-3 last:border-0">
                        <div className="grid grid-cols-6 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Tag:</span> {animal.tag_number || '-'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Name:</span> {animal.name || '-'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Sex:</span> {animal.sex}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Age:</span> {calculateAge(animal.birth_date)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Birth:</span> {formatDateForDisplay(animal.birth_date)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Desc:</span> {animal.description || '-'}
                          </div>
                        </div>
                        {animalMedical.length > 0 && (
                          <div className="ml-6 mt-1 space-y-0.5">
                            {animalMedical
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((m, idx) => (
                                <div key={idx} className="text-xs text-gray-600">
                                  <span className="font-medium">{formatDateForDisplay(m.date)}:</span> {m.description}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ReportSection>
              )}

              {currentReport === 'calves' && (
                <ReportSection>
                  <ReportTable
                    headers={['Mother Tag', 'Mother Name', 'Calves', 'Calf Tags']}
                    rows={calvesReport.map(r => [
                      r.motherTag || '-',
                      r.motherName || '-',
                      r.calves.length,
                      r.calves.map(c => c.tag_number || 'No tag').join(', ') || '-',
                    ])}
                  />
                </ReportSection>
              )}

              {currentReport === 'sales' && (
                <>
                  {soldAnimals.length === 0 ? (
                    <ReportSection>
                      <div className="text-center py-8 text-gray-600">
                        {salesDate ? `No animals sold on ${salesDate}` : 'No sold animals found'}
                      </div>
                    </ReportSection>
                  ) : (
                    soldAnimals
                      .sort((a, b) => new Date(b.exit_date || '').getTime() - new Date(a.exit_date || '').getTime())
                      .map(animal => {
                        const animalMedical = medicalRecords.filter(m => m.animal_id === animal.id);
                        return (
                          <div key={animal.id} className="mb-8 border-b border-gray-200 pb-6 last:border-0">
                            <ReportSection title={`${animal.tag_number ? `Tag #${animal.tag_number}` : ''} ${animal.name || 'Unnamed'}`}>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <span className="font-medium">Sale Date:</span> {formatDateForDisplay(animal.exit_date)}
                                </div>
                                <div>
                                  <span className="font-medium">Sex:</span> {animal.sex}
                                </div>
                                <div>
                                  <span className="font-medium">Birth Date:</span> {formatDateForDisplay(animal.birth_date)}
                                </div>
                                <div>
                                  <span className="font-medium">Age at Sale:</span> {calculateAge(animal.birth_date)}
                                </div>
                                {animal.description && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Description:</span> {animal.description}
                                  </div>
                                )}
                              </div>
                              {animalMedical.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-gray-900 mb-2">Medical History:</h4>
                                  <ReportTable
                                    headers={['Date', 'Treatment']}
                                    rows={animalMedical
                                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                      .map(m => [
                                        formatDateForDisplay(m.date),
                                        m.description,
                                      ])}
                                  />
                                </div>
                              )}
                            </ReportSection>
                          </div>
                        );
                      })
                  )}
                </>
              )}
            </PrintableReport>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="reports">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">View, print, and export herd reports</p>
        </div>

        {counts && animals.length > 0 && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Quick Stats</h2>
                    <p className="text-sm text-gray-600">Current herd overview</p>
                  </div>
                </div>
                <button
                  onClick={saveCountSnapshot}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Save Snapshot
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-800">Present</div>
                  <div className="text-3xl font-bold text-green-600 mt-1">{counts.totalPresent}</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Sold</div>
                  <div className="text-3xl font-bold text-blue-600 mt-1">{counts.totalSold}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-800">Dead</div>
                  <div className="text-3xl font-bold text-gray-600 mt-1">{counts.totalDead}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Bulls</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{counts.presentBulls}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Cows</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{counts.presentCows}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Steers</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{counts.presentSteers}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Heifers</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{counts.presentHeifers}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Calves</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{counts.presentCalves}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setCurrentReport('counts')}
                  className="text-left border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:bg-green-50 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-green-700">
                        Herd Count Report
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Summary statistics with counts by sex, age, and status
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
                  </div>
                </button>

                <button
                  onClick={() => setCurrentReport('inventory')}
                  className="text-left border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:bg-green-50 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-green-700">
                        Current Inventory
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Complete list of all animals currently on the ranch
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
                  </div>
                </button>

                <button
                  onClick={() => setCurrentReport('calves')}
                  className="text-left border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:bg-green-50 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-green-700">
                        Calves by Mother
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Shows which cows produced calves and offspring details
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
                  </div>
                </button>

                <button
                  onClick={() => setCurrentReport('sales')}
                  className="text-left border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:bg-green-50 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-green-700">
                        Sales History
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Chronological record of all sold animals
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {animals.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No animals to report on yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Add animals to your ranch to see detailed reports
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
