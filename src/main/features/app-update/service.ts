import type { EventBus } from "@main/core/ipc";
import type { AppUpdateCheckSource, AppUpdateStatus } from "@shared/features/app-update/contract";
import { businessError } from "@shared/ipc/result";
import { app, autoUpdater } from "electron";

const UPDATE_REPO = "chansyawn/fluxnotes";
const UPDATE_HOST = "https://update.electronjs.org";
const STARTUP_CHECK_DELAY_MS = 30_000;
const WINDOWS_FIRST_RUN_CHECK_DELAY_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type Timer = ReturnType<typeof setTimeout>;
type Interval = ReturnType<typeof setInterval>;
type UpdateCheckIntent = "normal" | "ready-refresh" | "install-refresh";

interface AppUpdateServiceDeps {
  arch?: string;
  argv?: readonly string[];
  emitEvent: EventBus["emit"];
  now?: () => Date;
  platform?: NodeJS.Platform;
  prepareToQuitForInstall: () => void;
}

export interface AppUpdateService {
  checkForUpdates: (source: AppUpdateCheckSource) => AppUpdateStatus;
  getStatus: () => AppUpdateStatus;
  restartAndInstall: () => void;
  start: () => void;
  stop: () => void;
}

function isSupportedPlatform(platform: NodeJS.Platform): boolean {
  return platform === "darwin" || platform === "win32";
}

function getFeedUrl(platform: NodeJS.Platform, arch: string, baseVersion: string): string {
  return `${UPDATE_HOST}/${UPDATE_REPO}/${platform}-${arch}/${baseVersion}`;
}

function getStartupDelay(argv: readonly string[]): number {
  return argv.includes("--squirrel-firstrun")
    ? WINDOWS_FIRST_RUN_CHECK_DELAY_MS
    : STARTUP_CHECK_DELAY_MS;
}

function getAvailableVersion(releaseName: string): string | undefined {
  const match = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/.exec(
    releaseName.trim(),
  );
  return match?.[1];
}

function getErrorMessage(error: Error): string {
  return error.message.trim() || "Failed to check for app updates.";
}

