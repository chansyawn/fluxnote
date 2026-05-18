export const AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES = 3 * 24 * 60;
export const AUTO_ARCHIVE_MIN_IDLE_MINUTES = 1;
export const AUTO_ARCHIVE_MAX_IDLE_MINUTES = 14 * 24 * 60;

export const AUTO_ARCHIVE_DURATION_UNITS = ["minutes", "hours", "days"] as const;
export type AutoArchiveDurationUnit = (typeof AUTO_ARCHIVE_DURATION_UNITS)[number];

export interface AutoArchiveDuration {
  amount: number;
  unit: AutoArchiveDurationUnit;
}

const UNIT_TO_MINUTES: Record<AutoArchiveDurationUnit, number> = {
  days: 24 * 60,
  hours: 60,
  minutes: 1,
};

export function isAutoArchiveDurationUnit(value: string): value is AutoArchiveDurationUnit {
  return AUTO_ARCHIVE_DURATION_UNITS.some((unit) => unit === value);
}

export function normalizeAutoArchiveIdleMinutes(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= AUTO_ARCHIVE_MIN_IDLE_MINUTES &&
    value <= AUTO_ARCHIVE_MAX_IDLE_MINUTES
  ) {
    return value;
  }

  return AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES;
}

export function toAutoArchiveIdleMinutes(duration: AutoArchiveDuration): number | null {
  if (!Number.isInteger(duration.amount) || duration.amount <= 0) {
    return null;
  }

  const idleMinutes = duration.amount * UNIT_TO_MINUTES[duration.unit];
  if (idleMinutes < AUTO_ARCHIVE_MIN_IDLE_MINUTES || idleMinutes > AUTO_ARCHIVE_MAX_IDLE_MINUTES) {
    return null;
  }

  return idleMinutes;
}

export function toAutoArchiveDurationViewModel(idleMinutes: unknown): AutoArchiveDuration {
  const normalizedIdleMinutes = normalizeAutoArchiveIdleMinutes(idleMinutes);

  if (normalizedIdleMinutes % UNIT_TO_MINUTES.days === 0) {
    return {
      amount: normalizedIdleMinutes / UNIT_TO_MINUTES.days,
      unit: "days",
    };
  }

  if (normalizedIdleMinutes % UNIT_TO_MINUTES.hours === 0) {
    return {
      amount: normalizedIdleMinutes / UNIT_TO_MINUTES.hours,
      unit: "hours",
    };
  }

  return {
    amount: normalizedIdleMinutes,
    unit: "minutes",
  };
}

export function convertAutoArchiveDurationUnit(
  idleMinutes: unknown,
  unit: AutoArchiveDurationUnit,
): AutoArchiveDuration {
  const normalizedIdleMinutes = normalizeAutoArchiveIdleMinutes(idleMinutes);
  const amount = Math.ceil(normalizedIdleMinutes / UNIT_TO_MINUTES[unit]);

  return {
    amount,
    unit,
  };
}
