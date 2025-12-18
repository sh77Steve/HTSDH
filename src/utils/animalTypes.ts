export type AnimalType = 'Cattle' | 'Horse' | 'Sheep' | 'Goat' | 'Pig' | 'Donkey';

export const ANIMAL_TYPES: AnimalType[] = ['Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey'];

export const ANIMAL_SEX_OPTIONS: Record<AnimalType, string[]> = {
  Cattle: ['Bull', 'Steer', 'Cow', 'Heifer'],
  Horse: ['Stallion', 'Gelding', 'Mare', 'Filly', 'Colt'],
  Sheep: ['Ram', 'Wether', 'Ewe', 'Lamb'],
  Goat: ['Buck', 'Wether', 'Doe', 'Kid'],
  Pig: ['Boar', 'Barrow', 'Sow', 'Gilt', 'Piglet'],
  Donkey: ['Stallion', 'Gelding', 'Mare', 'Filly', 'Colt'],
};

export interface AutoPromotionRule {
  fromSex: string;
  toSex: string;
  ageThresholdKey: 'cattle_adult_age' | 'horse_adult_age' | 'sheep_adult_age' | 'goat_adult_age' | 'pig_adult_age';
}

export const AUTO_PROMOTION_RULES: Record<AnimalType, AutoPromotionRule[]> = {
  Cattle: [
    { fromSex: 'Heifer', toSex: 'Cow', ageThresholdKey: 'cattle_adult_age' }
  ],
  Horse: [
    { fromSex: 'Filly', toSex: 'Mare', ageThresholdKey: 'horse_adult_age' },
    { fromSex: 'Colt', toSex: 'Stallion', ageThresholdKey: 'horse_adult_age' }
  ],
  Donkey: [
    { fromSex: 'Filly', toSex: 'Mare', ageThresholdKey: 'horse_adult_age' },
    { fromSex: 'Colt', toSex: 'Stallion', ageThresholdKey: 'horse_adult_age' }
  ],
  Sheep: [],
  Goat: [],
  Pig: [],
};

export function getSexOptions(animalType: AnimalType): string[] {
  return ANIMAL_SEX_OPTIONS[animalType] || [];
}

export function getAutoPromotionRules(animalType: AnimalType): AutoPromotionRule[] {
  return AUTO_PROMOTION_RULES[animalType] || [];
}

export function shouldPromoteSex(
  animalType: AnimalType,
  currentSex: string,
  ageInYears: number,
  settings: any
): { shouldPromote: boolean; newSex?: string } {
  const rules = getAutoPromotionRules(animalType);

  for (const rule of rules) {
    if (currentSex === rule.fromSex) {
      const threshold = settings[rule.ageThresholdKey];
      if (ageInYears >= threshold) {
        return { shouldPromote: true, newSex: rule.toSex };
      }
    }
  }

  return { shouldPromote: false };
}
