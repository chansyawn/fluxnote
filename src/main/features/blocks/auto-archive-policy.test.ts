import { describe, expect, it } from "vite-plus/test";

import {
  blockWillAutoArchive,
  createAutoArchiveEvaluationContext,
  fingerprintAutoArchiveCandidateBlockIds,
} from "./auto-archive-policy";

function createContext(overrides: { enabled?: boolean; protectedBlockIds?: Set<string> } = {}) {
  return createAutoArchiveEvaluationContext({
    now: new Date("2026-01-01T12:00:00.000Z"),
    protectedBlockIds: overrides.protectedBlockIds ?? new Set(),
    settings: {
      enabled: overrides.enabled ?? true,
      idleMinutes: 60,
    },
  });
}

describe("auto archive policy", () => {
  it("marks only stale active unprotected blocks as auto-archive candidates", () => {
    const context = createContext({
      protectedBlockIds: new Set(["protected"]),
    });

    expect(
      blockWillAutoArchive(
        { archivedAt: null, contentUpdatedAt: "2026-01-01T10:59:59.999Z", id: "stale" },
        context,
      ),
    ).toBe(true);
    expect(
      blockWillAutoArchive(
        { archivedAt: null, contentUpdatedAt: "2026-01-01T11:00:00.000Z", id: "fresh" },
        context,
      ),
    ).toBe(false);
    expect(
      blockWillAutoArchive(
        {
          archivedAt: "2026-01-01T11:30:00.000Z",
          contentUpdatedAt: "2026-01-01T10:00:00.000Z",
          id: "archived",
        },
        context,
      ),
    ).toBe(false);
    expect(
      blockWillAutoArchive(
        { archivedAt: null, contentUpdatedAt: "2026-01-01T10:00:00.000Z", id: "protected" },
        context,
      ),
    ).toBe(false);
  });

  it("disables all candidates when auto-archive is disabled", () => {
    expect(
      blockWillAutoArchive(
        { archivedAt: null, contentUpdatedAt: "2026-01-01T10:00:00.000Z", id: "stale" },
        createContext({ enabled: false }),
      ),
    ).toBe(false);
  });

  it("builds stable candidate fingerprints independent of query order", () => {
    expect(fingerprintAutoArchiveCandidateBlockIds(["block-b", "block-a"])).toBe(
      fingerprintAutoArchiveCandidateBlockIds(["block-a", "block-b"]),
    );
  });
});
