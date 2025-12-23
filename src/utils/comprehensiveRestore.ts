import JSZip from 'jszip';
import { supabase } from '../lib/supabase';

interface RestoreSummary {
  animalsAdded: number;
  animalsSkipped: number;
  medicalHistoryAdded: number;
  medicalHistorySkipped: number;
  customFieldsAdded: number;
  errors: string[];
}

interface ParsedAnimal {
  id: string;
  tag_number: string;
  name: string;
  animal_type: string;
  sex: string;
  birth_date: string;
  birth_weight: string;
  status: string;
  date_sold: string;
  sale_price: string;
  mother_tag: string;
  father_tag: string;
  purchase_date: string;
  purchase_price: string;
  notes: string;
  medical_history: string;
  photo_count: string;
  customFields: Record<string, string>;
}

interface ParsedMedicalHistory {
  date: string;
  description: string;
}

export async function restoreComprehensiveBackup(
  file: File,
  ranchId: string
): Promise<RestoreSummary> {
  const summary: RestoreSummary = {
    animalsAdded: 0,
    animalsSkipped: 0,
    medicalHistoryAdded: 0,
    medicalHistorySkipped: 0,
    customFieldsAdded: 0,
    errors: [],
  };

  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const csvFile = zipContent.file('animals_complete_backup.csv');
    if (!csvFile) {
      throw new Error('Backup file does not contain animals_complete_backup.csv');
    }

    const csvContent = await csvFile.async('string');
    const parsedAnimals = parseCSV(csvContent);

    const { data: existingAnimals, error: fetchError } = await supabase
      .from('animals')
      .select('id')
      .eq('ranch_id', ranchId);

    if (fetchError) throw fetchError;

    const existingAnimalIds = new Set(existingAnimals?.map(a => a.id) || []);
    const newAnimalIdMap = new Map<string, string>();

    const { data: existingCustomFields } = await supabase
      .from('custom_field_definitions')
      .select('id, name')
      .eq('ranch_id', ranchId);

    const customFieldMap = new Map(existingCustomFields?.map(f => [f.name, f.id]) || []);

    for (const parsedAnimal of parsedAnimals) {
      try {
        const backupAnimalId = parsedAnimal.id;

        if (existingAnimalIds.has(backupAnimalId)) {
          summary.animalsSkipped++;

          if (parsedAnimal.medical_history) {
            const medicalHistorySummary = await restoreMedicalHistory(
              parsedAnimal.medical_history,
              backupAnimalId,
              ranchId
            );
            summary.medicalHistoryAdded += medicalHistorySummary.added;
            summary.medicalHistorySkipped += medicalHistorySummary.skipped;
          }
          continue;
        }

        let motherId: string | null = null;
        let fatherId: string | null = null;

        if (parsedAnimal.mother_tag) {
          const motherFromBackup = parsedAnimals.find(a =>
            a.tag_number === parsedAnimal.mother_tag && a.id !== backupAnimalId
          );
          if (motherFromBackup) {
            const motherBackupId = motherFromBackup.id;
            motherId = newAnimalIdMap.get(motherBackupId) ||
                      (existingAnimalIds.has(motherBackupId) ? motherBackupId : null);
          }
        }

        if (parsedAnimal.father_tag) {
          const fatherFromBackup = parsedAnimals.find(a =>
            a.tag_number === parsedAnimal.father_tag && a.id !== backupAnimalId
          );
          if (fatherFromBackup) {
            const fatherBackupId = fatherFromBackup.id;
            fatherId = newAnimalIdMap.get(fatherBackupId) ||
                      (existingAnimalIds.has(fatherBackupId) ? fatherBackupId : null);
          }
        }

        const animalData: any = {
          ranch_id: ranchId,
          tag_number: parsedAnimal.tag_number,
          name: parsedAnimal.name || null,
          animal_type: parsedAnimal.animal_type || 'BOVINE',
          sex: parsedAnimal.sex || null,
          birth_date: parsedAnimal.birth_date || null,
          birth_weight: parsedAnimal.birth_weight ? parseFloat(parsedAnimal.birth_weight) : null,
          status: parsedAnimal.status || 'PRESENT',
          date_sold: parsedAnimal.date_sold || null,
          sale_price: parsedAnimal.sale_price ? parseFloat(parsedAnimal.sale_price) : null,
          mother_id: motherId || null,
          father_id: fatherId || null,
          purchase_date: parsedAnimal.purchase_date || null,
          purchase_price: parsedAnimal.purchase_price ? parseFloat(parsedAnimal.purchase_price) : null,
          notes: parsedAnimal.notes || null,
        };

        const { data: newAnimal, error: insertError } = await supabase
          .from('animals')
          .insert(animalData)
          .select()
          .single();

        if (insertError) {
          summary.errors.push(`Failed to add animal ${parsedAnimal.tag_number}: ${insertError.message}`);
          continue;
        }

        summary.animalsAdded++;
        newAnimalIdMap.set(backupAnimalId, newAnimal.id);

        if (parsedAnimal.medical_history) {
          const medicalHistorySummary = await restoreMedicalHistory(
            parsedAnimal.medical_history,
            newAnimal.id,
            ranchId
          );
          summary.medicalHistoryAdded += medicalHistorySummary.added;
          summary.medicalHistorySkipped += medicalHistorySummary.skipped;
        }

        for (const [fieldName, fieldValue] of Object.entries(parsedAnimal.customFields)) {
          if (!fieldValue) continue;

          let fieldId = customFieldMap.get(fieldName);

          if (!fieldId) {
            const { data: newField } = await supabase
              .from('custom_field_definitions')
              .insert({
                ranch_id: ranchId,
                name: fieldName,
                field_type: 'text',
              })
              .select()
              .single();

            if (newField) {
              fieldId = newField.id;
              customFieldMap.set(fieldName, fieldId);
              summary.customFieldsAdded++;
            }
          }

          if (fieldId) {
            await supabase
              .from('custom_field_values')
              .insert({
                animal_id: newAnimal.id,
                field_id: fieldId,
                value: fieldValue,
              });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        summary.errors.push(`Error processing animal ${parsedAnimal.tag_number}: ${errorMessage}`);
      }
    }

    return summary;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    summary.errors.push(`Fatal error: ${errorMessage}`);
    return summary;
  }
}

async function restoreMedicalHistory(
  medicalHistoryString: string,
  animalId: string,
  ranchId: string
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  const entries = parseMedicalHistory(medicalHistoryString);

  const { data: existingHistory } = await supabase
    .from('medical_history')
    .select('date, description')
    .eq('animal_id', animalId);

  const existingSet = new Set(
    existingHistory?.map(h => `${h.date}|${h.description}`) || []
  );

  for (const entry of entries) {
    const key = `${entry.date}|${entry.description}`;

    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('medical_history')
      .insert({
        animal_id: animalId,
        ranch_id: ranchId,
        date: entry.date,
        description: entry.description,
      });

    if (!error) {
      added++;
      existingSet.add(key);
    } else {
      skipped++;
    }
  }

  return { added, skipped };
}

function parseMedicalHistory(historyString: string): ParsedMedicalHistory[] {
  if (!historyString || historyString.trim() === '') return [];

  const entries = historyString.split('|').map(s => s.trim());
  const parsed: ParsedMedicalHistory[] = [];

  for (const entry of entries) {
    const colonIndex = entry.indexOf(':');
    if (colonIndex === -1) continue;

    const datePart = entry.substring(0, colonIndex).trim();
    const description = entry.substring(colonIndex + 1).trim();

    if (datePart && description) {
      parsed.push({
        date: datePart,
        description: description,
      });
    }
  }

  return parsed;
}

function parseCSV(csvContent: string): ParsedAnimal[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const standardHeaders = [
    'Animal UID',
    'Tag Number',
    'Name',
    'Type',
    'Sex',
    'Birth Date',
    'Birth Weight',
    'Status',
    'Date Sold',
    'Sale Price',
    'Mother Tag',
    'Father Tag',
    'Purchase Date',
    'Purchase Price',
    'Notes',
    'Medical History',
    'Photo Count',
  ];

  const customFieldHeaders = headers.slice(standardHeaders.length);

  const animals: ParsedAnimal[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    const customFields: Record<string, string> = {};
    for (let j = 0; j < customFieldHeaders.length; j++) {
      const headerIndex = standardHeaders.length + j;
      if (values[headerIndex]) {
        customFields[customFieldHeaders[j]] = values[headerIndex];
      }
    }

    animals.push({
      id: values[0] || '',
      tag_number: values[1] || '',
      name: values[2] || '',
      animal_type: values[3] || 'BOVINE',
      sex: values[4] || '',
      birth_date: values[5] || '',
      birth_weight: values[6] || '',
      status: values[7] || 'PRESENT',
      date_sold: values[8] || '',
      sale_price: values[9] || '',
      mother_tag: values[10] || '',
      father_tag: values[11] || '',
      purchase_date: values[12] || '',
      purchase_price: values[13] || '',
      notes: values[14] || '',
      medical_history: values[15] || '',
      photo_count: values[16] || '0',
      customFields,
    });
  }

  return animals;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}
