import JSZip from 'jszip';
import { supabase } from '../lib/supabase';

interface RestoreSummary {
  animalsAdded: number;
  animalsSkipped: number;
  medicalHistoryAdded: number;
  medicalHistorySkipped: number;
  customFieldsAdded: number;
  photosRestored: number;
  errors: string[];
}

interface ParsedAnimal {
  id: string;
  tag_number: string;
  name: string;
  animal_type: string;
  sex: string;
  birth_date: string;
  weaning_date: string;
  status: string;
  exit_date: string;
  sale_price: string;
  weight_lbs: string;
  mother_tag: string;
  father_tag: string;
  source: string;
  tag_color: string;
  description: string;
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
    photosRestored: 0,
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
      .select('id, field_name')
      .eq('ranch_id', ranchId);

    const customFieldMap = new Map(existingCustomFields?.map(f => [f.field_name, f.id]) || []);

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
          animal_type: parsedAnimal.animal_type || 'Cattle',
          sex: parsedAnimal.sex || null,
          birth_date: parsedAnimal.birth_date || null,
          weaning_date: parsedAnimal.weaning_date || null,
          status: parsedAnimal.status || 'PRESENT',
          exit_date: parsedAnimal.exit_date || null,
          sale_price: parsedAnimal.sale_price ? parseFloat(parsedAnimal.sale_price) : null,
          weight_lbs: parsedAnimal.weight_lbs ? parseFloat(parsedAnimal.weight_lbs) : null,
          mother_id: motherId || null,
          father_id: fatherId || null,
          source: parsedAnimal.source || 'BORN',
          tag_color: parsedAnimal.tag_color || null,
          description: parsedAnimal.description || null,
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
                field_name: fieldName,
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

    const photosRestored = await restorePhotos(zipContent, newAnimalIdMap, ranchId);
    summary.photosRestored = photosRestored;

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
    'Weaning Date',
    'Status',
    'Exit Date',
    'Sale Price',
    'Weight (lbs)',
    'Mother Tag',
    'Father Tag',
    'Source',
    'Tag Color',
    'Description',
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
      animal_type: values[3] || 'Cattle',
      sex: values[4] || '',
      birth_date: values[5] || '',
      weaning_date: values[6] || '',
      status: values[7] || 'PRESENT',
      exit_date: values[8] || '',
      sale_price: values[9] || '',
      weight_lbs: values[10] || '',
      mother_tag: values[11] || '',
      father_tag: values[12] || '',
      source: values[13] || 'BORN',
      tag_color: values[14] || '',
      description: values[15] || '',
      notes: values[16] || '',
      medical_history: values[17] || '',
      photo_count: values[18] || '0',
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

async function restorePhotos(
  zipContent: JSZip,
  animalIdMap: Map<string, string>,
  ranchId: string
): Promise<number> {
  let photosRestored = 0;

  const photoFiles: Array<{ name: string; file: JSZip.JSZipObject }> = [];
  zipContent.forEach((relativePath, file) => {
    if (!file.dir && relativePath.startsWith('photos/') && relativePath.endsWith('.jpg')) {
      const filename = relativePath.replace('photos/', '');
      photoFiles.push({ name: filename, file });
    }
  });

  console.log(`Found ${photoFiles.length} photos in backup`);
  console.log('Animal ID map size:', animalIdMap.size);

  for (const { name, file } of photoFiles) {
    try {
      const oldAnimalId = name.split('_')[0];
      const newAnimalId = animalIdMap.get(oldAnimalId);

      console.log(`Processing photo ${name}, old ID: ${oldAnimalId}, new ID: ${newAnimalId}`);

      if (!newAnimalId) {
        console.log(`Skipping photo ${name}: animal not restored`);
        continue;
      }

      const rawBlob = await file.async('blob');
      const photoBlob = new Blob([rawBlob], { type: 'image/jpeg' });

      const timestamp = Date.now() + photosRestored;
      const storagePath = `${ranchId}/${newAnimalId}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('animal-photos')
        .upload(storagePath, photoBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Failed to upload photo ${name}:`, uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('animal-photos')
        .getPublicUrl(storagePath);

      const { error: dbError } = await supabase
        .from('animal_photos')
        .insert({
          animal_id: newAnimalId,
          ranch_id: ranchId,
          storage_url: urlData.publicUrl,
          file_size_bytes: photoBlob.size,
        });

      if (dbError) {
        console.error(`Failed to create photo record for ${name}:`, dbError);
        continue;
      }

      console.log(`Successfully restored photo ${name}`);
      photosRestored++;
    } catch (error) {
      console.error(`Error restoring photo ${name}:`, error);
    }
  }

  if (photosRestored > 0) {
    for (const [oldId, newId] of animalIdMap.entries()) {
      const animalPhotoCount = photoFiles.filter(p => p.name.startsWith(oldId + '_')).length;
      if (animalPhotoCount > 0) {
        await supabase
          .from('animals')
          .update({ photo_count: animalPhotoCount })
          .eq('id', newId);
      }
    }
  }

  console.log(`Total photos restored: ${photosRestored}`);
  return photosRestored;
}
