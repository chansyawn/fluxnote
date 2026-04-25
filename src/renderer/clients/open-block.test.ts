import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const invokeCommandMock = vi.hoisted(() => vi.fn());
const subscribeEventMock = vi.hoisted(() => vi.fn());

vi.mock("@renderer/app/invoke", () => ({
  invokeCommand: invokeCommandMock,
  subscribeEvent: subscribeEventMock,
}));

import {
  acknowledgePendingOpenBlock,
  onOpenBlockRequested,
  readPendingOpenBlock,
} from "@renderer/clients/open-block";

describe("open block client helpers", () => {
  beforeEach(() => {
    invokeCommandMock.mockReset();
    subscribeEventMock.mockReset();
  });

  it("reads and acknowledges pending open block requests through the transport", async () => {
    invokeCommandMock
      .mockResolvedValueOnce({ blockId: "block-1" })
      .mockResolvedValueOnce(undefined);

    await expect(readPendingOpenBlock()).resolves.toEqual({ blockId: "block-1" });
    await acknowledgePendingOpenBlock("block-1");

    expect(invokeCommandMock.mock.calls).toEqual([
      ["openBlockPendingRead", undefined],
      ["openBlockPendingAcknowledge", { blockId: "block-1" }],
    ]);
  });

  it("forwards open block events with their shared payload shape", () => {
    const handler = vi.fn();
    let runtimeHandler: ((payload: { blockId: string }) => void) | undefined;
    const unlisten = vi.fn();
    subscribeEventMock.mockImplementation((key, callback) => {
      if (key === "openBlockRequested") {
        runtimeHandler = callback as (payload: { blockId: string }) => void;
      }
      return unlisten;
    });

    const returnedUnlisten = onOpenBlockRequested(handler);
    if (runtimeHandler) {
      runtimeHandler({ blockId: "block-1" });
    }
    returnedUnlisten();

    expect(handler).toHaveBeenCalledWith({ blockId: "block-1" });
    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
