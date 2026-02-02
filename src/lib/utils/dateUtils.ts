export function nowUTC(): Date {
  return new Date();
}

export function parseUTC(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    return new Date(dateString);
  } catch {
    return null;
  }
}

export function isDateAfter(date1: Date | string | null | undefined, date2: Date | string | null | undefined): boolean {
  if (!date1 || !date2) return false;
  const d1 = typeof date1 === 'string' ? parseUTC(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseUTC(date2) : date2;
  if (!d1 || !d2) return false;
  return d1.getTime() > d2.getTime();
}

export function isDateBefore(date1: Date | string | null | undefined, date2: Date | string | null | undefined): boolean {
  if (!date1 || !date2) return false;
  const d1 = typeof date1 === 'string' ? parseUTC(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseUTC(date2) : date2;
  if (!d1 || !d2) return false;
  return d1.getTime() < d2.getTime();
}

export function checkTrialActive(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  const endDate = parseUTC(trialEndsAt);
  if (!endDate) return false;
  return isDateAfter(endDate, nowUTC());
}

export function calculateDaysRemaining(endDate: string | null | undefined): number {
  if (!endDate) return 0;
  const end = parseUTC(endDate);
  if (!end) return 0;
  const now = nowUTC();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  return Math.max(0, diffDays);
}

export function validateTrialDates(
  trialStartedAt: string | null | undefined,
  trialEndsAt: string | null | undefined
): boolean {
  if (!trialStartedAt || !trialEndsAt) return false;
  const start = parseUTC(trialStartedAt);
  const end = parseUTC(trialEndsAt);
  if (!start || !end) return false;
  return start.getTime() < end.getTime();
}
