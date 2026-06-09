import { describe, expect, it, vi } from "vite-plus/test";

import { createExternalEditManager } from "./manager";

describe("external-edit manager", () => {
  const trigger = {
    cwd: "/workspace",
    requestedFilePath: "block.md",
    source: "cli" as const,
    targetFilePath: "/workspace/block.md",
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
    expect(manager.listSessions()).toEqual([
      expect.objectContaining({
        blockId: "b1",
        editId: begun.session.editId,
        trigger,
      }),
    ]);
    let duplicateClaimError: unknown;
    try {
      manager.claim(begun.session.editId);
    } catch (error) {
      duplicateClaimError = error;
    }
    expect(duplicateClaimError).toMatchObject({ code: "BUSINESS.INVALID_OPERATION" });

    claimed.resolve({ blockId: "b1", content: "next", status: "submitted" });

    await expect(begun.result).resolves.toEqual({
      blockId: "b1",
      content: "next",
      status: "submitted",
    });
    expect(manager.listSessions()).toHaveLength(0);
    expect(emitEvent).toHaveBeenCalled();
  });

  it("keeps target handles private while exposing safe claimed methods", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const submit = vi.fn(async () => undefined);
    const cancel = vi.fn();

    const begun = manager.begin("b1", "original", trigger, {
      target: { cancel, submit },
    });

    expect(manager.listSessions()[0]).not.toHaveProperty("target");

    const claimed = manager.claim(begun.session.editId);

    claimed.cancelTarget();
    await claimed.submitTarget("next");

    expect(cancel).toHaveBeenCalledWith(begun.session);
    expect(submit).toHaveBeenCalledWith(begun.session, "next");
    expect(claimed).not.toHaveProperty("target");

    claimed.resolve({ blockId: "b1", content: "next", status: "submitted" });
    await expect(begun.result).resolves.toMatchObject({ status: "submitted" });
  });

  it("keeps claimed session protected when abort signal fires", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const controller = new AbortController();
    const begun = manager.begin("b1", "original", trigger, { signal: controller.signal });
    const claimed = manager.claim(begun.session.editId);

    controller.abort();

    expect(manager.listSessions()).toEqual([
      expect.objectContaining({
        blockId: "b1",
        editId: begun.session.editId,
      }),
    ]);

    claimed.resolve({ blockId: "b1", content: "next", status: "submitted" });

    await expect(begun.result).resolves.toEqual({
      blockId: "b1",
      content: "next",
      status: "submitted",
    });
    expect(manager.listSessions()).toHaveLength(0);
  });

  it("throws not found when claim missing session", () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });

    expect(() => manager.claim("missing")).toThrow(/External edit not found/);
  });

  it("cancels all pending sessions", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const cancel = vi.fn();

    const one = manager.begin("b1", "a", trigger, { target: { cancel } });
    const two = manager.begin("b2", "b", trigger);
    manager.cancelAll();

    await expect(one.result).resolves.toEqual({ blockId: "b1", status: "cancelled" });
    await expect(two.result).resolves.toEqual({ blockId: "b2", status: "cancelled" });
    expect(manager.listSessions()).toHaveLength(0);
    expect(cancel).toHaveBeenCalledWith(one.session);
  });

  it("aborts pending session when signal aborts", async () => {
    const manager = createExternalEditManager({ emitEvent: vi.fn(() => true) });
    const controller = new AbortController();
    const cancel = vi.fn();
    const begun = manager.begin("b1", "original", trigger, {
      signal: controller.signal,
      target: { cancel },
    });

    controller.abort();

    await expect(begun.result).resolves.toEqual({ blockId: "b1", status: "cancelled" });
    expect(cancel).toHaveBeenCalledWith(begun.session);
  });
});
