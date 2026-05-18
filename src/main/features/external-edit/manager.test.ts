import { describe, expect, it, vi } from "vitest";

import { createExternalEditManager } from "./manager";

describe("external-edit manager", () => {
  const trigger = {
    cwd: "/workspace",
    requestedFilePath: "note.md",
    source: "cli" as const,
    targetFilePath: "/workspace/note.md",
  };

  it("begins and claims a session", async () => {
    const emitEvent = vi.fn(() => true);
    const manager = createExternalEditManager({ emitEvent });

    const begun = manager.begin("b1", "original", trigger);
    expect(manager.listSessions()).toEqual([
      expect.objectContaining({
        blockId: "b1",
        editId: begun.session.editId,
        trigger,
      }),
    ]);

    const claimed = manager.claim(begun.session.editId);
    claimed.resolve({ blockId: "b1", content: "next", status: "submitted" });

    await expect(begun.result).resolves.toEqual({
      blockId: "b1",
      content: "next",
      status: "submitted",
    });
    expect(manager.listSessions()).toHaveLength(0);
    expect(emitEvent).toHaveBeenCalled();
  });

  it("throws not found when claim missing session", () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });

    expect(() => manager.claim("missing")).toThrow(/External edit not found/);
  });

  it("cancels all pending sessions", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });

    const one = manager.begin("b1", "a", trigger);
    const two = manager.begin("b2", "b", trigger);
    manager.cancelAll();

    await expect(one.result).resolves.toEqual({ blockId: "b1", status: "cancelled" });
    await expect(two.result).resolves.toEqual({ blockId: "b2", status: "cancelled" });
    expect(manager.listSessions()).toHaveLength(0);
  });

  it("aborts pending session when signal aborts", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const controller = new AbortController();
    const begun = manager.begin("b1", "original", trigger, { signal: controller.signal });

    controller.abort();

    await expect(begun.result).resolves.toEqual({ blockId: "b1", status: "cancelled" });
  });
});
