import type { EventBus } from "@main/core/ipc";
import type {
  AppUpdateCheckSource,
  AppUpdateLastCheck,
  AppUpdateStatus,
} from "@shared/features/app-update/contract";
import { businessError } from "@shared/ipc/result";
import { app, autoUpdater } from "electron";

const UPDATE_REPO = "chansyawn/fluxnotes";
const UPDATE_HOST = "https://update.electronjs.org";
const STARTUP_CHECK_DELAY_MS = 30_000;
const WINDOWS_FIRST_RUN_CHECK_DELAY_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 60 * 1000;

type Timer = ReturnType<typeof setTimeout>;
type Interval = ReturnType<typeof setInterval>;
type UpdateCheckPurpose = "normal" | "ready-refresh";

interface ActiveUpdateCheck {
  purpose: UpdateCheckPurpose;
  readyUpdate?: {
    availableVersion?: string;
    releaseName?: string;
  };
  source: AppUpdateCheckSource;
}

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
  setAutomaticChecksEnabled: (enabled: boolean) => void;
  start: (options: { automaticChecksEnabled: boolean }) => void;
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
  const unsupportedReason = !app.isPackaged
    ? "not-packaged"
    : isSupportedPlatform(platform)
      ? null
      : "platform";
  const currentVersion = app.getVersion();
  const isSupported = unsupportedReason === null;
  let status: AppUpdateStatus = isSupported
    ? {
        currentVersion,
        isSupported: true,
        platform,
        state: "idle",
      }
    : {
        currentVersion,
        isSupported: false,
        platform,
        state: "unsupported",
        unsupportedReason,
      };
  let started = false;
  let automaticChecksEnabled = false;
  let startupTimer: Timer | null = null;
  let interval: Interval | null = null;
  let activeCheck: ActiveUpdateCheck | null = null;

  function setStatus(nextStatus: AppUpdateStatus): AppUpdateStatus {
    status = nextStatus;
    emitEvent("app-update.changed", status);
    return status;
  }

  function getLastCheck(): AppUpdateLastCheck | undefined {
    return "lastCheck" in status ? status.lastCheck : undefined;
  }

  function supportedStatusBase(): Pick<
    Extract<AppUpdateStatus, { isSupported: true }>,
    "currentVersion" | "isSupported" | "lastCheck" | "platform"
  > {
    return {
      currentVersion,
      isSupported: true,
      lastCheck: getLastCheck(),
      platform,
    };
  }

  function createLastCheck(
    check: ActiveUpdateCheck,
    outcome: AppUpdateLastCheck["outcome"],
    errorMessage?: string,
  ): AppUpdateLastCheck {
    return {
      checkedAt: now().toISOString(),
      errorMessage,
      outcome,
      source: check.source,
    };
  }

  function getReadyBaselineVersion(): string {
    return status.state === "ready" ? (status.availableVersion ?? currentVersion) : currentVersion;
  }

  function setFeedUrl(baseVersion: string): void {
    autoUpdater.setFeedURL({
      headers: {
        "User-Agent": `fluxnotes/${currentVersion} (${platform}: ${arch})`,
      },
      url: getFeedUrl(platform, arch, baseVersion),
    });
  }

  function beginUpdateCheck(source: AppUpdateCheckSource, purpose: UpdateCheckPurpose): void {
    const baselineVersion = purpose === "normal" ? currentVersion : getReadyBaselineVersion();
    const readyUpdate =
      status.state === "ready"
        ? {
            availableVersion: status.availableVersion,
            releaseName: status.releaseName,
          }
        : undefined;
    activeCheck = { purpose, readyUpdate, source };
    setFeedUrl(baselineVersion);
    setStatus({
      ...supportedStatusBase(),
      state: "checking",
    });
  }

  function checkForUpdates(source: AppUpdateCheckSource): AppUpdateStatus {
    if (!isSupported) {
      return status;
    }

    if (status.state === "checking" || status.state === "downloading") {
      return status;
    }

    beginUpdateCheck(source, status.state === "ready" ? "ready-refresh" : "normal");

    try {
      autoUpdater.checkForUpdates();
    } catch (error) {
      completeWithError(
        error instanceof Error ? error : new Error("Failed to check for app updates."),
      );
    }

    return status;
  }

  function clearAutomaticTimers(): void {
    if (startupTimer) {
      clearTimeout(startupTimer);
      startupTimer = null;
    }
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function runAutomaticCheck(): void {
    checkForUpdates("automatic");
  }

  function scheduleAutomaticChecks(options: { immediate: boolean }): void {
    if (!started || !isSupported || !automaticChecksEnabled) {
      return;
    }

    clearAutomaticTimers();

    if (options.immediate) {
      runAutomaticCheck();
      interval = setInterval(runAutomaticCheck, UPDATE_CHECK_INTERVAL_MS);
      return;
    }

    startupTimer = setTimeout(() => {
      startupTimer = null;
      runAutomaticCheck();
      interval = setInterval(runAutomaticCheck, UPDATE_CHECK_INTERVAL_MS);
    }, getStartupDelay(argv));
  }

  function setAutomaticChecksEnabled(enabled: boolean): void {
    automaticChecksEnabled = enabled;
    if (!enabled) {
      clearAutomaticTimers();
      return;
    }

    scheduleAutomaticChecks({ immediate: true });
  }

  function start(options: { automaticChecksEnabled: boolean }): void {
    if (started) {
      setAutomaticChecksEnabled(options.automaticChecksEnabled);
      return;
    }

    started = true;
    automaticChecksEnabled = options.automaticChecksEnabled;
    if (!isSupported) {
      setStatus(status);
      return;
    }

    setFeedUrl(currentVersion);
    scheduleAutomaticChecks({ immediate: false });
  }

  function stop(): void {
    clearAutomaticTimers();
  }

  function restartAndInstall(): void {
    if (status.state !== "ready") {
      throw businessError("BUSINESS.INVALID_INVOKE", "No app update is ready to install.");
    }

    installReadyUpdate();
  }

  function installReadyUpdate(): void {
    // Electron closes windows before `before-quit` when quitAndInstall starts, so the
    // window manager must enter quit mode before handing control to the updater.
    prepareToQuitForInstall();
    autoUpdater.quitAndInstall();
  }

  function completeWithoutUpdate(): void {
    if (!activeCheck) {
      return;
    }

    const check = activeCheck;
    activeCheck = null;

    if (check.purpose === "ready-refresh") {
      setStatus({
        ...supportedStatusBase(),
        ...check.readyUpdate,
        lastCheck: createLastCheck(check, "ready-latest"),
        state: "ready",
      });
      return;
    }

    setStatus({
      ...supportedStatusBase(),
      lastCheck: createLastCheck(check, "up-to-date"),
      state: "up-to-date",
    });
  }

  function completeDownloadedUpdate(releaseName: string): void {
    const check = activeCheck ?? {
      purpose: "normal",
      source: "automatic",
    };
    activeCheck = null;
    setStatus({
      ...supportedStatusBase(),
      availableVersion: getAvailableVersion(releaseName),
      lastCheck: createLastCheck(check, "update-ready"),
      releaseName,
      state: "ready",
    });
  }

  function completeWithError(error: Error): void {
    if (!activeCheck) {
      return;
    }

    const check = activeCheck;
    const message = getErrorMessage(error);
    activeCheck = null;

    if (check.purpose === "ready-refresh") {
      setStatus({
        ...supportedStatusBase(),
        ...check.readyUpdate,
        lastCheck: createLastCheck(check, "failed", message),
        state: "ready",
      });
      return;
    }

    setStatus({
      ...supportedStatusBase(),
      errorMessage: message,
      lastCheck: createLastCheck(check, "failed", message),
      state: "error",
    });
  }

  autoUpdater.on("checking-for-update", () => {
    if (!activeCheck || !isSupported) {
      return;
    }

    setStatus({
      ...supportedStatusBase(),
      state: "checking",
    });
  });

  autoUpdater.on("update-available", () => {
    if (!activeCheck || !isSupported) {
      return;
    }

    setStatus({
      ...supportedStatusBase(),
      lastCheck: getLastCheck(),
      state: "downloading",
    });
  });

  autoUpdater.on("update-not-available", completeWithoutUpdate);

  autoUpdater.on("update-downloaded", (_event, _releaseNotes, releaseName) => {
    completeDownloadedUpdate(String(releaseName));
  });

  autoUpdater.on("error", completeWithError);

  return {
    checkForUpdates,
    getStatus: () => status,
    restartAndInstall,
    setAutomaticChecksEnabled,
    start,
    stop,
  };
}
