import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRanch } from '../contexts/RanchContext';
import { useAuth } from '../contexts/AuthContext';
import {
  parseRanchRAnimalCSV,
  parseRanchRCalfCSV,
  parseRanchRMedicalCSV,
  convertRanchRAnimal,
  convertRanchRMedical,
  type ImportResult,
} from '../utils/csvImport';

interface ImportModalProps {
  onClose: () => void;
  onComplete: () => void;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (error.message?.includes('Failed to fetch') && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export function ImportModal({ onClose, onComplete }: ImportModalProps) {
  const { currentRanch } = useRanch();
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'full' | 'treatments'>('full');
  const [cattleFile, setCattleFile] = useState<File | null>(null);
  const [calvesFile, setCalvesFile] = useState<File | null>(null);
  const [cattleTreatmentsFile, setCattleTreatmentsFile] = useState<File | null>(null);
  const [calfTreatmentsFile, setCalfTreatmentsFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ animals?: ImportResult; medical?: ImportResult } | null>(null);
  const cattleInputRef = useRef<HTMLInputElement>(null);
  const calvesInputRef = useRef<HTMLInputElement>(null);
  const cattleTreatmentsInputRef = useRef<HTMLInputElement>(null);
  const calfTreatmentsInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (importMode === 'full' && !cattleFile && !calvesFile) return;
    if (importMode === 'treatments' && !cattleTreatmentsFile && !calfTreatmentsFile) return;
    if (!currentRanch) return;

    setImporting(true);
    setResult(null);

    try {
      const primaryIdToIdMap = new Map<string, string>();
      let animalsResult: ImportResult | undefined;

      if (importMode === 'full') {
        animalsResult = {
          success: true,
          imported: 0,
          skipped: 0,
          errors: [],
        };

        // Load existing animals to avoid duplicates
        const { data: existingAnimals } = await supabase
          .from('animals')
          .select('id, legacy_uid')
          .eq('ranch_id', currentRanch.id);

        if (existingAnimals) {
          for (const animal of existingAnimals) {
            if (animal.legacy_uid) {
              primaryIdToIdMap.set(animal.legacy_uid, animal.id);
            }
          }
        }

        // Import cattle first
        if (cattleFile) {
          const cattleText = await cattleFile.text();
          const cattleRows = parseRanchRAnimalCSV(cattleText);

          for (const row of cattleRows) {
            try {
              // Skip if already exists
              if (row.primaryId && primaryIdToIdMap.has(row.primaryId)) {
                animalsResult.skipped++;
                continue;
              }

              const animalData = convertRanchRAnimal(row, currentRanch.id, primaryIdToIdMap);

              const { data, error } = await retryWithBackoff(async () => {
                const result = await supabase
                  .from('animals')
                  .insert(animalData as any)
                  .select('id, legacy_uid')
                  .single();

                if (result.error) {
                  throw result.error;
                }

                return result;
              });

              if (error) {
                console.error('Supabase error for cattle:', row.primaryId, error);
                throw new Error(`${error.message}${error.details ? ` (${error.details})` : ''}`);
              }

              if (data && row.primaryId) {
                primaryIdToIdMap.set(row.primaryId, data.id);
              }

              animalsResult.imported++;
            } catch (error: any) {
              console.error('Import error for cattle row:', row, error);
              const errorMsg = error.message || 'Unknown error';
              animalsResult.errors.push(`Row ${row.primaryId || 'unknown'}: ${errorMsg}`);
              animalsResult.skipped++;
            }
          }
        }

        // Import calves second (after cattle so mothers/fathers exist)
        if (calvesFile) {
          const calvesText = await calvesFile.text();
          const calfRows = parseRanchRCalfCSV(calvesText);

          for (const row of calfRows) {
            try {
              // Skip if already exists
              if (row.primaryId && primaryIdToIdMap.has(row.primaryId)) {
                animalsResult.skipped++;
                continue;
              }

              const animalData = convertRanchRAnimal(row, currentRanch.id, primaryIdToIdMap);

              const { data, error } = await retryWithBackoff(async () => {
                const result = await supabase
                  .from('animals')
                  .insert(animalData as any)
                  .select('id, legacy_uid')
                  .single();

                if (result.error) {
                  throw result.error;
                }

                return result;
              });

              if (error) {
                console.error('Supabase error for calf:', row.primaryId, error);
                throw new Error(`${error.message}${error.details ? ` (${error.details})` : ''}`);
              }

              if (data && row.primaryId) {
                primaryIdToIdMap.set(row.primaryId, data.id);
              }

              animalsResult.imported++;
            } catch (error: any) {
              console.error('Import error for calf row:', row, error);
              const errorMsg = error.message || 'Unknown error';
              animalsResult.errors.push(`Row ${row.primaryId || 'unknown'}: ${errorMsg}`);
              animalsResult.skipped++;
            }
          }
        }

        animalsResult.success = animalsResult.errors.length === 0;
      }

      if (importMode === 'treatments') {
        const { data: existingAnimals, error: fetchError } = await supabase
          .from('animals')
          .select('id, legacy_uid')
          .eq('ranch_id', currentRanch.id);

        if (fetchError) throw fetchError;

        if (existingAnimals) {
          for (const animal of existingAnimals) {
            if (animal.legacy_uid) {
              primaryIdToIdMap.set(animal.legacy_uid, animal.id);
            }
          }
        }
      }

      let medicalResult: ImportResult | undefined;
      const medicalFiles = [cattleTreatmentsFile, calfTreatmentsFile].filter(f => f !== null) as File[];

      if (medicalFiles.length > 0) {
        medicalResult = {
          success: true,
          imported: 0,
          skipped: 0,
          errors: [],
        };

        // Load existing medical history to avoid duplicates
        const existingMedicalMap = new Map<string, boolean>();
        const { data: existingMedical } = await supabase
          .from('medical_history')
          .select('animal_id, date, description')
          .eq('ranch_id', currentRanch.id);

        if (existingMedical) {
          for (const record of existingMedical) {
            const key = `${record.animal_id}|${record.date}|${record.description}`;
            existingMedicalMap.set(key, true);
          }
        }

        for (const medicalFile of medicalFiles) {
          const medicalText = await medicalFile.text();
          const medicalRows = parseRanchRMedicalCSV(medicalText);

          for (const row of medicalRows) {
            try {
              const medicalData = convertRanchRMedical(row, currentRanch.id, primaryIdToIdMap, user?.id || null);

              if (!medicalData) {
                medicalResult.skipped++;
                continue;
              }

              // Check if this exact treatment already exists
              const key = `${medicalData.animal_id}|${medicalData.date}|${medicalData.description}`;
              if (existingMedicalMap.has(key)) {
                medicalResult.skipped++;
                continue;
              }

              const { error } = await retryWithBackoff(async () => {
                const result = await supabase.from('medical_history').insert(medicalData as any);

                if (result.error) {
                  throw result.error;
                }

                return result;
              });

              if (error) throw error;

              existingMedicalMap.set(key, true);
              medicalResult.imported++;
            } catch (error: any) {
              medicalResult.errors.push(`Row ${row.cattle || 'unknown'}: ${error.message}`);
              medicalResult.skipped++;
            }
          }
        }

        medicalResult.success = medicalResult.errors.length === 0;
      }

      setResult({ animals: animalsResult, medical: medicalResult });
    } catch (error: any) {
      setResult({
        animals: {
          success: false,
          imported: 0,
          skipped: 0,
          errors: [error.message || 'Unknown error'],
        },
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import RanchR Data</h2>
              <p className="text-sm text-gray-600 mt-1">
                {importMode === 'full' ? 'Import animals and medical history' : 'Import additional treatments only'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            disabled={importing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!result && (
            <div className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="importMode"
                      value="full"
                      checked={importMode === 'full'}
                      onChange={(e) => setImportMode(e.target.value as 'full')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900">Full Import (Cattle + Treatments)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="importMode"
                      value="treatments"
                      checked={importMode === 'treatments'}
                      onChange={(e) => setImportMode(e.target.value as 'treatments')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900">Treatments Only</span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">RanchR CSV Export Format:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {importMode === 'full' ? (
                        <>
                          <li>
                            <strong>Cattle CSV</strong>: ranchr_reports_csv_cattle.csv (adult cattle)
                          </li>
                          <li>
                            <strong>Calves CSV</strong>: ranchr_reports_csv_calves.csv (calves)
                          </li>
                          <li>
                            <strong>Cattle Treatments</strong>: ranchr_reports_csv_treatments.csv (optional)
                          </li>
                          <li>
                            <strong>Calf Treatments</strong>: ranchr_reports_csv_calf_treatments.csv (optional)
                          </li>
                          <li>Import cattle first, then calves, then treatments</li>
                        </>
                      ) : (
                        <>
                          <li>
                            <strong>Treatment CSVs</strong>: Up to 2 treatment files from RanchR
                          </li>
                          <li>Treatments will be linked to existing animals by Primary ID</li>
                          <li>Use this to import additional treatment files without creating duplicate animals</li>
                        </>
                      )}
                      <li>Files must contain header rows as exported from RanchR</li>
                    </ul>
                  </div>
                </div>
              </div>

              {importMode === 'full' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cattle CSV File
                    </label>
                    <input
                      ref={cattleInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCattleFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      onClick={() => cattleInputRef.current?.click()}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          {cattleFile ? (
                            <span className="text-sm font-medium text-gray-900">{cattleFile.name}</span>
                          ) : (
                            <span className="text-sm text-gray-600">ranchr_reports_csv_cattle.csv (adult cattle)</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calves CSV File
                    </label>
                    <input
                      ref={calvesInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCalvesFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      onClick={() => calvesInputRef.current?.click()}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          {calvesFile ? (
                            <span className="text-sm font-medium text-gray-900">{calvesFile.name}</span>
                          ) : (
                            <span className="text-sm text-gray-600">ranchr_reports_csv_calves.csv (calves)</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cattle Treatments CSV {importMode === 'treatments' && <span className="text-red-500">*</span>}
                </label>
                <input
                  ref={cattleTreatmentsInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCattleTreatmentsFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => cattleTreatmentsInputRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      {cattleTreatmentsFile ? (
                        <span className="text-sm font-medium text-gray-900">{cattleTreatmentsFile.name}</span>
                      ) : (
                        <span className="text-sm text-gray-600">ranchr_reports_csv_treatments.csv (optional)</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Calf Treatments CSV (optional)
                </label>
                <input
                  ref={calfTreatmentsInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCalfTreatmentsFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => calfTreatmentsInputRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      {calfTreatmentsFile ? (
                        <span className="text-sm font-medium text-gray-900">{calfTreatmentsFile.name}</span>
                      ) : (
                        <span className="text-sm text-gray-600">ranchr_reports_csv_calf_treatments.csv (optional)</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={
                    (importMode === 'full' && !cattleFile && !calvesFile) ||
                    (importMode === 'treatments' && !cattleTreatmentsFile && !calfTreatmentsFile) ||
                    importing
                  }
                  className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.animals && (
                <div
                  className={`rounded-lg p-4 ${
                    result.animals.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">Animals Import</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Imported:</span> {result.animals.imported}
                    </p>
                    <p>
                      <span className="font-medium">Skipped:</span> {result.animals.skipped}
                    </p>
                    {result.animals.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-red-700">Errors ({result.animals.errors.length}):</p>
                        <div className="mt-1 max-h-48 overflow-y-auto">
                          <ul className="list-disc list-inside text-red-700 space-y-0.5">
                            {result.animals.errors.map((error, i) => (
                              <li key={i} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.medical && (
                <div
                  className={`rounded-lg p-4 ${
                    result.medical.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">Medical History Import</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Imported:</span> {result.medical.imported}
                    </p>
                    <p>
                      <span className="font-medium">Skipped:</span> {result.medical.skipped}
                    </p>
                    {result.medical.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-red-700">Errors ({result.medical.errors.length}):</p>
                        <div className="mt-1 max-h-48 overflow-y-auto">
                          <ul className="list-disc list-inside text-red-700 space-y-0.5">
                            {result.medical.errors.map((error, i) => (
                              <li key={i} className="text-xs">{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    onComplete();
                    onClose();
                  }}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
