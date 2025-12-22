export function printReport(elementId: string) {
  const printContents = document.getElementById(elementId);
  if (!printContents) return;

  const originalContents = document.body.innerHTML;
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Please allow popups to print reports');
    return;
  }

  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Report</title>
        <style>
          ${styles}
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printContents.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

export function downloadPDF(elementId: string, filename: string) {
  printReport(elementId);
}

export function formatDateForDisplay(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'Unknown';
  const birth = new Date(birthDate);
  const today = new Date();
  const ageInYears = (today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (ageInYears < 1) {
    const months = Math.floor(ageInYears * 12);
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  const years = Math.floor(ageInYears);
  return `${years} year${years !== 1 ? 's' : ''}`;
}

export function getTodayLocalDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
