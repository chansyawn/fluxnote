import { describe, expect, it } from "vitest";

import {
  AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  AUTO_ARCHIVE_MAX_IDLE_MINUTES,
  AUTO_ARCHIVE_MIN_IDLE_MINUTES,
  convertAutoArchiveDurationUnit,
  isAutoArchiveDurationUnit,
  normalizeAutoArchiveIdleMinutes,
  toAutoArchiveDurationViewModel,
  toAutoArchiveIdleMinutes,
} from "./auto-archive";

describe("auto-archive", () => {
  it("should validate duration unit", () => {
    expect(isAutoArchiveDurationUnit("minutes")).toBe(true);
    expect(isAutoArchiveDurationUnit("weeks")).toBe(false);
  });

  it("should normalize idle minutes within bounds", () => {
    expect(normalizeAutoArchiveIdleMinutes(AUTO_ARCHIVE_MIN_IDLE_MINUTES)).toBe(
      AUTO_ARCHIVE_MIN_IDLE_MINUTES,
    );
    expect(normalizeAutoArchiveIdleMinutes(AUTO_ARCHIVE_MAX_IDLE_MINUTES)).toBe(
      AUTO_ARCHIVE_MAX_IDLE_MINUTES,
    );
  });

  it("should fallback to default for invalid idle minutes", () => {
    expect(normalizeAutoArchiveIdleMinutes(0)).toBe(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES);
    expect(normalizeAutoArchiveIdleMinutes(AUTO_ARCHIVE_MAX_IDLE_MINUTES + 1)).toBe(
      AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
    );
    expect(normalizeAutoArchiveIdleMinutes(3.2)).toBe(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES);
    expect(normalizeAutoArchiveIdleMinutes("12")).toBe(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES);
  });

  it("should convert duration to idle minutes when valid", () => {
    expect(toAutoArchiveIdleMinutes({ amount: 10, unit: "minutes" })).toBe(10);
    expect(toAutoArchiveIdleMinutes({ amount: 2, unit: "hours" })).toBe(120);
    expect(toAutoArchiveIdleMinutes({ amount: 1, unit: "days" })).toBe(24 * 60);
  });

  it("should return null for invalid duration", () => {
    expect(toAutoArchiveIdleMinutes({ amount: 0, unit: "minutes" })).toBeNull();
    expect(toAutoArchiveIdleMinutes({ amount: 1.5, unit: "hours" })).toBeNull();
    expect(toAutoArchiveIdleMinutes({ amount: 15, unit: "days" })).toBeNull();
  });

  it("should map idle minutes to best duration unit", () => {
    expect(toAutoArchiveDurationViewModel(2 * 24 * 60)).toEqual({ amount: 2, unit: "days" });
    expect(toAutoArchiveDurationViewModel(3 * 60)).toEqual({ amount: 3, unit: "hours" });
    expect(toAutoArchiveDurationViewModel(125)).toEqual({ amount: 125, unit: "minutes" });
  });

  it("should prefer requested duration unit when exact", () => {
    expect(toAutoArchiveDurationViewModel(60, "minutes")).toEqual({
      amount: 60,
      unit: "minutes",
    });
    expect(toAutoArchiveDurationViewModel(24 * 60, "hours")).toEqual({
      amount: 24,
      unit: "hours",
    });
  });

  it("should fallback to best duration unit when requested unit is inexact", () => {
    expect(toAutoArchiveDurationViewModel(90, "hours")).toEqual({
      amount: 90,
      unit: "minutes",
    });
  });

  it("should convert idle minutes to target unit with ceil", () => {
    expect(convertAutoArchiveDurationUnit(130, "hours")).toEqual({ amount: 3, unit: "hours" });
    expect(convertAutoArchiveDurationUnit(130, "days")).toEqual({ amount: 1, unit: "days" });
    expect(convertAutoArchiveDurationUnit(130, "minutes")).toEqual({
      amount: 130,
      unit: "minutes",
    });
  });
});
