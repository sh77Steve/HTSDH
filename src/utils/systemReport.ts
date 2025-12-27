import { supabase } from '../lib/supabase';

export interface RanchStorageStats {
  ranchId: string;
  ranchName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  licenseType: string | null;
  licenseExpiration: string | null;
  lastBackupDate: string | null;
  daysSinceLastBackup: number | null;
  currentAnimals: number;
  maxAnimals: number | null;
  animalCount: number;
  medicalRecordsCount: number;
  photosCount: number;
  customFieldsCount: number;
  drugsCount: number;
  snapshotsCount: number;
  photoStorageMB: number;
  estimatedDataKB: number;
}

export interface SystemReportSummary {
  ranches: RanchStorageStats[];
  totalRanches: number;
  totalAnimals: number;
  totalMedicalRecords: number;
  totalPhotos: number;
  totalPhotoStorageMB: number;
  totalEstimatedDataMB: number;
  generatedAt: string;
}

const AVG_ANIMAL_ROW_KB = 2;
const AVG_MEDICAL_ROW_KB = 1;
const AVG_PHOTO_METADATA_KB = 0.5;
const AVG_CUSTOM_FIELD_KB = 0.5;
const AVG_DRUG_ROW_KB = 1;
const AVG_SNAPSHOT_KB = 5;

