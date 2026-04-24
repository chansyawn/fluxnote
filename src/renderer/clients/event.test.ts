import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const subscribeEventMock = vi.hoisted(() => vi.fn());

vi.mock("@renderer/app/invoke", () => ({
  subscribeEvent: subscribeEventMock,
}));

import { onAutoArchiveStateChanged, onDeepLinkOpenBlock } from "@renderer/clients/event";

describe("event client helpers", () => {
  beforeEach(() => {
    subscribeEventMock.mockReset();
  });

  it("forwards deep link payloads with their real shared shape", () => {
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

  it("forwards auto-archive payloads and preserves cleanup", () => {
    const handler = vi.fn();
    let runtimeHandler:
      | ((payload: { archivedCount: number; pendingCount: number; windowVisible: boolean }) => void)
      | undefined;
    const unlisten = vi.fn();
    subscribeEventMock.mockImplementation((key, callback) => {
      if (key === "autoArchiveStateChanged") {
        runtimeHandler = callback as typeof runtimeHandler;
      }
      return unlisten;
    });

    const returnedUnlisten = onAutoArchiveStateChanged(handler);
    if (runtimeHandler) {
      runtimeHandler({ archivedCount: 1, pendingCount: 2, windowVisible: false });
    }
    returnedUnlisten();

    expect(handler).toHaveBeenCalledWith({
      archivedCount: 1,
      pendingCount: 2,
      windowVisible: false,
    });
    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
