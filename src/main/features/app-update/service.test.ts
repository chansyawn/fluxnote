import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;
  const listeners = new Map<string, Listener[]>();
  const updater = {
    emit: (name: string, ...args: unknown[]) => {
      for (const listener of listeners.get(name) ?? []) {
        listener(...args);
      }
      return (listeners.get(name)?.length ?? 0) > 0;
    },
    on: (name: string, listener: Listener) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
      return updater;
    },
    removeAllListeners: () => {
      listeners.clear();
      return updater;
    },
  };

  return {
    app: {
      getVersion: vi.fn(() => "1.0.0"),
      isPackaged: true,
    },
    autoUpdater: {
      ...updater,
      checkForUpdates: vi.fn(),
      quitAndInstall: vi.fn(),
      setFeedURL: vi.fn(),
    },
  };
});

vi.mock("electron", () => ({
  app: mocks.app,
  autoUpdater: mocks.autoUpdater,
}));

import { createAppUpdateService } from "./service";

describe("app update service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.autoUpdater.removeAllListeners();
    mocks.app.getVersion.mockReturnValue("1.0.0");
    mocks.app.isPackaged = true;
  });

  it("checks for updates and moves to ready when an update is downloaded", () => {
    const emitEvent = vi.fn();
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      platform: "darwin",
    });

    const checkingStatus = service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-available");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");

    expect(checkingStatus.state).toBe("checking");
    expect(mocks.autoUpdater.setFeedURL).toHaveBeenCalledWith({
      headers: {
        "User-Agent": expect.stringContaining("fluxnotes/1.0.0"),
      },
      url: expect.stringContaining("/chansyawn/fluxnotes/"),
    });
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      lastCheckedAt: "2026-01-01T00:00:00.000Z",
      lastCheckSource: "manual",
      releaseName: "v1.0.1",
      state: "ready",
    });
    expect(emitEvent).toHaveBeenLastCalledWith(
      "app-update.changed",
      expect.objectContaining({ state: "ready" }),
    );
  });

  it("reports manual check errors through status", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      platform: "darwin",
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("error", new Error("Network unavailable"));

    expect(service.getStatus()).toMatchObject({
      errorMessage: "Network unavailable",
      lastCheckSource: "manual",
      state: "error",
    });
  });

  it("restarts only when an update is ready", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
    });

    expect(() => service.restartAndInstall()).toThrow("No app update is ready to install.");

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");
    service.restartAndInstall();

    expect(mocks.autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it("returns unavailable when app is not packaged", () => {
    mocks.app.isPackaged = false;
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
    });

    expect(service.checkForUpdates("manual")).toMatchObject({
      isSupported: false,
      state: "unavailable",
    });
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