export async function generateSystemReport(
  progressCallback?: (message: string) => void
): Promise<SystemReportSummary> {
  try {
    progressCallback?.('Loading ranch information...');

    const { data: ranches, error: ranchesError } = await supabase
      .from('ranches')
      .select('id, name, contact_name, contact_email, contact_phone, license_type, license_expiration, max_animals, last_backup_date')
      .order('name', { ascending: true });

    if (ranchesError) throw ranchesError;
    if (!ranches) throw new Error('No ranches found');

    const ranchStats: RanchStorageStats[] = [];
    let totalAnimals = 0;
    let totalMedicalRecords = 0;
    let totalPhotos = 0;
    let totalPhotoStorageMB = 0;
    let totalEstimatedDataKB = 0;

    for (let i = 0; i < ranches.length; i++) {
      const ranch = ranches[i];
      progressCallback?.(`Processing ranch ${i + 1} of ${ranches.length}: ${ranch.name}`);

      const { count: animalCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('ranch_id', ranch.id);

      const { count: medicalCount } = await supabase
        .from('medical_history')
        .select('*', { count: 'exact', head: true })
        .eq('ranch_id', ranch.id);

      const { count: photosCount } = await supabase
        .from('animal_photos')
        .select('*', { count: 'exact', head: true })
        .eq('ranch_id', ranch.id);

      const { data: customFieldDefs } = await supabase
        .from('custom_field_definitions')
        .select('id')
        .eq('ranch_id', ranch.id);

      const fieldIds = customFieldDefs?.map(def => def.id) || [];

      let customFieldsCount = 0;
      if (fieldIds.length > 0) {
        const { count } = await supabase
          .from('custom_field_values')
          .select('*', { count: 'exact', head: true })
          .in('field_id', fieldIds);
        customFieldsCount = count || 0;
      }

      const { count: drugsCount } = await supabase
        .from('drugs')
        .select('*', { count: 'exact', head: true })
        .eq('ranch_id', ranch.id);

      const { count: snapshotsCount } = await supabase
        .from('count_report_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('ranch_id', ranch.id);

      progressCallback?.(`Calculating storage for ${ranch.name}...`);

      // Get actual photo storage from database
      const { data: photoSizes } = await supabase
        .from('animal_photos')
        .select('file_size_bytes')
        .eq('ranch_id', ranch.id)
        .not('file_size_bytes', 'is', null);

      let photoStorageBytes = 0;
      if (photoSizes && photoSizes.length > 0) {
        photoStorageBytes = photoSizes.reduce((sum, photo) => sum + (photo.file_size_bytes || 0), 0);
      }

      // For photos without recorded sizes (legacy data), estimate at 2MB each
      const photosWithoutSize = (photosCount || 0) - (photoSizes?.length || 0);
      const AVG_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;
      photoStorageBytes += photosWithoutSize * AVG_PHOTO_SIZE_BYTES;

      const photoStorageMB = photoStorageBytes / (1024 * 1024);

      const estimatedDataKB =
        (animalCount || 0) * AVG_ANIMAL_ROW_KB +
        (medicalCount || 0) * AVG_MEDICAL_ROW_KB +
        (photosCount || 0) * AVG_PHOTO_METADATA_KB +
        (customFieldsCount || 0) * AVG_CUSTOM_FIELD_KB +
        (drugsCount || 0) * AVG_DRUG_ROW_KB +
        (snapshotsCount || 0) * AVG_SNAPSHOT_KB;

      let daysSinceLastBackup: number | null = null;
      if (ranch.last_backup_date) {
        const lastBackup = new Date(ranch.last_backup_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastBackup.getTime());
        daysSinceLastBackup = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      ranchStats.push({
        ranchId: ranch.id,
        ranchName: ranch.name,
        contactName: ranch.contact_name,
        contactEmail: ranch.contact_email,
        contactPhone: ranch.contact_phone,
        licenseType: ranch.license_type,
        licenseExpiration: ranch.license_expiration,
        lastBackupDate: ranch.last_backup_date,
        daysSinceLastBackup: daysSinceLastBackup,
        currentAnimals: animalCount || 0,
        maxAnimals: ranch.max_animals,
        animalCount: animalCount || 0,
        medicalRecordsCount: medicalCount || 0,
        photosCount: photosCount || 0,
        customFieldsCount: customFieldsCount || 0,
        drugsCount: drugsCount || 0,
        snapshotsCount: snapshotsCount || 0,
        photoStorageMB: parseFloat(photoStorageMB.toFixed(2)),
        estimatedDataKB: parseFloat(estimatedDataKB.toFixed(2)),
      });

      totalAnimals += animalCount || 0;
      totalMedicalRecords += medicalCount || 0;
      totalPhotos += photosCount || 0;
      totalPhotoStorageMB += photoStorageMB;
      totalEstimatedDataKB += estimatedDataKB;
    }

    progressCallback?.('Report generation complete!');

    return {
      ranches: ranchStats,
      totalRanches: ranches.length,
      totalAnimals,
      totalMedicalRecords,
      totalPhotos,
      totalPhotoStorageMB: parseFloat(totalPhotoStorageMB.toFixed(2)),
      totalEstimatedDataMB: parseFloat((totalEstimatedDataKB / 1024).toFixed(2)),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating system report:', error);
    throw error;
  }
}

export function exportSystemReportToCSV(report: SystemReportSummary): string {
  const headers = [
    'Ranch Name',
    'Contact Name',
    'Contact Email',
    'Contact Phone',
    'License Type',
    'License Expiration',
    'Last Backup Date',
    'Days Since Last Backup',
    'Current Animals',
    'Max Animals',
    'Medical Records',
    'Photos',
    'Custom Fields',
    'Drugs',
    'Snapshots',
    'Photo Storage (MB)',
    'Est. Data Size (KB)',
  ];

  const rows = report.ranches.map((ranch) => [
    ranch.ranchName,
    ranch.contactName || '',
    ranch.contactEmail || '',
    ranch.contactPhone || '',
    ranch.licenseType || 'None',
    ranch.licenseExpiration ? new Date(ranch.licenseExpiration).toLocaleDateString() : 'N/A',
    ranch.lastBackupDate ? new Date(ranch.lastBackupDate).toLocaleDateString() : 'Never',
    ranch.daysSinceLastBackup !== null ? ranch.daysSinceLastBackup.toString() : 'N/A',
    ranch.currentAnimals.toString(),
    ranch.maxAnimals?.toString() || 'N/A',
    ranch.medicalRecordsCount.toString(),
    ranch.photosCount.toString(),
    ranch.customFieldsCount.toString(),
    ranch.drugsCount.toString(),
    ranch.snapshotsCount.toString(),
    ranch.photoStorageMB.toFixed(2),
    ranch.estimatedDataKB.toFixed(2),
  ]);

  const summaryRows = [
    [],
    ['SUMMARY'],
    ['Total Ranches', report.totalRanches.toString()],
    ['Total Animals', report.totalAnimals.toString()],
    ['Total Medical Records', report.totalMedicalRecords.toString()],
    ['Total Photos', report.totalPhotos.toString()],
    ['Total Photo Storage (MB)', report.totalPhotoStorageMB.toFixed(2)],
    ['Total Est. Database Size (MB)', report.totalEstimatedDataMB.toFixed(2)],
    ['Generated At', new Date(report.generatedAt).toLocaleString()],
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ...summaryRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
