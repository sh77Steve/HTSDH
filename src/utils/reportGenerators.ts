import type { Database } from '../lib/database.types';

type Animal = Database['public']['Tables']['animals']['Row'];
type MedicalHistory = Database['public']['Tables']['medical_history']['Row'];
type RanchSettings = Database['public']['Tables']['ranch_settings']['Row'];
type CustomFieldDefinition = Database['public']['Tables']['custom_field_definitions']['Row'];
type CustomFieldValue = Database['public']['Tables']['custom_field_values']['Row'];

export interface CountsReport {
  totalPresent: number;
  totalSold: number;
  totalDead: number;
  presentBulls: number;
  presentCows: number;
  presentSteers: number;
  presentHeifers: number;
  presentCalves: number;
  presentAdults: number;
}

export interface OffspringByParentReport {
  parentId: string;
  parentTag: string | null;
  parentName: string | null;
  offspring: Animal[];
  mostRecentBirthDate: string | null;
  daysSinceLastOffspring: number | null;
}

export function generateCountsReport(
  animals: Animal[],
  settings: RanchSettings
): CountsReport {
  const adultAge = Number(settings.adult_age_years) || 1.1;
  const present = animals.filter(a => a.status === 'PRESENT');
  const sold = animals.filter(a => a.status === 'SOLD');
  const dead = animals.filter(a => a.status === 'DEAD');

  const isAdult = (animal: Animal) => {
    if (!animal.birth_date) return true;
    const ageYears = (Date.now() - new Date(animal.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return ageYears >= adultAge;
  };

  const presentAdults = present.filter(isAdult);
  const presentCalves = present.filter(a => !isAdult(a));

  return {
    totalPresent: present.length,
    totalSold: sold.length,
    totalDead: dead.length,
    presentBulls: present.filter(a => a.sex === 'BULL').length,
    presentCows: present.filter(a => a.sex === 'COW').length,
    presentSteers: present.filter(a => a.sex === 'STEER').length,
    presentHeifers: present.filter(a => a.sex === 'HEIFER').length,
    presentCalves: presentCalves.length,
    presentAdults: presentAdults.length,
  };
}

export function generateOffspringByMotherReport(animals: Animal[]): OffspringByParentReport[] {
  const potentialMothers = animals.filter(a =>
    a.status === 'PRESENT' && (a.sex === 'COW' || a.sex === 'HEIFER' || a.sex === 'EWE' || a.sex === 'DOE' || a.sex === 'SOW' || a.sex === 'MARE' || a.sex === 'JENNET')
  );

  const reports = potentialMothers.map(mother => {
    const offspring = animals.filter(a => a.mother_id === mother.id);
    const birthDates = offspring
      .map(o => o.birth_date)
      .filter(d => d != null)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

    const mostRecentBirthDate = birthDates.length > 0 ? birthDates[0] : null;
    const daysSinceLastOffspring = mostRecentBirthDate
      ? Math.floor((Date.now() - new Date(mostRecentBirthDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      parentId: mother.id,
      parentTag: mother.tag_number,
      parentName: mother.name,
      offspring,
      mostRecentBirthDate,
      daysSinceLastOffspring,
    };
  });

  return reports.sort((a, b) => {
    if (a.daysSinceLastOffspring === null && b.daysSinceLastOffspring === null) return 0;
    if (a.daysSinceLastOffspring === null) return -1;
    if (b.daysSinceLastOffspring === null) return 1;
    return b.daysSinceLastOffspring - a.daysSinceLastOffspring;
  });
}

export function generateOffspringByFatherReport(animals: Animal[]): OffspringByParentReport[] {
  const potentialFathers = animals.filter(a =>
    a.status === 'PRESENT' && (a.sex === 'BULL' || a.sex === 'STEER' || a.sex === 'RAM' || a.sex === 'BUCK' || a.sex === 'BOAR' || a.sex === 'STALLION' || a.sex === 'JACK')
  );

  const reports = potentialFathers.map(father => {
    const offspring = animals.filter(a => a.father_id === father.id);
    const birthDates = offspring
      .map(o => o.birth_date)
      .filter(d => d != null)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

    const mostRecentBirthDate = birthDates.length > 0 ? birthDates[0] : null;
    const daysSinceLastOffspring = mostRecentBirthDate
      ? Math.floor((Date.now() - new Date(mostRecentBirthDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      parentId: father.id,
      parentTag: father.tag_number,
      parentName: father.name,
      offspring,
      mostRecentBirthDate,
      daysSinceLastOffspring,
    };
  });

  return reports.sort((a, b) => {
    if (a.daysSinceLastOffspring === null && b.daysSinceLastOffspring === null) return 0;
    if (a.daysSinceLastOffspring === null) return -1;
    if (b.daysSinceLastOffspring === null) return 1;
    return b.daysSinceLastOffspring - a.daysSinceLastOffspring;
  });
}

export const generateCalvesByMotherReport = generateOffspringByMotherReport;

export function exportToCSV(data: any[], headers: string[], filename: string) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const value = row[h] || '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(','))
  ].join('\n');

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

export function formatCustomFieldValue(field: CustomFieldDefinition, value: string | null): string {
  if (!value) return '';

  switch (field.field_type) {
    case 'dollar':
      const dollarValue = parseFloat(value);
      return isNaN(dollarValue) ? value : dollarValue.toFixed(2);
    case 'integer':
      return value;
    case 'decimal':
      const decimalValue = parseFloat(value);
      return isNaN(decimalValue) ? value : decimalValue.toFixed(2);
    case 'text':
    default:
      return value;
  }
}

export function formatAnimalForExport(
  animal: Animal,
  customFields?: CustomFieldDefinition[],
  customFieldValues?: CustomFieldValue[]
) {
  const baseData: Record<string, any> = {
    'Tag Number': animal.tag_number || '',
    'Tag Color': animal.tag_color || '',
    'Name': animal.name || '',
    'Sex': animal.sex,
    'Status': animal.status,
    'Source': animal.source,
    'Birth Date': animal.birth_date || '',
    'Weaning Date': animal.weaning_date || '',
    'Exit Date': animal.exit_date || '',
    'Description': animal.description || '',
    'Notes': animal.notes || '',
  };

  if (customFields && customFieldValues) {
    customFields.forEach(field => {
      const value = customFieldValues.find(v => v.field_id === field.id && v.animal_id === animal.id);
      baseData[field.field_name] = formatCustomFieldValue(field, value?.value || null);
    });
  }

  return baseData;
}

export function formatAnimalWithMedicalForExport(
  animal: Animal,
  medicalRecords: MedicalHistory[],
  customFields?: CustomFieldDefinition[],
  customFieldValues?: CustomFieldValue[]
) {
  const base = formatAnimalForExport(animal, customFields, customFieldValues);
  const medical = medicalRecords
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(m => `${m.date}: ${m.description}`)
    .join(' | ');

  return {
    ...base,
    'Medical History': medical || 'None',
    'Sale Price': animal.sale_price ? `$${Number(animal.sale_price).toFixed(2)}` : '',
  };
}
