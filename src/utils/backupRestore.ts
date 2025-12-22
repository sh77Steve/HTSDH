import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Ranch = Database['public']['Tables']['ranches']['Row'];
type Animal = Database['public']['Tables']['animals']['Row'];
type MedicalHistory = Database['public']['Tables']['medical_history']['Row'];
type AnimalPhoto = Database['public']['Tables']['animal_photos']['Row'];
type RanchSettings = Database['public']['Tables']['ranch_settings']['Row'];
type UserRanch = Database['public']['Tables']['user_ranches']['Row'];
type Admin = Database['public']['Tables']['admins']['Row'];
type LicenseKey = Database['public']['Tables']['license_keys']['Row'];
type Invitation = Database['public']['Tables']['invitations']['Row'];
type Drug = Database['public']['Tables']['drugs']['Row'];
type TipTrick = Database['public']['Tables']['tips_tricks']['Row'];

interface AnimalWithMedicalHistory extends Animal {
  medical_history: MedicalHistory[];
}

interface RanchBackupData {
  ranch: Ranch;
  settings: RanchSettings | null;
  animals: AnimalWithMedicalHistory[];
}

interface SystemBackupData {
  user_ranches: UserRanch[];
  admins: Admin[];
  license_keys: LicenseKey[];
  invitations: Invitation[];
  drugs: Drug[];
  tips_tricks: TipTrick[];
}

interface BackupMetadata {
  version: string;
  created_at: string;
  ranch_count: number;
  includes_system_data: boolean;
}

