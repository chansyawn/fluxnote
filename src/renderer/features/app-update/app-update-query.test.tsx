// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import type { AppUpdateStatus } from "@shared/features/app-update/contract";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  getAppUpdateStatus: vi.fn(),
  onAppUpdateChanged: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  checkForAppUpdate: vi.fn(),
  getAppUpdateStatus: clientMocks.getAppUpdateStatus,
  onAppUpdateChanged: clientMocks.onAppUpdateChanged,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

import { APP_UPDATE_QUERY_KEY, AppUpdateSync } from "./app-update-query";

function createStatus(patch: Partial<AppUpdateStatus> = {}): AppUpdateStatus {
  return {
    currentVersion: "1.0.0",
    isSupported: true,
    platform: "darwin",
    state: "up-to-date",
    ...patch,
  } as AppUpdateStatus;
}

function renderSync() {
  let appUpdateChanged: (status: AppUpdateStatus) => void = () => {
    throw new Error("App update listener was not registered.");
  };
  clientMocks.onAppUpdateChanged.mockImplementation(
    (handler: (status: AppUpdateStatus) => void) => {
      appUpdateChanged = handler;
      return vi.fn();
    },
  );

  return {
    appUpdateChanged: (status: AppUpdateStatus) => {
      appUpdateChanged(status);
    },
    ...renderWithProviders(<AppUpdateSync />),
  };
}

describe("AppUpdateSync", () => {
  afterEach(() => {
    clientMocks.getAppUpdateStatus.mockReset();
    clientMocks.onAppUpdateChanged.mockReset();
    toastMocks.error.mockReset();
    toastMocks.info.mockReset();
  });

  it("notifies when a manual check is up to date", () => {
    const harness = renderSync();

    harness.appUpdateChanged(
      createStatus({
        lastCheck: {
          checkedAt: "2026-01-01T00:00:00.000Z",
          outcome: "up-to-date",
          source: "manual",
        },
      }),
    );

    expect(toastMocks.info).toHaveBeenCalledWith("Fluxnotes is up to date.");
  });

  it("notifies when a manual ready refresh confirms the downloaded update is latest", () => {
    const harness = renderSync();

    harness.appUpdateChanged(
      createStatus({
        availableVersion: "1.0.1",
        lastCheck: {
          checkedAt: "2026-01-01T00:00:00.000Z",
          outcome: "ready-latest",
          source: "manual",
        },
        releaseName: "v1.0.1",
        state: "ready",
      }),
    );

    expect(toastMocks.info).toHaveBeenCalledWith(
      "The downloaded update is the latest available version.",
    );
  });

  it("notifies when an install refresh downloads a newer update", () => {
    const harness = renderSync();

    harness.appUpdateChanged(
      createStatus({
        lastCheck: {
          checkedAt: "2026-01-01T00:00:00.000Z",
          outcome: "newer-update",
          source: "manual",
        },
        state: "downloading",
      }),
    );

    expect(toastMocks.info).toHaveBeenCalledWith("A newer update was found and is downloading.");
  });

  it("notifies manual check failures without repeating old results", () => {
    const harness = renderSync();
    const lastCheck = {
      checkedAt: "2026-01-01T00:00:00.000Z",
      errorMessage: "Network unavailable",
      outcome: "failed",
      source: "manual",
    } as const;
    const failedStatus = createStatus({
      lastCheck,
      state: "ready",
    });

    harness.appUpdateChanged(failedStatus);
    harness.queryClient.setQueryData(APP_UPDATE_QUERY_KEY, failedStatus);
    harness.appUpdateChanged(createStatus({ lastCheck, state: "checking" }));

    expect(toastMocks.error).toHaveBeenCalledTimes(1);
    expect(toastMocks.error).toHaveBeenCalledWith("Network unavailable");
  });
});
