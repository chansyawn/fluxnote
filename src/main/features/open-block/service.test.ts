import { describe, expect, it, vi } from "vite-plus/test";

import { createOpenBlockService } from "./service";

describe("open-block service", () => {
  it("stores pending block and emits request", () => {
    const emitEvent = vi.fn(() => true);
    const showWindow = vi.fn();
    const service = createOpenBlockService({ emitEvent, showWindow });
    const target = { blockId: "block-1" };

    const requested = service.requestOpen(target);

    expect(requested).toBe(true);
    expect(showWindow).toHaveBeenCalledTimes(1);
    expect(service.readPending()).toEqual({ target });
    expect(emitEvent).toHaveBeenCalledWith("open-block.requested", target);
  });

  it("acknowledges pending when block id matches", () => {
    const service = createOpenBlockService({ emitEvent: vi.fn(() => true), showWindow: vi.fn() });
    service.requestOpen({ blockId: "block-1" });

    service.acknowledgePending("block-1");

    expect(service.readPending()).toEqual({ target: null });
  });

  it("emitPending returns false when no pending request", () => {
    const service = createOpenBlockService({ emitEvent: vi.fn(() => true), showWindow: vi.fn() });

    expect(service.emitPending()).toBe(false);
  });
});
