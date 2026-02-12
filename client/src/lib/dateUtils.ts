export function formatDateForDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value).trim();
  const ddmmMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (ddmmMatch) {
    const [, dd, mm, yy] = ddmmMatch;
    return `${dd}/${mm}/${yy.length > 2 ? yy.slice(-2) : yy}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year.slice(-2)}`;
  }
  return str;
}

export function isValidDate(dd: number, mm: number, aa: number): boolean {
  const fullYear = aa <= 99 ? (aa > 50 ? 1900 + aa : 2000 + aa) : aa;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  const testDate = new Date(fullYear, mm - 1, dd);
  return (
    testDate.getFullYear() === fullYear &&
    testDate.getMonth() === mm - 1 &&
    testDate.getDate() === dd
  );
}

export function parseDateComponents(dateStr: string): { day: number; month: number; year: number } | null {
  const str = dateStr.trim();
  const isoParts = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoParts) {
    return { year: parseInt(isoParts[1]), month: parseInt(isoParts[2]), day: parseInt(isoParts[3]) };
  }
  const ddmmParts = str.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (ddmmParts) {
    const yy = parseInt(ddmmParts[3]);
    const year = ddmmParts[3].length <= 2 ? (yy > 50 ? 1900 + yy : 2000 + yy) : yy;
    return { day: parseInt(ddmmParts[1]), month: parseInt(ddmmParts[2]), year };
  }
  return null;
}

export function validateDateString(dateStr: string): boolean {
  const parts = parseDateComponents(dateStr);
  if (!parts) return false;
  return isValidDate(parts.day, parts.month, parts.year);
}
