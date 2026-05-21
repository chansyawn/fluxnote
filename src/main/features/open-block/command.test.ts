import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { registerOpenBlockCommands } from "./command";

describe("open-block command", () => {
  const handlers = new Map<string, (input: any) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: any) => unknown) => handlers.set(name, handler)),
  };
  const openBlockService = {
    acknowledgePending: vi.fn(),
    emitPending: vi.fn(),
    readPending: vi.fn(),
    requestOpen: vi.fn(),
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(openBlockService).forEach((fn) => fn.mockReset());
  });

  it("dispatches acknowledge and read commands", () => {
    openBlockService.readPending.mockReturnValue({ target: { blockId: "b1" } });
    registerOpenBlockCommands(ipc as never, { openBlockService } as never);

    const ackResult = handlers.get("open-block.acknowledge-pending")?.({ blockId: "b1" });
    const readResult = handlers.get("open-block.read-pending")?.({});

    expect(openBlockService.acknowledgePending).toHaveBeenCalledWith("b1");
    expect(ackResult).toBeUndefined();
    expect(readResult).toEqual({ target: { blockId: "b1" } });
  });
});
