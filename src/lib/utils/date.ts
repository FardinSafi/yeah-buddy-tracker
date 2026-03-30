export function getStartOfWeek(date = new Date()): Date {
  const start = new Date(date);
  const day = start.getDay();
  const mondayOffset = (day + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfWeek(date = new Date()): Date {
  const end = getStartOfWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getWeekKey(date = new Date()): string {
  const start = getStartOfWeek(date);
  const yearStart = new Date(start.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((start.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${start.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function getWeekRange(date = new Date()): { start: Date; end: Date } {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getRecentWeekKeys(weekCount: number, fromDate = new Date()): string[] {
  const safeCount = Math.max(1, Math.floor(weekCount));
  const start = getStartOfWeek(fromDate);

  return Array.from({ length: safeCount }, (_, index) => {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() - (safeCount - index - 1) * 7);
    return getWeekKey(cursor);
  });
}

export function getRangeIsoForRecentWeeks(
  weekCount: number,
  fromDate = new Date(),
): { startIso: string; endIso: string } {
  const safeCount = Math.max(1, Math.floor(weekCount));
  const thisWeekStart = getStartOfWeek(fromDate);
  const start = new Date(thisWeekStart);
  start.setDate(start.getDate() - (safeCount - 1) * 7);

  const end = new Date(fromDate);
  end.setHours(23, 59, 59, 999);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function toIsoDayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function isDateInCurrentWeek(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date >= getStartOfWeek(now) && date <= getEndOfWeek(now);
}