export async function createBackup(
  onProgress?: (message: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  try {
    onProgress?.('Fetching ranches...');

    const { data: ranches, error: ranchesError } = await supabase
      .from('ranches')
      .select('*');

    if (ranchesError) throw ranchesError;
    if (!ranches || ranches.length === 0) {
      throw new Error('No ranches found to backup');
    }

    const metadata: BackupMetadata = {
      version: '2.0',
      created_at: new Date().toISOString(),
      ranch_count: ranches.length,
      includes_system_data: true
    };

    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // Back up system-level data
    onProgress?.('Backing up system data (users, admins, licenses)...');

    const { data: userRanches } = await supabase
      .from('user_ranches')
      .select('*');

    const { data: admins } = await supabase
      .from('admins')
      .select('*');

    const { data: licenseKeys } = await supabase
      .from('license_keys')
      .select('*');

    const { data: invitations } = await supabase
      .from('invitations')
      .select('*');

    const { data: drugs } = await supabase
      .from('drugs')
      .select('*');

    const { data: tipsTricks } = await supabase
      .from('tips_tricks')
      .select('*');

    const systemData: SystemBackupData = {
      user_ranches: userRanches || [],
      admins: admins || [],
      license_keys: licenseKeys || [],
      invitations: invitations || [],
      drugs: drugs || [],
      tips_tricks: tipsTricks || []
    };

    zip.file('system-data.json', JSON.stringify(systemData, null, 2));

    for (const ranch of ranches) {
      onProgress?.(`Backing up ranch: ${ranch.name}...`);

      const ranchFolderName = `${ranch.name.replace(/[^a-zA-Z0-9]/g, '_')}-${ranch.id}`;
      const ranchFolder = zip.folder(ranchFolderName);

      if (!ranchFolder) continue;

      const { data: settings } = await supabase
        .from('ranch_settings')
        .select('*')
        .eq('ranch_id', ranch.id)
        .maybeSingle();

      const ranchData: RanchBackupData = {
        ranch,
        settings,
        animals: []
      };

      const { data: animals, error: animalsError } = await supabase
        .from('animals')
        .select('*')
        .eq('ranch_id', ranch.id);

      if (animalsError) throw animalsError;

      if (animals && animals.length > 0) {
        onProgress?.(`Backing up ${animals.length} animals...`);

        for (const animal of animals) {
          const { data: medicalHistory } = await supabase
            .from('medical_history')
            .select('*')
            .eq('animal_id', animal.id)
            .order('date', { ascending: false });

          ranchData.animals.push({
            ...animal,
            medical_history: medicalHistory || []
          });
        }

        const { data: photos, error: photosError } = await supabase
          .from('animal_photos')
          .select('*')
          .eq('ranch_id', ranch.id);

        if (photosError) throw photosError;

        if (photos && photos.length > 0) {
          onProgress?.(`Backing up ${photos.length} photos...`);
          const imagesFolder = ranchFolder.folder('images');

          if (imagesFolder) {
            for (const photo of photos) {
              try {
                const response = await fetch(photo.storage_url);
                if (response.ok) {
                  const blob = await response.blob();
                  const extension = photo.storage_url.split('.').pop()?.split('?')[0] || 'jpg';
                  const fileName = `${photo.animal_id}_${photo.id}.${extension}`;
                  imagesFolder.file(fileName, blob);
                }
              } catch (error) {
                console.error(`Failed to download photo ${photo.id}:`, error);
              }
            }
          }
        }
      }

      ranchFolder.file('animals.json', JSON.stringify(ranchData, null, 2));
    }

    onProgress?.('Generating zip file...');
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return blob;
  } catch (error) {
    console.error('Backup error:', error);
    throw error;
  }
}

export async function downloadBackup(
  onProgress?: (message: string) => void
): Promise<void> {
  const blob = await createBackup(onProgress);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const fileName = `ranch-backup-${timestamp}.zip`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface RestoreOptions {
  mode: 'missing' | 'replace';
  ranchId?: string;
}

export async function restoreFromBackup(
  zipFile: File,
  options: RestoreOptions,
  onProgress?: (message: string) => void
): Promise<void> {
  try {
    onProgress?.('Reading backup file...');

    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);

    const metadataFile = contents.file('metadata.json');
    if (!metadataFile) {
      throw new Error('Invalid backup file: missing metadata.json');
    }

    const metadataText = await metadataFile.async('text');
    const metadata: BackupMetadata = JSON.parse(metadataText);

    onProgress?.(`Found backup with ${metadata.ranch_count} ranch(es)`);

    // Restore system data if present (v2.0 backups)
    const systemDataFile = contents.file('system-data.json');
    if (systemDataFile) {
      onProgress?.('Restoring system data (users, admins, licenses)...');

      const systemDataText = await systemDataFile.async('text');
      const systemData: SystemBackupData = JSON.parse(systemDataText);

      // Restore user_ranches
      if (systemData.user_ranches && systemData.user_ranches.length > 0) {
        onProgress?.(`Restoring ${systemData.user_ranches.length} user-ranch associations...`);
        for (const userRanch of systemData.user_ranches) {
          await supabase
            .from('user_ranches')
            .upsert(userRanch, { onConflict: 'user_id,ranch_id' })
            .select();
        }
      }

      // Restore admins
      if (systemData.admins && systemData.admins.length > 0) {
        onProgress?.(`Restoring ${systemData.admins.length} admin(s)...`);
        for (const admin of systemData.admins) {
          await supabase
            .from('admins')
            .upsert(admin, { onConflict: 'user_id' })
            .select();
        }
      }

      // Restore license keys
      if (systemData.license_keys && systemData.license_keys.length > 0) {
        onProgress?.(`Restoring ${systemData.license_keys.length} license key(s)...`);
        for (const licenseKey of systemData.license_keys) {
          await supabase
            .from('license_keys')
            .upsert(licenseKey, { onConflict: 'key' })
            .select();
        }
      }

      // Restore invitations
      if (systemData.invitations && systemData.invitations.length > 0) {
        onProgress?.(`Restoring ${systemData.invitations.length} invitation(s)...`);
        for (const invitation of systemData.invitations) {
          await supabase
            .from('invitations')
            .upsert(invitation, { onConflict: 'id' })
            .select();
        }
      }

      // Restore drugs
      if (systemData.drugs && systemData.drugs.length > 0) {
        onProgress?.(`Restoring ${systemData.drugs.length} drug(s)...`);
        for (const drug of systemData.drugs) {
          await supabase
            .from('drugs')
            .upsert(drug, { onConflict: 'id' })
            .select();
        }
      }

      // Restore tips & tricks
      if (systemData.tips_tricks && systemData.tips_tricks.length > 0) {
        onProgress?.(`Restoring ${systemData.tips_tricks.length} tip(s)...`);
        for (const tip of systemData.tips_tricks) {
          await supabase
            .from('tips_tricks')
            .upsert(tip, { onConflict: 'id' })
            .select();
        }
      }

      onProgress?.('System data restored successfully');
    }

    const ranchFolders = Object.keys(contents.files).filter(
      path => path.includes('/') && path.endsWith('animals.json')
    );

    if (ranchFolders.length === 0) {
      throw new Error('No ranch data found in backup');
    }

    for (const animalsJsonPath of ranchFolders) {
      const animalsFile = contents.file(animalsJsonPath);
      if (!animalsFile) continue;

      const animalsText = await animalsFile.async('text');
      const ranchData: RanchBackupData = JSON.parse(animalsText);

      if (options.ranchId && ranchData.ranch.id !== options.ranchId) {
        continue;
      }

      onProgress?.(`Restoring ranch: ${ranchData.ranch.name}...`);

      const { data: existingRanch } = await supabase
        .from('ranches')
        .select('id')
        .eq('id', ranchData.ranch.id)
        .maybeSingle();

      if (!existingRanch) {
        throw new Error(`Ranch ${ranchData.ranch.name} (${ranchData.ranch.id}) does not exist in the database. Cannot restore.`);
      }

      if (options.mode === 'replace') {
        onProgress?.('Deleting existing animals...');

        await supabase
          .from('animals')
          .delete()
          .eq('ranch_id', ranchData.ranch.id);
      }

      const { data: existingAnimals } = await supabase
        .from('animals')
        .select('id')
        .eq('ranch_id', ranchData.ranch.id);

      const existingAnimalIds = new Set(existingAnimals?.map(a => a.id) || []);

      onProgress?.(`Restoring ${ranchData.animals.length} animals...`);

      for (const animalWithHistory of ranchData.animals) {
        const { medical_history, ...animal } = animalWithHistory;

        if (options.mode === 'missing' && existingAnimalIds.has(animal.id)) {
          continue;
        }

        const { error: animalError } = await supabase
          .from('animals')
          .upsert(animal, { onConflict: 'id' });

        if (animalError) {
          console.error(`Failed to restore animal ${animal.id}:`, animalError);
          continue;
        }

        if (medical_history && medical_history.length > 0) {
          for (const record of medical_history) {
            await supabase
              .from('medical_history')
              .upsert(record, { onConflict: 'id' });
          }
        }

        const ranchFolder = animalsJsonPath.replace('/animals.json', '');
        const imagesFolder = contents.folder(`${ranchFolder}/images`);

        if (imagesFolder) {
          const imageFiles = Object.keys(contents.files).filter(
            path => path.startsWith(`${ranchFolder}/images/`) && !path.endsWith('/')
          );

          for (const imagePath of imageFiles) {
            const fileName = imagePath.split('/').pop();
            if (!fileName || !fileName.startsWith(`${animal.id}_`)) continue;

            const imageFile = contents.file(imagePath);
            if (!imageFile) continue;

            try {
              const photoId = fileName.split('_')[1].split('.')[0];

              const { data: existingPhoto } = await supabase
                .from('animal_photos')
                .select('id')
                .eq('id', photoId)
                .maybeSingle();

              if (existingPhoto && options.mode === 'missing') {
                continue;
              }

              const blob = await imageFile.async('blob');
              const timestamp = Date.now();
              const extension = fileName.split('.').pop() || 'jpg';
              const storagePath = `${ranchData.ranch.id}/${animal.id}/${timestamp}.${extension}`;

              const { error: uploadError } = await supabase.storage
                .from('animal-photos')
                .upload(storagePath, blob, {
                  contentType: `image/${extension}`,
                  upsert: options.mode === 'replace'
                });

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                .from('animal-photos')
                .getPublicUrl(storagePath);

              await supabase
                .from('animal_photos')
                .upsert({
                  id: photoId,
                  animal_id: animal.id,
                  ranch_id: ranchData.ranch.id,
                  storage_url: publicUrl,
                  is_primary: false,
                  is_synced: true
                }, { onConflict: 'id' });

            } catch (error) {
              console.error(`Failed to restore photo ${fileName}:`, error);
            }
          }
        }
      }

      onProgress?.(`Ranch ${ranchData.ranch.name} restored successfully`);
    }

  } catch (error) {
    console.error('Restore error:', error);
    throw error;
  }
}
