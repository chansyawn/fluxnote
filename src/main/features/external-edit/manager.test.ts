import { describe, expect, it, vi } from "vitest";

import { createExternalEditManager } from "./manager";

describe("external-edit manager", () => {
  it("begins and claims a session", async () => {
    const emitEvent = vi.fn(() => true);
    const manager = createExternalEditManager({ emitEvent });

    const begun = manager.begin("b1", "original");
    expect(manager.listSessions()).toHaveLength(1);

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

    expect(() => manager.claim("missing")).toThrowError(/External edit not found/);
  });

  it("cancels all pending sessions", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });

    const one = manager.begin("b1", "a");
    const two = manager.begin("b2", "b");
    manager.cancelAll();

    await expect(one.result).resolves.toEqual({ blockId: "b1", status: "cancelled" });
    await expect(two.result).resolves.toEqual({ blockId: "b2", status: "cancelled" });
    expect(manager.listSessions()).toHaveLength(0);
  });

  it("aborts pending session when signal aborts", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const controller = new AbortController();
    const begun = manager.begin("b1", "original", { signal: controller.signal });

    controller.abort();

    await expect(begun.result).resolves.toEqual({ blockId: "b1", status: "cancelled" });
  });
});
