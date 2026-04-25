import type { FluxnoteRuntime } from "@shared/electron-runtime";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const electronMock = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
}));

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: electronMock.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMock.invoke,
    off: electronMock.off,
    on: electronMock.on,
  },
}));

describe("preload runtime", () => {
  beforeEach(async () => {
    vi.resetModules();
    electronMock.exposeInMainWorld.mockClear();
    electronMock.invoke.mockReset();
    electronMock.on.mockReset();
    electronMock.off.mockReset();
    await import("@preload/index");
  });

  function getRuntime(): FluxnoteRuntime {
    return electronMock.exposeInMainWorld.mock.calls[0]?.[1] as FluxnoteRuntime;
  }

  it("validates invoke responses against the shared command contract", async () => {
    electronMock.invoke.mockResolvedValue({
      ok: true,
      data: { message: "Hello FluxNote" },
    });

    const result = await getRuntime().invoke("sampleGreet", { name: "FluxNote" });

    expect(result).toEqual({ message: "Hello FluxNote" });
  });

  it("drops invalid event payloads before invoking listeners", () => {
    const handler = vi.fn();
    electronMock.on.mockImplementation((_channel, listener) => {
      listener({}, { wrong: true });
    });

    getRuntime().subscribe("openBlockRequested", handler);

    expect(handler).not.toHaveBeenCalled();
  });
});
