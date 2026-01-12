export const WEEK_START_YEAR = 2025;
export const WEEK_START_MONTH = 11;
export const WEEK_START_DAY = 3;

function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeapYear ? 29 : 28;
  }
  return daysPerMonth[month - 1];
}

function dateToAbsoluteDays(year: number, month: number, day: number): number {
  let days = 0;
  for (let y = 1; y < year; y++) {
    const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    days += isLeapYear ? 366 : 365;
  }
  for (let m = 1; m < month; m++) {
    days += getDaysInMonth(year, m);
  }
  days += day;
  return days;
}

function absoluteDaysToDate(absoluteDays: number): { year: number; month: number; day: number } {
  let remainingDays = absoluteDays;
  let year = 1;
  
  while (true) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;
    if (remainingDays <= daysInYear) break;
    remainingDays -= daysInYear;
    year++;
  }
  
  let month = 1;
  while (true) {
    const daysInMonth = getDaysInMonth(year, month);
    if (remainingDays <= daysInMonth) break;
    remainingDays -= daysInMonth;
    month++;
  }
  
  return { year, month, day: remainingDays };
}

const WEEK_START_ABSOLUTE_DAYS = dateToAbsoluteDays(WEEK_START_YEAR, WEEK_START_MONTH, WEEK_START_DAY);

export function getWeekNumber(dateStr: string): number {
  const { year, month, day } = parseDateString(dateStr);
  const dateDays = dateToAbsoluteDays(year, month, day);
  const diffDays = dateDays - WEEK_START_ABSOLUTE_DAYS;
  
  if (diffDays < 0) {
    return Math.floor(diffDays / 7);
  }
  
  return Math.floor(diffDays / 7) + 1;
}

export function getWeekDateRange(weekNumber: number): { start: Date; end: Date; startStr: string; endStr: string } {
  const daysOffset = (weekNumber - 1) * 7;
  const startAbsoluteDays = WEEK_START_ABSOLUTE_DAYS + daysOffset;
  const endAbsoluteDays = startAbsoluteDays + 6;
  
  const startDate = absoluteDaysToDate(startAbsoluteDays);
  const endDate = absoluteDaysToDate(endAbsoluteDays);
  
  const startStr = formatDateString(startDate.year, startDate.month, startDate.day);
  const endStr = formatDateString(endDate.year, endDate.month, endDate.day);
  
  return {
    start: new Date(startDate.year, startDate.month - 1, startDate.day),
    end: new Date(endDate.year, endDate.month - 1, endDate.day),
    startStr,
    endStr,
  };
}

export function formatDateSpanish(date: Date): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateInWeek(dateStr: string, weekNumber: number): boolean {
  const { startStr, endStr } = getWeekDateRange(weekNumber);
  return dateStr >= startStr && dateStr <= endStr;
}

export function getCurrentWeekNumber(): number {
  const now = new Date();
  const dateStr = formatDateISO(now);
  return getWeekNumber(dateStr);
}

export function getAvailableWeeks(): number[] {
  const weeks: number[] = [];
  const currentWeek = getCurrentWeekNumber();
  const maxWeeks = Math.max(currentWeek + 4, 20);
  for (let i = 1; i <= maxWeeks; i++) {
    weeks.push(i);
  }
  return weeks;
}
