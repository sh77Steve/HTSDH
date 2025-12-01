import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRanch } from '../contexts/RanchContext';
import { useAuth } from '../contexts/AuthContext';
import {
  parseV1AnimalCSVByPosition,
  parseV1MedicalCSVByPosition,
  convertV1Animal,
  convertV1Medical,
  type ImportResult,
} from '../utils/csvImport';

interface ImportModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function ImportModal({ onClose, onComplete }: ImportModalProps) {
  const { currentRanch } = useRanch();
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [animalFile, setAnimalFile] = useState<File | null>(null);
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ animals?: ImportResult; medical?: ImportResult } | null>(null);
  const animalInputRef = useRef<HTMLInputElement>(null);
  const medicalInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!animalFile || !currentRanch) return;

    setImporting(true);
    setResult(null);

    try {
      const animalText = await animalFile.text();
      console.log('CSV text:', animalText.substring(0, 500));
      const animalRows = parseV1AnimalCSVByPosition(animalText);
      console.log('Parsed rows:', animalRows.length, 'First row:', animalRows[0]);

      const animalsResult: ImportResult = {
        success: true,
        imported: 0,
        skipped: 0,
        errors: [],
      };

      const uidToIdMap = new Map<string, string>();

      for (const row of animalRows) {
        try {
          const animalData = convertV1Animal(row, currentRanch.id, uidToIdMap);

          const { data, error } = await supabase
            .from('animals')
            .insert(animalData as any)
            .select('id, legacy_uid')
            .single();

          if (error) throw error;

          if (data && row.uid) {
            uidToIdMap.set(row.uid, data.id);
          }

          animalsResult.imported++;
        } catch (error: any) {
          console.error('Import error for row:', row, error);
          animalsResult.errors.push(`Row ${row.uid || 'unknown'}: ${error.message}`);
          animalsResult.skipped++;
        }
      }

      animalsResult.success = animalsResult.errors.length === 0;

      let medicalResult: ImportResult | undefined;

      if (medicalFile) {
        medicalResult = {
          success: true,
          imported: 0,
          skipped: 0,
          errors: [],
        };

        const medicalText = await medicalFile.text();
        const medicalRows = parseV1MedicalCSVByPosition(medicalText);

        for (const row of medicalRows) {
          try {
            const medicalData = convertV1Medical(row, currentRanch.id, uidToIdMap, user?.id || null);

            if (!medicalData) {
              medicalResult.skipped++;
              continue;
            }

            const { error } = await supabase.from('medical_history').insert(medicalData as any);

            if (error) throw error;

            medicalResult.imported++;
          } catch (error: any) {
            medicalResult.errors.push(`Row ${row.animalUID || 'unknown'}: ${error.message}`);
            medicalResult.skipped++;
          }
        }

        medicalResult.success = medicalResult.errors.length === 0;
      }

      setResult({ animals: animalsResult, medical: medicalResult });

      if (animalsResult.imported > 0) {
        setTimeout(() => {
          onComplete();
        }, 3000);
      }
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
              <h2 className="text-2xl font-bold text-gray-900">Import CSV Data</h2>
              <p className="text-sm text-gray-600 mt-1">Import animals and medical history from V1 CSV files</p>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">CSV Format (NO HEADERS):</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        <strong>cows.csv</strong>: UID, Source, Status, TagNumber, TagColor, Name, Sex,
                        BirthDate, WeaningDate, ExitDate, MotherUID, FatherUID, Description, Notes (14 fields)
                      </li>
                      <li>
                        <strong>medhist.csv</strong>: AnimalUID, Date, Description (3 fields)
                      </li>
                      <li>Files must NOT contain header rows - data only</li>
                      <li>Import will link mother/father relationships and medical records via UID</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animals CSV File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={animalInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setAnimalFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => animalInputRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      {animalFile ? (
                        <span className="text-sm font-medium text-gray-900">{animalFile.name}</span>
                      ) : (
                        <span className="text-sm text-gray-600">Click to select cows.csv</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History CSV File (optional)
                </label>
                <input
                  ref={medicalInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setMedicalFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => medicalInputRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      {medicalFile ? (
                        <span className="text-sm font-medium text-gray-900">{medicalFile.name}</span>
                      ) : (
                        <span className="text-sm text-gray-600">Click to select medhist.csv</span>
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
                  disabled={!animalFile || importing}
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
                        <p className="font-medium text-red-700">Errors:</p>
                        <ul className="list-disc list-inside mt-1 text-red-700">
                          {result.animals.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {result.animals.errors.length > 5 && (
                            <li>...and {result.animals.errors.length - 5} more</li>
                          )}
                        </ul>
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
                        <p className="font-medium text-red-700">Errors:</p>
                        <ul className="list-disc list-inside mt-1 text-red-700">
                          {result.medical.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {result.medical.errors.length > 5 && (
                            <li>...and {result.medical.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={onClose}
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
