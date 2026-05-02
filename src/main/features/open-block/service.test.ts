import { describe, expect, it, vi } from "vitest";

import { createOpenBlockService } from "./service";

describe("open-block service", () => {
  it("stores pending block and emits request", () => {
    const emitEvent = vi.fn(() => true);
    const showWindow = vi.fn();
    const service = createOpenBlockService({ emitEvent, showWindow });

    const requested = service.requestOpen("block-1");

    expect(requested).toBe(true);
    expect(showWindow).toHaveBeenCalledTimes(1);
    expect(service.readPending()).toEqual({ blockId: "block-1" });
    expect(emitEvent).toHaveBeenCalledWith("open-block.requested", { blockId: "block-1" });
  });

  it("acknowledges pending when block id matches", () => {
    const service = createOpenBlockService({ emitEvent: vi.fn(() => true), showWindow: vi.fn() });
    service.requestOpen("block-1");

    service.acknowledgePending("block-1");

    expect(service.readPending()).toEqual({ blockId: null });
  });

  it("emitPending returns false when no pending request", () => {
    const service = createOpenBlockService({ emitEvent: vi.fn(() => true), showWindow: vi.fn() });

    expect(service.emitPending()).toBe(false);
  });
});
