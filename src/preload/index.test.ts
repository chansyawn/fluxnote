import { DEFAULT_SETTINGS } from "@shared/features/preferences/settings";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const electronMock = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  removeListener: vi.fn(),
  on: vi.fn(),
}));

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: electronMock.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMock.invoke,
    removeListener: electronMock.removeListener,
    on: electronMock.on,
  },
}));

describe("preload runtime", () => {
  beforeEach(async () => {
    vi.resetModules();
    electronMock.exposeInMainWorld.mockClear();
    electronMock.invoke.mockReset();
    electronMock.on.mockReset();
    electronMock.removeListener.mockReset();
    await import("@preload/index");
  });

  function getRuntime() {
    return electronMock.exposeInMainWorld.mock.calls[0]?.[1] as {
      command: (name: string, input: unknown) => Promise<unknown>;
      on: (name: string, listener: (payload: unknown) => void) => () => void;
    };
  }

  it("returns data from successful command invocations", async () => {
    electronMock.invoke.mockResolvedValue({
      ok: true,
      data: DEFAULT_SETTINGS,
    });

    const result = await getRuntime().command("preferences.read", undefined);

    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(electronMock.invoke).toHaveBeenCalledWith("preferences.read", undefined);
  });

  it("throws payload errors from failed command invocations", async () => {
    electronMock.invoke.mockResolvedValue({
      ok: false,
      error: {
        code: "BUSINESS.NOT_FOUND",
        message: "Missing",
      },
    });

    await expect(getRuntime().command("window.destroy", undefined)).rejects.toMatchObject({
      code: "BUSINESS.NOT_FOUND",
      message: "Missing",
    });
  });

  it("subscribes and unsubscribes with the event key", () => {
    const handler = vi.fn();
    let listener: ((_event: unknown, payload: unknown) => void) | undefined;
    electronMock.on.mockImplementation((_channel, nextListener) => {
      listener = nextListener as (_event: unknown, payload: unknown) => void;
    });

    const off = getRuntime().on("openBlock.requested", handler);
    listener?.({}, { blockId: "block-1" });
    off();

    expect(handler).toHaveBeenCalledWith({ blockId: "block-1" });
    expect(electronMock.removeListener).toHaveBeenCalledTimes(1);
  });
});
