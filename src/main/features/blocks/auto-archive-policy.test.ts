import { describe, expect, it } from "vitest";

import {
  blockWillAutoArchive,
  createAutoArchiveEvaluationContext,
  fingerprintAutoArchiveCandidateBlockIds,
  resolveAutoArchiveSettings,
} from "./auto-archive-policy";

describe("auto-archive policy", () => {
  it("resolves settings and falls back on error", async () => {
    const ok = await resolveAutoArchiveSettings(async () => ({ enabled: false, idleMinutes: 5 }));
    const fallback = await resolveAutoArchiveSettings(async () => {
      throw new Error("boom");
    });

    expect(ok).toEqual({ enabled: false, idleMinutes: 5 });
    expect(fallback.enabled).toBe(true);
  });

  it("builds evaluation context for enabled and disabled", () => {
    const now = new Date("2026-01-01T00:10:00.000Z");
    const enabled = createAutoArchiveEvaluationContext({
      now,
      protectedBlockIds: new Set(["b1"]),
      settings: { enabled: true, idleMinutes: 5 },
    });
    const disabled = createAutoArchiveEvaluationContext({
      now,
      protectedBlockIds: new Set(["b1"]),
      settings: { enabled: false, idleMinutes: 5 },
    });

    expect(enabled.cutoffIso).toBe("2026-01-01T00:05:00.000Z");
    expect(disabled.cutoffIso).toBeNull();
  });

  it("evaluates auto archive conditions", () => {
    const context = {
      cutoffIso: "2026-01-01T00:05:00.000Z",
      protectedBlockIds: new Set(["protected"]),
    };

    expect(
      blockWillAutoArchive(
        { archivedAt: null, contentUpdatedAt: "2026-01-01T00:00:00.000Z", id: "b1", isKept: false },
        context,
      ),
    ).toBe(true);
    expect(
      blockWillAutoArchive(
        {
          archivedAt: "2026-01-01T00:09:00.000Z",
          contentUpdatedAt: "2026-01-01T00:00:00.000Z",
          id: "b1",
          isKept: false,
        },
        context,
      ),
    ).toBe(false);
    expect(
      blockWillAutoArchive(
        {
          archivedAt: null,
          contentUpdatedAt: "2026-01-01T00:06:00.000Z",
          id: "b1",
          isKept: false,
        },
        context,
      ),
    ).toBe(false);
    expect(
      blockWillAutoArchive(
        {
          archivedAt: null,
          contentUpdatedAt: "2026-01-01T00:00:00.000Z",
          id: "protected",
          isKept: false,
        },
        context,
      ),
    ).toBe(false);
    expect(
      blockWillAutoArchive(
        {
          archivedAt: null,
          contentUpdatedAt: "2026-01-01T00:00:00.000Z",
          id: "b1",
          isKept: true,
        },
        context,
      ),
    ).toBe(false);
  });

  it("fingerprints candidate ids in sorted order", () => {
    expect(fingerprintAutoArchiveCandidateBlockIds(["b2", "b1"])).toBe("b1\u0000b2");
  });
});
