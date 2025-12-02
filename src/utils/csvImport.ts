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

function parseRanchRDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    if (year < 1950) return null;

    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function parseRanchRSex(sex: string | undefined): 'BULL' | 'COW' | 'STEER' | 'HEIFER' {
  const normalized = (sex || '').toLowerCase().trim();
  if (normalized === 'bull') return 'BULL';
  if (normalized === 'cow') return 'COW';
  if (normalized === 'steer') return 'STEER';
  if (normalized === 'heifer') return 'HEIFER';
  if (normalized === 'calf') return 'HEIFER';
  return 'COW';
}

function parseRanchRStatus(status: string | undefined): 'PRESENT' | 'SOLD' | 'DEAD' {
  const normalized = (status || '').toLowerCase().trim();
  if (normalized === 'sold') return 'SOLD';
  if (normalized === 'deceased') return 'DEAD';
  if (normalized === 'active' || normalized === 'present') return 'PRESENT';
  if (normalized === 'archived') return 'PRESENT';
  return 'PRESENT';
}

interface RanchRAnimalRow {
  primaryId: string;
  secondaryId: string;
  herd: string;
  sex: string;
  dateOfBirth: string;
  breed: string;
  secondaryBreed: string;
  fatherId: string;
  motherId: string;
  seller: string;
  owner: string;
  birthWeight: string;
  weaningWeight: string;
  weaningDate: string;
  yearlingWeight: string;
  yearlingDate: string;
  status: string;
  saleTransaction: string;
  purchaseDate: string;
  purchasePrice: string;
  deceasedDate: string;
  tags: string;
}

interface RanchRCalfRow {
  primaryId: string;
  secondaryId: string;
  herd: string;
  sex: string;
  dateOfBirth: string;
  breed: string;
  secondaryBreed: string;
  fatherId: string;
  fatherName: string;
  motherId: string;
  motherName: string;
  seller: string;
  owner: string;
  birthWeight: string;
  weaningWeight: string;
  weaningDate: string;
  yearlingWeight: string;
  yearlingDate: string;
  status: string;
  saleTransaction: string;
  purchaseDate: string;
  purchasePrice: string;
  result: string;
  calvingEase: string;
  damUdderScore: string;
  damBcs: string;
  damDisposition: string;
  tags: string;
}

interface RanchRMedicalRow {
  cattle: string;
  date: string;
  treatmentName: string;
  vaccination: string;
}

export function parseRanchRAnimalCSV(csvText: string): RanchRAnimalRow[] {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return [];

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map(row => ({
    primaryId: row[0] || '',
    secondaryId: row[1] || '',
    herd: row[2] || '',
    sex: row[3] || '',
    dateOfBirth: row[4] || '',
    breed: row[5] || '',
    secondaryBreed: row[6] || '',
    fatherId: row[7] || '',
    motherId: row[8] || '',
    seller: row[9] || '',
    owner: row[10] || '',
    birthWeight: row[11] || '',
    weaningWeight: row[12] || '',
    weaningDate: row[13] || '',
    yearlingWeight: row[14] || '',
    yearlingDate: row[15] || '',
    status: row[16] || '',
    saleTransaction: row[17] || '',
    purchaseDate: row[18] || '',
    purchasePrice: row[19] || '',
    deceasedDate: row[20] || '',
    tags: row[21] || '',
  }));
}

export function parseRanchRCalfCSV(csvText: string): RanchRCalfRow[] {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return [];

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map(row => ({
    primaryId: row[0] || '',
    secondaryId: row[1] || '',
    herd: row[2] || '',
    sex: row[3] || '',
    dateOfBirth: row[4] || '',
    breed: row[5] || '',
    secondaryBreed: row[6] || '',
    fatherId: row[7] || '',
    fatherName: row[8] || '',
    motherId: row[9] || '',
    motherName: row[10] || '',
    seller: row[11] || '',
    owner: row[12] || '',
    birthWeight: row[13] || '',
    weaningWeight: row[14] || '',
    weaningDate: row[15] || '',
    yearlingWeight: row[16] || '',
    yearlingDate: row[17] || '',
    status: row[18] || '',
    saleTransaction: row[19] || '',
    purchaseDate: row[20] || '',
    purchasePrice: row[21] || '',
    result: row[22] || '',
    calvingEase: row[23] || '',
    damUdderScore: row[24] || '',
    damBcs: row[25] || '',
    damDisposition: row[26] || '',
    tags: row[27] || '',
  }));
}

export function parseRanchRMedicalCSV(csvText: string): RanchRMedicalRow[] {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return [];

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map(row => ({
    cattle: row[0] || '',
    date: row[1] || '',
    treatmentName: row[2] || '',
    vaccination: row[3] || '',
  }));
}

export function convertRanchRAnimal(
  row: RanchRAnimalRow | RanchRCalfRow,
  ranchId: string,
  primaryIdToIdMap: Map<string, string>
): Partial<Animal> {
  const primaryId = row.primaryId?.trim() || null;
  const name = row.secondaryId?.trim() || primaryId;
  const source = (row.owner?.toLowerCase().includes('purchased') || row.seller) ? 'PURCHASED' : 'BORN';

  const animal: Partial<Animal> = {
    ranch_id: ranchId,
    legacy_uid: primaryId,
    name: name,
    tag_number: primaryId,
    tag_color: null,
    sex: parseRanchRSex(row.sex),
    source: source,
    status: parseRanchRStatus(row.status),
    birth_date: parseRanchRDate(row.dateOfBirth),
    weaning_date: parseRanchRDate(row.weaningDate),
    exit_date: parseRanchRDate(row.deceasedDate || ('result' in row ? row.result : '')),
    description: row.herd || null,
    notes: null,
    is_active: true,
  };

  if (row.motherId && primaryIdToIdMap.has(row.motherId)) {
    animal.mother_id = primaryIdToIdMap.get(row.motherId);
  }

  if (row.fatherId && primaryIdToIdMap.has(row.fatherId)) {
    animal.father_id = primaryIdToIdMap.get(row.fatherId);
  }

  return animal;
}

export function convertRanchRMedical(
  row: RanchRMedicalRow,
  ranchId: string,
  primaryIdToIdMap: Map<string, string>,
  userId: string | null
): Partial<MedicalHistory> | null {
  if (!row.cattle || !primaryIdToIdMap.has(row.cattle)) {
    return null;
  }

  if (!row.treatmentName?.trim()) {
    return null;
  }

  return {
    animal_id: primaryIdToIdMap.get(row.cattle),
    ranch_id: ranchId,
    date: parseRanchRDate(row.date) || new Date().toISOString().split('T')[0],
    description: row.treatmentName,
    created_by_user_id: userId,
  };
}
