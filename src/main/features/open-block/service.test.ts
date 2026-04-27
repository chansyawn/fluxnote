import { createOpenBlockService } from "@main/features/open-block/service";
import { describe, expect, it, vi } from "vite-plus/test";

function createTestHandler() {
  const emitEvent = vi.fn(() => true);
  const showWindow = vi.fn();
  const command = createOpenBlockService({ emitEvent, showWindow });

  return { emitEvent, command, showWindow };
}

describe("open block command", () => {
  it("keeps pending block id after emit until acknowledged", () => {
    const { emitEvent, command, showWindow } = createTestHandler();

    expect(command.requestOpen("block-1")).toBe(true);

    expect(showWindow).toHaveBeenCalledTimes(1);
    expect(emitEvent).toHaveBeenCalledWith("openBlockRequested", { blockId: "block-1" });
    expect(command.readPending()).toEqual({ blockId: "block-1" });

    command.acknowledgePending("block-1");

    expect(command.readPending()).toEqual({ blockId: null });
  });

  it("does not clear pending block id for nonmatching acknowledgements", () => {
    const { command } = createTestHandler();

    command.requestOpen("block-1");
    command.acknowledgePending("block-2");

    expect(command.readPending()).toEqual({ blockId: "block-1" });
  });

  it("overwrites pending block id with newer requests", () => {
    const { command } = createTestHandler();

    command.requestOpen("block-1");
    command.requestOpen("block-2");

    expect(command.readPending()).toEqual({ blockId: "block-2" });
  });
});
