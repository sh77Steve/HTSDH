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
    ...customFields.map(f => f.name),
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
      animal.animal_type || 'BOVINE',
      animal.sex || '',
      animal.birth_date || '',
      animal.birth_weight?.toString() || '',
      animal.status || 'PRESENT',
      animal.date_sold || '',
      animal.sale_price?.toString() || '',
      motherAnimal?.tag_number || '',
      fatherAnimal?.tag_number || '',
      animal.purchase_date || '',
      animal.purchase_price?.toString() || '',
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

  for (const animal of animals) {
    if (!animal.photo_count || animal.photo_count === 0) continue;

    for (let i = 0; i < animal.photo_count; i++) {
      try {
        const path = `${ranchId}/${animal.id}/${i}.jpg`;

        const { data, error } = await supabase.storage
          .from('animal-photos')
          .download(path);

        if (error) {
          console.warn(`Failed to download photo for animal ${animal.tag_number}: ${error.message}`);
          continue;
        }

        if (data) {
          const safeTagNumber = (animal.tag_number || 'NoTag').replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `${animal.id}_${safeTagNumber}_${i + 1}.jpg`;
          photosFolder.file(filename, data);
        }
      } catch (err) {
        console.warn(`Error downloading photo for animal ${animal.tag_number}:`, err);
      }
    }
  }
}

export function downloadComprehensiveBackup(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const timestamp = new Date().toISOString().split('T')[0];
  link.download = `AmadorHerdInfo_Complete_Backup_${timestamp}.zip`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
