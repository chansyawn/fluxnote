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
      prepareToQuitForInstall: vi.fn(),
    });

    const checkingStatus = service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-available");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");

    expect(checkingStatus.state).toBe("checking");
    expect(mocks.autoUpdater.setFeedURL).toHaveBeenCalledWith({
      headers: {
        "User-Agent": expect.stringContaining("fluxnotes/1.0.0"),
      },
      url: "https://update.electronjs.org/chansyawn/fluxnotes/darwin-arm64/1.0.0",
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

  it("starts downloading after an available update is found", () => {
    const emitEvent = vi.fn();
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent,
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-available");

    expect(service.getStatus()).toMatchObject({
      lastCheckSource: "manual",
      state: "downloading",
    });
    expect(emitEvent).toHaveBeenLastCalledWith(
      "app-update.changed",
      expect.objectContaining({ state: "downloading" }),
    );
  });

  it("uses the same update flow for automatic checks", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    service.checkForUpdates("automatic");
    mocks.autoUpdater.emit("update-available");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");

    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      lastCheckSource: "automatic",
      state: "ready",
    });
  });

  it("refreshes a ready update using the downloaded version as the feed baseline", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");
    service.checkForUpdates("manual");

    expect(mocks.autoUpdater.setFeedURL).toHaveBeenLastCalledWith({
      headers: {
        "User-Agent": expect.stringContaining("fluxnotes/1.0.0"),
      },
      url: "https://update.electronjs.org/chansyawn/fluxnotes/darwin-arm64/1.0.1",
    });
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      state: "checking",
    });
  });

  it("keeps a ready update ready when the ready refresh finds no newer update", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");
    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-not-available");

    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      lastCheckedAt: "2026-01-01T00:00:00.000Z",
      state: "ready",
    });
  });

  it("replaces the ready update when the ready refresh downloads a newer update", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");
    service.checkForUpdates("automatic");
    mocks.autoUpdater.emit("update-available");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.2", new Date(), "");

    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.2",
      lastCheckSource: "automatic",
      releaseName: "v1.0.2",
      state: "ready",
    });
  });

  it("reports manual check errors through status", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("error", new Error("Network unavailable"));

    expect(service.getStatus()).toMatchObject({
      errorMessage: "Network unavailable",
      lastCheckSource: "manual",
      state: "error",
    });
  });

  it("checks for newer updates before installing a ready update", () => {
    const prepareToQuitForInstall = vi.fn();
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall,
    });

    expect(() => service.restartAndInstall()).toThrow("No app update is ready to install.");
    expect(prepareToQuitForInstall).not.toHaveBeenCalled();

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");
    service.restartAndInstall();

    expect(mocks.autoUpdater.setFeedURL).toHaveBeenLastCalledWith({
      headers: {
        "User-Agent": expect.stringContaining("fluxnotes/1.0.0"),
      },
      url: "https://update.electronjs.org/chansyawn/fluxnotes/darwin-arm64/1.0.1",
    });
    expect(prepareToQuitForInstall).not.toHaveBeenCalled();

    mocks.autoUpdater.emit("update-not-available");

    expect(prepareToQuitForInstall).toHaveBeenCalledOnce();
    expect(prepareToQuitForInstall).toHaveBeenCalledBefore(mocks.autoUpdater.quitAndInstall);
    expect(mocks.autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it("does not install immediately when the install refresh finds a newer update", () => {
    const prepareToQuitForInstall = vi.fn();
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall,
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");
    service.restartAndInstall();
    mocks.autoUpdater.emit("update-available");

    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      state: "downloading",
    });
    expect(prepareToQuitForInstall).not.toHaveBeenCalled();
    expect(mocks.autoUpdater.quitAndInstall).not.toHaveBeenCalled();
  });

  it("installs the ready update when the install refresh fails", () => {
    const prepareToQuitForInstall = vi.fn();
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall,
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "v1.0.1", new Date(), "");
    service.restartAndInstall();
    mocks.autoUpdater.emit("error", new Error("Network unavailable"));

    expect(prepareToQuitForInstall).toHaveBeenCalledOnce();
    expect(mocks.autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it("falls back to the app version when a downloaded update has no parseable version", () => {
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-downloaded", {}, "", "Fluxnotes release", new Date(), "");
    service.checkForUpdates("manual");

    expect(service.getStatus()).toMatchObject({
      availableVersion: undefined,
      releaseName: "Fluxnotes release",
      state: "checking",
    });
    expect(mocks.autoUpdater.setFeedURL).toHaveBeenLastCalledWith({
      headers: {
        "User-Agent": expect.stringContaining("fluxnotes/1.0.0"),
      },
      url: "https://update.electronjs.org/chansyawn/fluxnotes/darwin-arm64/1.0.0",
    });
  });

  it("returns unavailable when app is not packaged", () => {
    mocks.app.isPackaged = false;
    const service = createAppUpdateService({
      arch: "arm64",
      emitEvent: vi.fn(),
      platform: "darwin",
      prepareToQuitForInstall: vi.fn(),
    });

    expect(service.checkForUpdates("manual")).toMatchObject({
      isSupported: false,
      state: "unavailable",
    });
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
