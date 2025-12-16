import type { Database } from '../lib/database.types';

type Ranch = Database['public']['Tables']['ranches']['Row'];

export type LicenseStatus =
  | 'valid'
  | 'grace_period'
  | 'expired'
  | 'no_license';

export interface LicenseInfo {
  status: LicenseStatus;
  isReadOnly: boolean;
  daysUntilExpiration: number | null;
  daysInGracePeriod: number | null;
  licenseType: 'full' | 'demo' | null;
  expirationDate: string | null;
  maxAnimals: number | null;
}

const GRACE_PERIOD_DAYS = 30;

export function checkLicenseStatus(ranch: Ranch | null): LicenseInfo {
  if (!ranch || !ranch.license_expiration) {
    return {
      status: 'no_license',
      isReadOnly: true,
      daysUntilExpiration: null,
      daysInGracePeriod: null,
      licenseType: null,
      expirationDate: null,
      maxAnimals: null,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expirationDate = new Date(ranch.license_expiration);
  expirationDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff >= 0) {
    return {
      status: 'valid',
      isReadOnly: false,
      daysUntilExpiration: daysDiff,
      daysInGracePeriod: null,
      licenseType: ranch.license_type,
      expirationDate: ranch.license_expiration,
      maxAnimals: ranch.max_animals ?? null,
    };
  }

  const daysExpired = Math.abs(daysDiff);

  if (daysExpired <= GRACE_PERIOD_DAYS) {
    return {
      status: 'grace_period',
      isReadOnly: false,
      daysUntilExpiration: null,
      daysInGracePeriod: daysExpired,
      licenseType: ranch.license_type,
      expirationDate: ranch.license_expiration,
      maxAnimals: ranch.max_animals ?? null,
    };
  }

  return {
    status: 'expired',
    isReadOnly: true,
    daysUntilExpiration: null,
    daysInGracePeriod: null,
    licenseType: ranch.license_type,
    expirationDate: ranch.license_expiration,
    maxAnimals: ranch.max_animals ?? null,
  };
}

export function canAddAnimal(licenseInfo: LicenseInfo, currentAnimalCount: number): boolean {
  if (licenseInfo.status === 'no_license' || licenseInfo.status === 'expired') {
    return false;
  }

  if (licenseInfo.maxAnimals !== null && currentAnimalCount >= licenseInfo.maxAnimals) {
    return false;
  }

  return true;
}

export function getLicenseMessage(licenseInfo: LicenseInfo, currentAnimalCount: number): string | null {
  if (licenseInfo.status === 'no_license') {
    return 'No active license. Please activate a license to add animals.';
  }

  if (licenseInfo.status === 'expired') {
    return 'License expired. Please renew your license to add animals.';
  }

  if (licenseInfo.maxAnimals !== null && currentAnimalCount >= licenseInfo.maxAnimals) {
    return `Animal limit reached (${licenseInfo.maxAnimals} animals). Please upgrade your license to add more animals.`;
  }

  return null;
}
