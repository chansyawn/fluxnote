import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const invokeCommandMock = vi.hoisted(() => vi.fn());
const subscribeEventMock = vi.hoisted(() => vi.fn());

vi.mock("@renderer/app/invoke", () => ({
  invokeCommand: invokeCommandMock,
  subscribeEvent: subscribeEventMock,
}));

import {
  acknowledgePendingDeepLink,
  onDeepLinkOpenBlock,
  readPendingDeepLink,
} from "@renderer/clients/deep-link";

describe("deep link client helpers", () => {
  beforeEach(() => {
    invokeCommandMock.mockReset();
    subscribeEventMock.mockReset();
  });

  it("reads and acknowledges pending deep links through the transport", async () => {
    invokeCommandMock
      .mockResolvedValueOnce({ blockId: "block-1" })
      .mockResolvedValueOnce(undefined);

    await expect(readPendingDeepLink()).resolves.toEqual({ blockId: "block-1" });
    await acknowledgePendingDeepLink("block-1");

    expect(invokeCommandMock.mock.calls).toEqual([
      ["deepLinkPendingRead", undefined],
      ["deepLinkPendingAcknowledge", { blockId: "block-1" }],
    ]);
  });

  it("forwards deep link events with their shared payload shape", () => {
    const handler = vi.fn();
    let runtimeHandler: ((payload: { blockId: string }) => void) | undefined;
    const unlisten = vi.fn();
    subscribeEventMock.mockImplementation((key, callback) => {
      if (key === "deepLinkOpenBlock") {
        runtimeHandler = callback as (payload: { blockId: string }) => void;
      }
      return unlisten;
    });

    const returnedUnlisten = onDeepLinkOpenBlock(handler);
    if (runtimeHandler) {
      runtimeHandler({ blockId: "block-1" });
    }
    returnedUnlisten();

    expect(handler).toHaveBeenCalledWith({ blockId: "block-1" });
    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
