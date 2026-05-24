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

function createReadyStatus(patch: Partial<AppUpdateStatus> = {}): AppUpdateStatus {
  return {
    availableVersion: "1.0.1",
    currentVersion: "1.0.0",
    isSupported: true,
    lastCheckSource: "manual",
    platform: "darwin",
    releaseName: "v1.0.1",
    state: "ready",
    ...patch,
  };
}

describe("AppUpdateSync", () => {
  afterEach(() => {
    clientMocks.getAppUpdateStatus.mockReset();
    clientMocks.onAppUpdateChanged.mockReset();
    toastMocks.error.mockReset();
    toastMocks.info.mockReset();
  });

  it("notifies when a manual ready refresh confirms the downloaded update is latest", () => {
    let appUpdateChanged: (status: AppUpdateStatus) => void = (_status) => {
      throw new Error("App update listener was not registered.");
    };
    clientMocks.onAppUpdateChanged.mockImplementation(
      (handler: (status: AppUpdateStatus) => void) => {
        appUpdateChanged = handler;
        return vi.fn();
      },
    );
    const previousStatus = createReadyStatus({ state: "checking" });
    const { queryClient } = renderWithProviders(<AppUpdateSync />);
    queryClient.setQueryData(APP_UPDATE_QUERY_KEY, previousStatus);

    appUpdateChanged(createReadyStatus());

    expect(toastMocks.info).toHaveBeenCalledWith(
      "The downloaded update is the latest available version.",
    );
  });
});
