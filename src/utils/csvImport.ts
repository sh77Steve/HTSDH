import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Insert'];
type MedicalHistory = Database['public']['Tables']['medical_history']['Insert'];

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n').filter(line => line.trim());
  const result: string[][] = [];

  for (const line of lines) {
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    result.push(cells);
  }

  return result;
}

function parseV1Date(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    // Reject placeholder dates (1900-01-01 and similar old dates)
    const year = date.getFullYear();
    if (year < 1950) return null;

    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function parseV1Sex(sex: string | undefined): 'BULL' | 'COW' | 'STEER' | 'HEIFER' {
  const normalized = (sex || '').toUpperCase().trim();
  if (normalized === 'BULL' || normalized === 'B') return 'BULL';
  if (normalized === 'COW' || normalized === 'C') return 'COW';
  if (normalized === 'STEER' || normalized === 'S') return 'STEER';
  if (normalized === 'HEIFER' || normalized === 'H') return 'HEIFER';
  return 'BULL';
}

function parseV1Source(source: string | undefined): 'BORN' | 'PURCHASED' {
  const normalized = (source || '').toUpperCase().trim();
  if (normalized === 'PURCHASED' || normalized === 'P') return 'PURCHASED';
  if (normalized === 'BORN' || normalized === 'B') return 'BORN';
  return 'BORN';
}

function parseV1Status(status: string | undefined): 'PRESENT' | 'SOLD' | 'DEAD' {
  const normalized = (status || '').toUpperCase().trim();
  if (normalized === 'SOLD' || normalized === 'S') return 'SOLD';
  if (normalized === 'DEAD' || normalized === 'D') return 'DEAD';
  if (normalized === 'PRESENT' || normalized === 'P') return 'PRESENT';
  return 'PRESENT';
}

export function parseV1AnimalCSVByPosition(csvText: string): Array<{
  uid: string;
  source: string;
  status: string;
  tagNumber: string;
  tagColor: string;
  name: string;
  sex: string;
  birthDate: string;
  weaningDate: string;
  exitDate: string;
  motherUID: string;
  fatherUID: string;
  description: string;
  notes: string;
}> {
  const rows = parseCSV(csvText);
  const data: any[] = [];

  for (const row of rows) {
    // Need at least the core fields (UID through motherUID = 12 fields minimum)
    if (row.length < 12) {
      console.log('Skipping row with insufficient fields:', row.length, row);
      continue;
    }

    data.push({
      uid: row[0] || '',
      source: row[1] || '',
      status: row[2] || '',
      tagNumber: row[3] || '',
      tagColor: row[4] || '',
      name: row[5] || '',
      sex: row[6] || '',
      description: row[7] || '',
      birthDate: row[8] || '',
      weaningDate: row[9] || '',
      exitDate: row[10] || '',
      motherUID: row[11] || '',
      fatherUID: row[12] || '',
      notes: row[13] || '',
    });
  }

  return data;
}

export function parseV1MedicalCSVByPosition(csvText: string): Array<{
  animalUID: string;
  date: string;
  description: string;
}> {
  const rows = parseCSV(csvText);
  const data: any[] = [];

  for (const row of rows) {
    if (row.length < 3) continue;

    data.push({
      animalUID: row[0] || '',
      date: row[1] || '',
      description: row[2] || '',
    });
  }

  return data;
}

export function convertV1Animal(
  row: {
    uid: string;
    source: string;
    status: string;
    tagNumber: string;
    tagColor: string;
    name: string;
    sex: string;
    birthDate: string;
    weaningDate: string;
    exitDate: string;
    motherUID: string;
    fatherUID: string;
    description: string;
    notes: string;
  },
  ranchId: string,
  uidToIdMap: Map<string, string>
): Partial<Animal> {
  const animal: Partial<Animal> = {
    ranch_id: ranchId,
    legacy_uid: row.uid || null,
    tag_number: row.tagNumber || null,
    tag_color: row.tagColor || null,
    name: row.name || null,
    sex: parseV1Sex(row.sex),
    source: parseV1Source(row.source),
    status: parseV1Status(row.status),
    birth_date: parseV1Date(row.birthDate),
    weaning_date: parseV1Date(row.weaningDate),
    exit_date: parseV1Date(row.exitDate),
    description: row.description || null,
    notes: row.notes || null,
    is_active: true,
  };

  if (row.motherUID && uidToIdMap.has(row.motherUID)) {
    animal.mother_id = uidToIdMap.get(row.motherUID);
  }

  if (row.fatherUID && uidToIdMap.has(row.fatherUID)) {
    animal.father_id = uidToIdMap.get(row.fatherUID);
  }

  return animal;
}

export function convertV1Medical(
  row: {
    animalUID: string;
    date: string;
    description: string;
  },
  ranchId: string,
  uidToIdMap: Map<string, string>,
  userId: string | null
): Partial<MedicalHistory> | null {
  if (!row.animalUID || !uidToIdMap.has(row.animalUID)) {
    return null;
  }

  if (!row.description?.trim()) {
    return null;
  }

  return {
    animal_id: uidToIdMap.get(row.animalUID),
    ranch_id: ranchId,
    date: parseV1Date(row.date) || new Date().toISOString().split('T')[0],
    description: row.description,
    created_by_user_id: userId,
  };
}