export function createAppUpdateService({
  arch = process.arch,
  argv = process.argv,
  emitEvent,
  now = () => new Date(),
  platform = process.platform,
  prepareToQuitForInstall,
}: AppUpdateServiceDeps): AppUpdateService {
  const isSupported = app.isPackaged && isSupportedPlatform(platform);
  let status: AppUpdateStatus = {
    currentVersion: app.getVersion(),
    isSupported,
    platform,
    state: isSupported ? "idle" : "unavailable",
  };
  let started = false;
  let startupTimer: Timer | null = null;
  let interval: Interval | null = null;
  let updateCheckIntent: UpdateCheckIntent = "normal";

  function emitStatus(): AppUpdateStatus {
    emitEvent("app-update.changed", status);
    return status;
  }

  function setStatus(patch: Partial<AppUpdateStatus>): AppUpdateStatus {
    status = {
      ...status,
      ...patch,
    };
    return emitStatus();
  }

  function getReadyRefreshBaseVersion(): string {
    return status.availableVersion ?? app.getVersion();
  }

  function setFeedUrl(baseVersion = app.getVersion()): void {
    // Electron's built-in updater downloads as soon as it finds an update. When an
    // update is already ready, use that downloaded version as the feed baseline so
    // the refresh asks whether anything newer exists instead of redownloading it.
    autoUpdater.setFeedURL({
      headers: {
        "User-Agent": `fluxnotes/${app.getVersion()} (${platform}: ${arch})`,
      },
      url: getFeedUrl(platform, arch, baseVersion),
    });
  }

  function checkForUpdates(source: AppUpdateCheckSource): AppUpdateStatus {
    if (!isSupported) {
      return setStatus({
        errorMessage: undefined,
        lastCheckSource: source,
        state: "unavailable",
      });
    }

    if (status.state === "checking" || status.state === "downloading") {
      return status;
    }

    updateCheckIntent = status.state === "ready" ? "ready-refresh" : "normal";
    setFeedUrl(updateCheckIntent === "ready-refresh" ? getReadyRefreshBaseVersion() : undefined);

    if (!started) {
      started = true;
    }

    setStatus({
      errorMessage: undefined,
      lastCheckSource: source,
      state: "checking",
    });

    try {
      autoUpdater.checkForUpdates();
    } catch (error) {
      const message =
        error instanceof Error ? getErrorMessage(error) : "Failed to check for app updates.";
      const nextState = updateCheckIntent === "ready-refresh" ? "ready" : "error";
      updateCheckIntent = "normal";
      return setStatus({
        errorMessage: message,
        lastCheckedAt: now().toISOString(),
        state: nextState,
      });
    }

    return status;
  }

  function start(): void {
    if (!isSupported || startupTimer || interval) {
      emitStatus();
      return;
    }

    setFeedUrl();
    started = true;

    startupTimer = setTimeout(() => {
      startupTimer = null;
      checkForUpdates("automatic");
      interval = setInterval(() => {
        checkForUpdates("automatic");
      }, UPDATE_CHECK_INTERVAL_MS);
    }, getStartupDelay(argv));
  }

  function stop(): void {
    if (startupTimer) {
      clearTimeout(startupTimer);
      startupTimer = null;
    }
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function restartAndInstall(): void {
    if (status.state !== "ready") {
      throw businessError("BUSINESS.INVALID_INVOKE", "No app update is ready to install.");
    }

    if (!isSupported || !status.availableVersion) {
      installReadyUpdate();
      return;
    }

    updateCheckIntent = "install-refresh";
    setFeedUrl(getReadyRefreshBaseVersion());
    setStatus({
      errorMessage: undefined,
      state: "checking",
    });

    try {
      autoUpdater.checkForUpdates();
    } catch {
      updateCheckIntent = "normal";
      installReadyUpdate();
    }
  }

  function installReadyUpdate(): void {
    prepareToQuitForInstall();
    autoUpdater.quitAndInstall();
  }

  autoUpdater.on("checking-for-update", () => {
    setStatus({
      errorMessage: undefined,
      state: "checking",
    });
  });

  autoUpdater.on("update-available", () => {
    updateCheckIntent = "normal";
    setStatus({
      errorMessage: undefined,
      state: "downloading",
    });
  });

  autoUpdater.on("update-not-available", () => {
    if (updateCheckIntent === "ready-refresh") {
      updateCheckIntent = "normal";
      setStatus({
        errorMessage: undefined,
        lastCheckedAt: now().toISOString(),
        state: "ready",
      });
      return;
    }

    if (updateCheckIntent === "install-refresh") {
      updateCheckIntent = "normal";
      setStatus({
        errorMessage: undefined,
        lastCheckedAt: now().toISOString(),
        state: "ready",
      });
      installReadyUpdate();
      return;
    }

    updateCheckIntent = "normal";
    setStatus({
      errorMessage: undefined,
      lastCheckedAt: now().toISOString(),
      state: "unavailable",
    });
  });

  autoUpdater.on("update-downloaded", (_event, _releaseNotes, releaseName) => {
    updateCheckIntent = "normal";
    setStatus({
      availableVersion: getAvailableVersion(releaseName),
      errorMessage: undefined,
      lastCheckedAt: now().toISOString(),
      releaseName,
      state: "ready",
    });
  });

  autoUpdater.on("error", (error) => {
    if (updateCheckIntent === "install-refresh") {
      updateCheckIntent = "normal";
      installReadyUpdate();
      return;
    }

    const nextState = updateCheckIntent === "ready-refresh" ? "ready" : "error";
    updateCheckIntent = "normal";
    setStatus({
      errorMessage: getErrorMessage(error),
      lastCheckedAt: now().toISOString(),
      state: nextState,
    });
  });

  return {
    checkForUpdates,
    getStatus: () => status,
    restartAndInstall,
    start,
    stop,
  };
}
