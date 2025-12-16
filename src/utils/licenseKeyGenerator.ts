export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const year = new Date().getFullYear();

  const randomSegment = (length: number): string => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return `HERD-${year}-${randomSegment(4)}-${randomSegment(4)}`;
}

export function validateLicenseKeyFormat(key: string): boolean {
  const pattern = /^HERD-\d{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
  return pattern.test(key);
}
