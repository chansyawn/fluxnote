import { describe, expect, it, vi } from "vite-plus/test";

import { createExternalEditManager } from "./manager";

describe("external edit manager", () => {
  it("tracks sessions and resolves submitted edits via claim", async () => {
    const emitEvent = vi.fn(() => true);
    const manager = createExternalEditManager({ emitEvent });

    const pending = manager.begin("block-1", "draft");

    expect(manager.listSessions()).toEqual([pending.session]);

    const claimed = manager.claim(pending.session.editId);
    claimed.resolve({
      blockId: "block-1",
      content: "submitted",
      status: "submitted",
    });

    await expect(pending.result).resolves.toEqual({
      blockId: "block-1",
      content: "submitted",
      status: "submitted",
    });
    expect(manager.listSessions()).toEqual([]);
    expect(emitEvent).toHaveBeenLastCalledWith("externalEditSessionsChanged", []);
  });

  it("resolves cancelled edits and rejects double claim", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const pending = manager.begin("block-1", "draft");

    const claimed = manager.claim(pending.session.editId);
    claimed.resolve({ blockId: "block-1", status: "cancelled" });

    await expect(pending.result).resolves.toEqual({
      blockId: "block-1",
      status: "cancelled",
    });
    expect(() => manager.claim(pending.session.editId)).toThrow(/External edit not found/);
  });

  it("auto-cancels on abort signal", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const controller = new AbortController();
    const pending = manager.begin("block-1", "draft", { signal: controller.signal });

    controller.abort();

    await expect(pending.result).resolves.toEqual({
      blockId: "block-1",
      status: "cancelled",
    });
    expect(manager.listSessions()).toEqual([]);
  });

  it("ignores abort after session is already claimed", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const controller = new AbortController();
    const pending = manager.begin("block-1", "draft", { signal: controller.signal });

    const claimed = manager.claim(pending.session.editId);
    controller.abort();

    claimed.resolve({ blockId: "block-1", content: "final", status: "submitted" });

    await expect(pending.result).resolves.toEqual({
      blockId: "block-1",
      content: "final",
      status: "submitted",
    });
  });

  it("cancels all pending edits", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const first = manager.begin("block-1", "draft");
    const second = manager.begin("block-2", "draft");

    manager.cancelAll();

    await expect(first.result).resolves.toEqual({
      blockId: "block-1",
      status: "cancelled",
    });
    await expect(second.result).resolves.toEqual({
      blockId: "block-2",
      status: "cancelled",
    });
  });
});
