import { DEFAULT_USER_PREFERENCES } from "@shared/features/preferences/user-preferences";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  createAutoArchiveEvaluationContext: vi.fn(() => ({
    cutoffIso: "2026-01-01T00:00:00.000Z",
    protectedBlockIds: new Set<string>(),
  })),
  fingerprintAutoArchiveCandidateBlockIds: vi.fn((ids: string[]) => ids.join("|")),
  listAutoArchiveCandidateBlockIds: vi.fn(),
  resolveAutoArchivePreferences: vi.fn(),
}));

vi.mock("./auto-archive-policy", () => mocks);

import { createAutoArchiveRuntime, deriveScanIntervalSeconds } from "./auto-archive-runtime";

describe("auto-archive runtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.createAutoArchiveEvaluationContext.mockClear();
    mocks.fingerprintAutoArchiveCandidateBlockIds.mockClear();
    mocks.listAutoArchiveCandidateBlockIds.mockReset();
    mocks.resolveAutoArchivePreferences.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("derives scan interval with min/max clamp", () => {
    expect(deriveScanIntervalSeconds(1)).toBe(30);
    expect(deriveScanIntervalSeconds(10)).toBe(60);
    expect(deriveScanIntervalSeconds(1000)).toBe(900);
  });

  it("emits pending state when enabled and no force archive", async () => {
    mocks.resolveAutoArchivePreferences.mockResolvedValue({ enabled: true, idleMinutes: 10 });
    mocks.listAutoArchiveCandidateBlockIds.mockResolvedValue(["b1", "b2"]);

    const emitEvent = vi.fn(() => true);
    const runtime = createAutoArchiveRuntime({
      emitEvent,
      getWindowVisible: () => true,
      getDb: () => ({ update: vi.fn() }) as never,
      readUserPreferences: async () => ({
        ...DEFAULT_USER_PREFERENCES,
        autoArchive: { enabled: true, idleMinutes: 10 },
      }),
    });

    await runtime.start();

    expect(emitEvent).toHaveBeenCalledWith("blocks.auto-archive-state-changed", {
      archivedCount: 0,
      pendingCount: 2,
      windowVisible: true,
    });

    runtime.stop();
  });

  it("archives when hidden and force trigger is true", async () => {
    mocks.resolveAutoArchivePreferences.mockResolvedValue({ enabled: true, idleMinutes: 10 });
    mocks.listAutoArchiveCandidateBlockIds
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["b1", "b2"])
      .mockResolvedValueOnce([]);

    const run = vi.fn(async () => ({ changes: 2 }));
    const set = vi.fn(() => ({ where: () => ({ run }) }));
    const update = vi.fn(() => ({ set }));
    const emitEvent = vi.fn(() => true);

    const runtime = createAutoArchiveRuntime({
      emitEvent,
      getWindowVisible: () => false,
      getDb: () => ({ update }) as never,
      readUserPreferences: async () => ({
        ...DEFAULT_USER_PREFERENCES,
        autoArchive: { enabled: true, idleMinutes: 10 },
      }),
    });

    await runtime.start();
    await runtime.trigger(true);

    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({
      archivedAt: expect.any(String),
      isPinned: false,
    });
    expect(emitEvent).toHaveBeenLastCalledWith("blocks.auto-archive-state-changed", {
      archivedCount: 2,
      pendingCount: 0,
      windowVisible: false,
    });

    runtime.stop();
  });

  it("emits zero state when auto archive disabled", async () => {
    mocks.resolveAutoArchivePreferences.mockResolvedValue({ enabled: false, idleMinutes: 10 });

    const emitEvent = vi.fn(() => true);
    const runtime = createAutoArchiveRuntime({
      emitEvent,
      getWindowVisible: () => false,
      getDb: () => ({ update: vi.fn() }) as never,
      readUserPreferences: async () => ({
        ...DEFAULT_USER_PREFERENCES,
        autoArchive: { enabled: false, idleMinutes: 10 },
      }),
    });

    await runtime.start();

    expect(emitEvent).toHaveBeenCalledWith("blocks.auto-archive-state-changed", {
      archivedCount: 0,
      pendingCount: 0,
      windowVisible: false,
    });

    runtime.stop();
  });

  it("refreshes pending state without archiving", async () => {
    mocks.resolveAutoArchivePreferences.mockResolvedValue({ enabled: true, idleMinutes: 10 });
    mocks.listAutoArchiveCandidateBlockIds.mockResolvedValue(["b1"]);

    const update = vi.fn();
    const emitEvent = vi.fn(() => true);
    const runtime = createAutoArchiveRuntime({
      emitEvent,
      getWindowVisible: () => false,
      getDb: () => ({ update }) as never,
      readUserPreferences: async () => ({
        ...DEFAULT_USER_PREFERENCES,
        autoArchive: { enabled: true, idleMinutes: 10 },
      }),
    });

    await runtime.start();
    await runtime.refreshState();

    expect(update).not.toHaveBeenCalled();
    expect(emitEvent).toHaveBeenLastCalledWith("blocks.auto-archive-state-changed", {
      archivedCount: 0,
      pendingCount: 1,
      windowVisible: false,
    });

    runtime.stop();
  });
});
