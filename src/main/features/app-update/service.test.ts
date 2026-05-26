import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

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

function createService(
  options: { platform?: NodeJS.Platform; prepareToQuitForInstall?: () => void } = {},
) {
  return createAppUpdateService({
    arch: "arm64",
    emitEvent: vi.fn(),
    now: () => new Date("2026-01-01T00:00:00.000Z"),
    platform: options.platform ?? "darwin",
    prepareToQuitForInstall: options.prepareToQuitForInstall ?? vi.fn(),
  });
}

function emitDownloadedUpdate(releaseName = "v1.0.1"): void {
  mocks.autoUpdater.emit("update-available");
  mocks.autoUpdater.emit("update-downloaded", {}, "", releaseName, new Date(), "");
}

describe("app update service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.autoUpdater.removeAllListeners();
    mocks.app.getVersion.mockReturnValue("1.0.0");
    mocks.app.isPackaged = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves to ready when an update is downloaded", () => {
    const service = createService();

    const checkingStatus = service.checkForUpdates("manual");
    emitDownloadedUpdate("v1.0.1");

    expect(checkingStatus.state).toBe("checking");
    expect(mocks.autoUpdater.setFeedURL).toHaveBeenCalledWith({
      headers: {
        "User-Agent": expect.stringContaining("fluxnotes/1.0.0"),
      },
      url: "https://update.electronjs.org/chansyawn/fluxnotes/darwin-arm64/1.0.0",
    });
    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      lastCheck: {
        checkedAt: "2026-01-01T00:00:00.000Z",
        outcome: "update-ready",
        source: "manual",
      },
      releaseName: "v1.0.1",
      state: "ready",
    });
  });

  it("reports up to date when no update is available", () => {
    const service = createService();

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-not-available");

    expect(service.getStatus()).toMatchObject({
      lastCheck: {
        outcome: "up-to-date",
        source: "manual",
      },
      state: "up-to-date",
    });
  });

  it("keeps a ready update ready when the ready refresh finds no newer update", () => {
    const service = createService();

    service.checkForUpdates("manual");
    emitDownloadedUpdate("v1.0.1");
    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("update-not-available");

    expect(mocks.autoUpdater.setFeedURL).toHaveBeenLastCalledWith({
      headers: {
        "User-Agent": expect.stringContaining("fluxnotes/1.0.0"),
      },
      url: "https://update.electronjs.org/chansyawn/fluxnotes/darwin-arm64/1.0.1",
    });
    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      lastCheck: {
        outcome: "ready-latest",
        source: "manual",
      },
      releaseName: "v1.0.1",
      state: "ready",
    });
  });

  it("keeps a ready update ready when the ready refresh fails", () => {
    const service = createService();

    service.checkForUpdates("manual");
    emitDownloadedUpdate("v1.0.1");
    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("error", new Error("Network unavailable"));

    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      lastCheck: {
        errorMessage: "Network unavailable",
        outcome: "failed",
        source: "manual",
      },
      state: "ready",
    });
  });

  it("reports errors from normal checks", () => {
    const service = createService();

    service.checkForUpdates("manual");
    mocks.autoUpdater.emit("error", new Error("Network unavailable"));

    expect(service.getStatus()).toMatchObject({
      errorMessage: "Network unavailable",
      lastCheck: {
        errorMessage: "Network unavailable",
        outcome: "failed",
        source: "manual",
      },
      state: "error",
    });
  });

  it("installs a ready update without checking again", () => {
    const prepareToQuitForInstall = vi.fn();
    const service = createService({ prepareToQuitForInstall });

    expect(() => service.restartAndInstall()).toThrow("No app update is ready to install.");

    service.checkForUpdates("manual");
    emitDownloadedUpdate("v1.0.1");
    service.restartAndInstall();

    expect(prepareToQuitForInstall).toHaveBeenCalledOnce();
    expect(prepareToQuitForInstall).toHaveBeenCalledBefore(mocks.autoUpdater.quitAndInstall);
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
    expect(mocks.autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it("installs a downloaded update when the release name has no parseable version", () => {
    const prepareToQuitForInstall = vi.fn();
    const service = createService({ prepareToQuitForInstall });

    service.checkForUpdates("manual");
    emitDownloadedUpdate("Fluxnotes release");
    service.restartAndInstall();

    expect(prepareToQuitForInstall).toHaveBeenCalledOnce();
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
    expect(mocks.autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it("returns unsupported when app is not packaged", () => {
    mocks.app.isPackaged = false;
    const service = createService();

    expect(service.checkForUpdates("manual")).toMatchObject({
      isSupported: false,
      state: "unsupported",
      unsupportedReason: "not-packaged",
    });
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it("returns unsupported for unsupported platforms", () => {
    const service = createService({ platform: "linux" });

    expect(service.getStatus()).toMatchObject({
      isSupported: false,
      state: "unsupported",
      unsupportedReason: "platform",
    });
  });

  it("starts automatic checks only when enabled", () => {
    vi.useFakeTimers();
    const service = createService();

    service.start({ automaticChecksEnabled: false });
    vi.advanceTimersByTime(30_000);
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled();

    service.setAutomaticChecksEnabled(true);

    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
  });

  it("cancels future automatic checks without cancelling a ready update", () => {
    vi.useFakeTimers();
    const service = createService();

    service.start({ automaticChecksEnabled: true });
    vi.advanceTimersByTime(30_000);
    emitDownloadedUpdate("v1.0.1");
    service.setAutomaticChecksEnabled(false);
    vi.advanceTimersByTime(6 * 60 * 60 * 1000);

    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalledOnce();
    expect(service.getStatus()).toMatchObject({
      availableVersion: "1.0.1",
      state: "ready",
    });
  });
});
