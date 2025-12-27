import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRanch } from '../contexts/RanchContext';
import { parseCSV } from '../utils/csvImport';
import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Insert'];

interface GenericCSVImportModalProps {
  onClose: () => void;
  onComplete: () => void;
}

interface FieldMapping {
  csvColumn: string | null;
  required: boolean;
  description: string;
}

interface FieldMappings {
  tag_number: FieldMapping;
  tag_color: FieldMapping;
  name: FieldMapping;
  animal_type: FieldMapping;
  sex: FieldMapping;
  source: FieldMapping;
  status: FieldMapping;
  birth_date: FieldMapping;
  weaning_date: FieldMapping;
  exit_date: FieldMapping;
  description: FieldMapping;
  notes: FieldMapping;
  sale_price: FieldMapping;
}

export function GenericCSVImportModal({ onClose, onComplete }: GenericCSVImportModalProps) {
  const { currentRanch } = useRanch();
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'complete'>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fieldMappings, setFieldMappings] = useState<FieldMappings>({
    tag_number: { csvColumn: null, required: false, description: 'Unique tag number for the animal' },
    tag_color: { csvColumn: null, required: false, description: 'Color of the ear tag (e.g., Yellow, Red, Blue)' },
    name: { csvColumn: null, required: false, description: 'Name or nickname for the animal' },
    animal_type: { csvColumn: null, required: true, description: 'Type of animal: Cattle, Sheep, Goat, Horse, Pig, or Other' },
    sex: { csvColumn: null, required: true, description: 'Sex of the animal (varies by type, e.g., Bull/Heifer/Steer for cattle)' },
    source: { csvColumn: null, required: false, description: 'How acquired: BORN or PURCHASED' },
    status: { csvColumn: null, required: false, description: 'Current status: PRESENT, SOLD, BUTCHERED, or DEAD' },
    birth_date: { csvColumn: null, required: false, description: 'Date of birth (YYYY-MM-DD or MM/DD/YYYY)' },
    weaning_date: { csvColumn: null, required: false, description: 'Date weaned from mother (YYYY-MM-DD or MM/DD/YYYY)' },
    exit_date: { csvColumn: null, required: false, description: 'Date sold, butchered, or died (YYYY-MM-DD or MM/DD/YYYY)' },
    description: { csvColumn: null, required: false, description: 'Brief description or breed information' },
    notes: { csvColumn: null, required: false, description: 'Additional notes about the animal' },
    sale_price: { csvColumn: null, required: false, description: 'Sale price if animal was sold (numbers only)' },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      alert('CSV file must have at least a header row and one data row');
      return;
    }

    const detectedHeaders = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    setHeaders(detectedHeaders);
    setCsvData(dataRows);

    autoMapColumns(detectedHeaders);
    setStep('map');
  };

  const autoMapColumns = (detectedHeaders: string[]) => {
    const mappings: Partial<FieldMappings> = {};

    const commonMappings: Record<string, string[]> = {
      tag_number: ['tag', 'tag number', 'tag_number', 'id', 'ear tag', 'eartag', 'number'],
      tag_color: ['tag color', 'tag_color', 'color', 'ear tag color'],
      name: ['name', 'animal name', 'nickname'],
      animal_type: ['type', 'animal type', 'animal_type', 'species', 'kind'],
      sex: ['sex', 'gender'],
      source: ['source', 'origin', 'acquired'],
      status: ['status', 'current status'],
      birth_date: ['birth date', 'birth_date', 'birthdate', 'dob', 'date of birth', 'born'],
      weaning_date: ['weaning date', 'weaning_date', 'weaningdate', 'weaned'],
      exit_date: ['exit date', 'exit_date', 'exitdate', 'sold date', 'death date', 'deceased'],
      description: ['description', 'desc', 'breed', 'details'],
      notes: ['notes', 'comments', 'remarks'],
      sale_price: ['sale price', 'sale_price', 'saleprice', 'price', 'sold price', 'amount'],
    };

    for (const [field, patterns] of Object.entries(commonMappings)) {
      const matchedHeader = detectedHeaders.find(header =>
        patterns.some(pattern => header.toLowerCase().includes(pattern))
      );

      if (matchedHeader && field in fieldMappings) {
        (mappings as any)[field] = {
          ...fieldMappings[field as keyof FieldMappings],
          csvColumn: matchedHeader
        };
      }
    }

    setFieldMappings(prev => ({ ...prev, ...mappings }));
  };

  const handleMappingChange = (field: keyof FieldMappings, csvColumn: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [field]: { ...prev[field], csvColumn: csvColumn || null },
    }));
  };

  const getSexOptions = (animalType: string): string[] => {
    const typeMap: Record<string, string[]> = {
      'Cattle': ['BULL', 'STEER', 'HEIFER', 'COW'],
      'Sheep': ['RAM', 'WETHER', 'EWE'],
      'Goat': ['BUCK', 'WETHER', 'DOE'],
      'Horse': ['STALLION', 'GELDING', 'MARE'],
      'Pig': ['BOAR', 'BARROW', 'GILT', 'SOW'],
      'Other': ['MALE', 'CASTRATED_MALE', 'FEMALE'],
    };
    return typeMap[animalType] || typeMap['Other'];
  };

  const normalizeSex = (value: string, animalType: string): string | null => {
    const normalized = value.toUpperCase().trim();
    const validOptions = getSexOptions(animalType);

    if (validOptions.includes(normalized)) return normalized;

    const mappings: Record<string, Record<string, string>> = {
      'Cattle': { 'B': 'BULL', 'S': 'STEER', 'H': 'HEIFER', 'C': 'COW', 'MALE': 'BULL', 'FEMALE': 'HEIFER' },
      'Sheep': { 'R': 'RAM', 'W': 'WETHER', 'E': 'EWE', 'MALE': 'RAM', 'FEMALE': 'EWE' },
      'Goat': { 'B': 'BUCK', 'W': 'WETHER', 'D': 'DOE', 'MALE': 'BUCK', 'FEMALE': 'DOE' },
      'Horse': { 'S': 'STALLION', 'G': 'GELDING', 'M': 'MARE', 'MALE': 'STALLION', 'FEMALE': 'MARE' },
      'Pig': { 'B': 'BOAR', 'BARROW': 'BARROW', 'G': 'GILT', 'S': 'SOW', 'MALE': 'BOAR', 'FEMALE': 'GILT' },
    };

    return mappings[animalType]?.[normalized] || null;
  };

  const normalizeDate = (value: string): string | null => {
    if (!value || !value.trim()) return null;

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;

      const year = date.getFullYear();
      if (year < 1950 || year > 2100) return null;

      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  const normalizeAnimalType = (value: string): string => {
    const normalized = value.toLowerCase().trim();
    const types = ['cattle', 'sheep', 'goat', 'horse', 'pig', 'other'];

    for (const type of types) {
      if (normalized.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }

    return 'Cattle';
  };

  const normalizeSource = (value: string): 'BORN' | 'PURCHASED' => {
    const normalized = value.toUpperCase().trim();
    if (normalized.includes('PURCH') || normalized === 'P') return 'PURCHASED';
    return 'BORN';
  };

  const normalizeStatus = (value: string): 'PRESENT' | 'SOLD' | 'BUTCHERED' | 'DEAD' => {
    const normalized = value.toUpperCase().trim();
    if (normalized.includes('SOLD') || normalized === 'S') return 'SOLD';
    if (normalized.includes('BUTCH') || normalized === 'B') return 'BUTCHERED';
    if (normalized.includes('DEAD') || normalized.includes('DECEASED') || normalized === 'D') return 'DEAD';
    return 'PRESENT';
  };

  const getColumnValue = (row: string[], field: keyof FieldMappings): string | null => {
    const mapping = fieldMappings[field];
    if (!mapping.csvColumn) return null;

    const columnIndex = headers.indexOf(mapping.csvColumn);
    if (columnIndex === -1) return null;

    const value = row[columnIndex]?.trim();
    return value || null;
  };

  const validateMappings = (): boolean => {
    const missingRequired = (Object.keys(fieldMappings) as Array<keyof FieldMappings>)
      .filter(key => fieldMappings[key].required && !fieldMappings[key].csvColumn);

    if (missingRequired.length > 0) {
      alert(`Please map required fields: ${missingRequired.join(', ')}`);
      return false;
    }

    return true;
  };

  const handlePreview = () => {
    if (!validateMappings()) return;
    setStep('preview');
  };

  const handleImport = async () => {
    if (!currentRanch || !validateMappings()) return;

    setStep('importing');
    setImporting(true);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        const animalType = normalizeAnimalType(getColumnValue(row, 'animal_type') || 'Cattle');
        const sexValue = getColumnValue(row, 'sex');
        const sex = sexValue ? normalizeSex(sexValue, animalType) : null;

        if (!sex) {
          throw new Error(`Invalid sex value for ${animalType}: ${sexValue}`);
        }

        const salePrice = getColumnValue(row, 'sale_price');
        const parsedSalePrice = salePrice ? parseFloat(salePrice.replace(/[^0-9.]/g, '')) : null;

        const animal: Partial<Animal> = {
          ranch_id: currentRanch.id,
          tag_number: getColumnValue(row, 'tag_number'),
          tag_color: getColumnValue(row, 'tag_color'),
          name: getColumnValue(row, 'name'),
          animal_type: animalType as any,
          sex: sex as any,
          source: normalizeSource(getColumnValue(row, 'source') || 'BORN'),
          status: normalizeStatus(getColumnValue(row, 'status') || 'PRESENT'),
          birth_date: normalizeDate(getColumnValue(row, 'birth_date') || ''),
          weaning_date: normalizeDate(getColumnValue(row, 'weaning_date') || ''),
          exit_date: normalizeDate(getColumnValue(row, 'exit_date') || ''),
          description: getColumnValue(row, 'description'),
          notes: getColumnValue(row, 'notes'),
          sale_price: parsedSalePrice,
        };

        const { error } = await supabase
          .from('animals')
          .insert(animal as any);

        if (error) throw error;

        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`Row ${i + 2}: ${error.message || 'Unknown error'}`);
      }
    }

    setImportResult({ success: successCount, failed: failedCount, errors });
    setImporting(false);
    setStep('complete');
  };

  const getPreviewRows = () => {
    return csvData.slice(0, 5);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import Animals from CSV</h2>
              <p className="text-sm text-gray-600 mt-1">
                {step === 'upload' && 'Upload your CSV file'}
                {step === 'map' && 'Map your CSV columns to animal fields'}
                {step === 'preview' && 'Preview and confirm import'}
                {step === 'importing' && 'Importing animals...'}
                {step === 'complete' && 'Import complete'}
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
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">How to prepare your CSV file:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your CSV must have a header row with column names</li>
                      <li>Required columns: Animal Type (Cattle/Sheep/Goat/Horse/Pig/Other) and Sex</li>
                      <li>Recommended columns: Tag Number, Name, Birth Date</li>
                      <li>Optional columns: Tag Color, Source, Status, Weaning Date, Exit Date, Description, Notes, Sale Price</li>
                      <li>You can use any column names - we'll help you map them in the next step</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
                >
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-gray-400" />
                    <div>
                      {csvFile ? (
                        <span className="text-lg font-medium text-gray-900">{csvFile.name}</span>
                      ) : (
                        <>
                          <p className="text-lg font-medium text-gray-900">Click to select CSV file</p>
                          <p className="text-sm text-gray-600 mt-1">or drag and drop</p>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium">CSV file loaded successfully!</p>
                    <p className="mt-1">Found {headers.length} columns and {csvData.length} rows. Map your columns below.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {(Object.keys(fieldMappings) as Array<keyof FieldMappings>).map(field => {
                    const mapping = fieldMappings[field];
                    return (
                      <div key={field} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <label className="font-medium text-gray-900">
                                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </label>
                              {mapping.required && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{mapping.description}</p>
                            <select
                              value={mapping.csvColumn || ''}
                              onChange={(e) => handleMappingChange(field, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            >
                              <option value="">-- Skip this field --</option>
                              {headers.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={handlePreview}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  Preview Import
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Preview of first 5 rows</p>
                    <p className="mt-1">Review the data below and click Import to proceed.</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      {(Object.keys(fieldMappings) as Array<keyof FieldMappings>)
                        .filter(field => fieldMappings[field].csvColumn)
                        .map(field => (
                          <th key={field} className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b">
                            {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getPreviewRows().map((row, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        {(Object.keys(fieldMappings) as Array<keyof FieldMappings>)
                          .filter(field => fieldMappings[field].csvColumn)
                          .map(field => (
                            <td key={field} className="px-4 py-2 text-sm text-gray-900">
                              {getColumnValue(row, field) || '-'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('map')}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Back to Mapping
                </button>
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  Import {csvData.length} Animals
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Importing animals...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait while we process your data</p>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="space-y-4">
              <div className={`rounded-lg p-6 ${importResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Successfully imported:</span> {importResult.success} animals
                  </p>
                  {importResult.failed > 0 && (
                    <p className="text-sm">
                      <span className="font-medium">Failed:</span> {importResult.failed} rows
                    </p>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-sm text-red-700 mb-2">Errors:</p>
                    <div className="bg-white rounded border border-red-200 p-3 max-h-48 overflow-y-auto">
                      <ul className="text-xs text-red-700 space-y-1">
                        {importResult.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
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
