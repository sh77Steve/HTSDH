import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import type { Animal, Injection, CustomField, CustomFieldValue } from '../lib/database.types';

interface ComprehensiveBackupData {
  animals: Animal[];
  injections: Injection[];
  customFields: CustomField[];
  customFieldValues: CustomFieldValue[];
}

export async function createComprehensiveBackup(
  data: ComprehensiveBackupData,
  ranchId: string
): Promise<Blob> {
  const zip = new JSZip();

  const csvContent = await generateComprehensiveCSV(data);
  zip.file('animals_complete_backup.csv', csvContent);

  await addPhotosToZip(zip, data.animals, ranchId);

  return await zip.generateAsync({ type: 'blob' });
}

async function generateComprehensiveCSV(data: ComprehensiveBackupData): Promise<string> {
  const { animals, injections, customFields, customFieldValues } = data;

  const headers = [
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
    ...customFields.map(f => f.field_name),
  ];

  const rows = animals.map(animal => {
    const animalInjections = injections.filter(i => i.animal_id === animal.id);
    const medicalHistory = formatMedicalHistory(animalInjections);

    const motherAnimal = animals.find(a => a.id === animal.mother_id);
    const fatherAnimal = animals.find(a => a.id === animal.father_id);

    const customFieldData = customFields.map(field => {
      const value = customFieldValues.find(
        v => v.animal_id === animal.id && v.field_id === field.id
      );
      return value?.value || '';
    });

    return [
      animal.id,
      animal.tag_number || '',
      animal.name || '',
      animal.animal_type || 'Cattle',
      animal.sex || '',
      animal.birth_date || '',
      animal.weaning_date || '',
      animal.status || 'PRESENT',
      animal.exit_date || '',
      animal.sale_price?.toString() || '',
      animal.weight_lbs?.toString() || '',
      motherAnimal?.tag_number || '',
      fatherAnimal?.tag_number || '',
      animal.source || '',
      animal.tag_color || '',
      animal.description || '',
      animal.notes || '',
      medicalHistory,
      animal.photo_count?.toString() || '0',
      ...customFieldData,
    ];
  });

  const csvLines = [
    headers.map(h => escapeCSVField(h)).join(','),
    ...rows.map(row => row.map(field => escapeCSVField(field?.toString() || '')).join(',')),
  ];

  return csvLines.join('\n');
}

function formatMedicalHistory(injections: Injection[]): string {
  if (injections.length === 0) return '';

  const sortedInjections = [...injections].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sortedInjections
    .map(inj => `${inj.date}: ${inj.description}`)
    .join(' | ');
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

async function addPhotosToZip(
  zip: JSZip,
  animals: Animal[],
  ranchId: string
): Promise<void> {
  const photosFolder = zip.folder('photos');
  if (!photosFolder) return;

  const animalIds = animals.map(a => a.id);
  if (animalIds.length === 0) return;

  const { data: photoRecords, error: photoError } = await supabase
    .from('animal_photos')
    .select('id, animal_id, storage_url')
    .eq('ranch_id', ranchId)
    .in('animal_id', animalIds);

  if (photoError) {
    console.error('Failed to fetch photo records:', photoError);
    return;
  }

  if (!photoRecords || photoRecords.length === 0) {
    console.log('No photos found in database');
    return;
  }

  console.log(`Found ${photoRecords.length} photos to backup`);

  for (const photoRecord of photoRecords) {
    try {
      const animal = animals.find(a => a.id === photoRecord.animal_id);
      if (!animal) continue;

      const storagePath = photoRecord.storage_url.replace(
        /^.*\/animal-photos\//,
        ''
      );

      const { data, error } = await supabase.storage
        .from('animal-photos')
        .download(storagePath);

      if (error) {
        console.warn(`Failed to download photo ${photoRecord.id}: ${error.message}`);
        continue;
      }

      if (data) {
        const safeTagNumber = (animal.tag_number || 'NoTag').replace(/[^a-zA-Z0-9]/g, '_');
        const photoIdShort = photoRecord.id.split('-')[0];
        const filename = `${animal.id}_${safeTagNumber}_${photoIdShort}.jpg`;
        photosFolder.file(filename, data);
      }
    } catch (err) {
      console.warn(`Error downloading photo ${photoRecord.id}:`, err);
    }
  }
}

export function downloadComprehensiveBackup(blob: Blob, ranchName?: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const timestamp = new Date().toISOString().split('T')[0];

  let safeRanchName: string;
  if (ranchName && ranchName.trim()) {
    safeRanchName = ranchName.trim().replace(/[^a-zA-Z0-9]/g, '_');
  } else {
    safeRanchName = `Ranch_${Date.now()}`;
  }

  link.download = `${safeRanchName}_Complete_Backup_${timestamp}.zip`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
