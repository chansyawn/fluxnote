// @vitest-environment jsdom

import { APP_UPDATE_QUERY_KEY } from "@renderer/features/app-update/app-update-query";
import { USER_PREFERENCES_QUERY_KEY } from "@renderer/features/preferences/preferences-query";
import { createRendererUserPreferences } from "@renderer/test/fixtures";
import { createTestQueryClient, renderWithProviders } from "@renderer/test/render";
import type { AppUpdateStatus } from "@shared/features/app-update/contract";
import type {
  UserPreferences,
  UserPreferencesPatch,
} from "@shared/features/preferences/user-preferences";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  checkForAppUpdate: vi.fn(),
  getAppUpdateStatus: vi.fn(),
  onAppUpdateChanged: vi.fn(),
  onPreferencesChanged: vi.fn(),
  openExternalUrl: vi.fn(),
  patchUserPreferences: vi.fn(),
  readUserPreferences: vi.fn(),
  resetUserPreferences: vi.fn(),
  restartAndInstallAppUpdate: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  checkForAppUpdate: clientMocks.checkForAppUpdate,
  getAppUpdateStatus: clientMocks.getAppUpdateStatus,
  onAppUpdateChanged: clientMocks.onAppUpdateChanged,
  onPreferencesChanged: clientMocks.onPreferencesChanged,
  openExternalUrl: clientMocks.openExternalUrl,
  patchUserPreferences: clientMocks.patchUserPreferences,
  readUserPreferences: clientMocks.readUserPreferences,
  resetUserPreferences: clientMocks.resetUserPreferences,
  restartAndInstallAppUpdate: clientMocks.restartAndInstallAppUpdate,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("@fluxnotes/ui/components/sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: { children?: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { AboutPreferencesSection } from "./about-preferences-section";

const supportedUpdateStatus: AppUpdateStatus = {
  currentVersion: "1.2.3",
  isSupported: true,
  platform: "darwin-arm64",
  state: "idle",
};

function setupUserPreferences(initialPreferences: UserPreferences): UserPreferences {
  let preferences = initialPreferences;
  clientMocks.readUserPreferences.mockImplementation(async () => preferences);
  clientMocks.patchUserPreferences.mockImplementation(async (patch: UserPreferencesPatch) => {
    preferences = createRendererUserPreferences({
      ...preferences,
      ...patch,
      appUpdate: { ...preferences.appUpdate, ...patch.appUpdate },
      appearance: { ...preferences.appearance, ...patch.appearance },
      autoArchive: { ...preferences.autoArchive, ...patch.autoArchive },
      markdown: {
        ...preferences.markdown,
        ...patch.markdown,
        codeBlock: {
          ...preferences.markdown.codeBlock,
          ...patch.markdown?.codeBlock,
        },
      },
      shortcuts: { ...preferences.shortcuts, ...patch.shortcuts },
      telemetry: { ...preferences.telemetry, ...patch.telemetry },
    });
    return preferences;
  });
  return preferences;
}

function renderAboutPreferences({
  appUpdateStatus = supportedUpdateStatus,
  preferences = createRendererUserPreferences(),
}: {
  appUpdateStatus?: AppUpdateStatus;
  preferences?: UserPreferences;
} = {}) {
  const currentPreferences = setupUserPreferences(preferences);
  clientMocks.getAppUpdateStatus.mockResolvedValue(appUpdateStatus);
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, currentPreferences);
  queryClient.setQueryData(APP_UPDATE_QUERY_KEY, appUpdateStatus);

  return renderWithProviders(<AboutPreferencesSection />, { queryClient });
}

function lastUserPreferencesPatch(): UserPreferencesPatch {
  const patch = clientMocks.patchUserPreferences.mock.calls.at(-1)?.[0];
  if (!patch) {
    throw new Error("Expected User Preferences to be patched.");
  }
  return patch;
}

describe("AboutPreferencesSection", () => {
  beforeEach(() => {
    clientMocks.checkForAppUpdate.mockResolvedValue(supportedUpdateStatus);
    clientMocks.getAppUpdateStatus.mockResolvedValue(supportedUpdateStatus);
    clientMocks.onAppUpdateChanged.mockReturnValue(() => undefined);
    clientMocks.onPreferencesChanged.mockReturnValue(() => undefined);
    clientMocks.openExternalUrl.mockResolvedValue(undefined);
    clientMocks.restartAndInstallAppUpdate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    clientMocks.checkForAppUpdate.mockReset();
    clientMocks.getAppUpdateStatus.mockReset();
    clientMocks.onAppUpdateChanged.mockReset();
    clientMocks.onPreferencesChanged.mockReset();
    clientMocks.openExternalUrl.mockReset();
    clientMocks.patchUserPreferences.mockReset();
    clientMocks.readUserPreferences.mockReset();
    clientMocks.resetUserPreferences.mockReset();
    clientMocks.restartAndInstallAppUpdate.mockReset();
    toastMocks.error.mockReset();
  });

  it("shows About information and actions in the expected order", () => {
    renderAboutPreferences();

    const pageText = document.body.textContent ?? "";
    const labels = ["Version", "App update checks", "Telemetry", "GitHub"];

    expect(screen.getByRole("heading", { name: "About" })).toBeVisible();
    expect(screen.getByText("1.2.3")).toBeVisible();
    expect(labels.every((label) => pageText.includes(label))).toBe(true);
    expect(labels.map((label) => pageText.indexOf(label))).toEqual(
      [...labels].map((label) => pageText.indexOf(label)).sort((left, right) => left - right),
    );
  });

  it("opens the repository and issues links through the external URL client", async () => {
    const user = userEvent.setup();
    renderAboutPreferences();

    await user.click(screen.getByRole("button", { name: "Repository" }));
    await user.click(screen.getByRole("button", { name: "Issues" }));

    expect(clientMocks.openExternalUrl).toHaveBeenNthCalledWith(1, {
      url: "https://github.com/chansyawn/fluxnotes",
    });
    expect(clientMocks.openExternalUrl).toHaveBeenNthCalledWith(2, {
      url: "https://github.com/chansyawn/fluxnotes/issues",
    });
  });

  it("persists telemetry and app update check preferences", async () => {
    const user = userEvent.setup();
    renderAboutPreferences({
      preferences: createRendererUserPreferences({
        appUpdate: { automaticChecksEnabled: true },
        telemetry: { enabled: true },
      }),
    });

    await user.click(screen.getByRole("switch", { name: "Telemetry" }));

    await waitFor(() => {
      expect(lastUserPreferencesPatch()).toEqual({ telemetry: { enabled: false } });
    });

    await user.click(screen.getByRole("switch", { name: "App update checks" }));

    await waitFor(() => {
      expect(lastUserPreferencesPatch()).toEqual({ appUpdate: { automaticChecksEnabled: false } });
    });
  });

  it("checks for updates manually and disables update controls when unsupported", async () => {
    const user = userEvent.setup();
    const unsupportedStatus: AppUpdateStatus = {
      currentVersion: "1.2.3",
      isSupported: false,
      platform: "darwin-arm64",
      state: "unsupported",
      unsupportedReason: "not-packaged",
    };
    const { unmount } = renderAboutPreferences();

    await user.click(screen.getByRole("button", { name: "Check" }));

    await waitFor(() => {
      expect(clientMocks.checkForAppUpdate).toHaveBeenCalledWith({ source: "manual" });
    });

    unmount();
    renderAboutPreferences({ appUpdateStatus: unsupportedStatus });

    expect(screen.getByRole("switch", { name: "App update checks" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    expect(screen.getByText("1.2.3")).toBeVisible();
  });

  it("shows ready and downloading update actions", () => {
    const readyStatus: AppUpdateStatus = {
      availableVersion: "2.0.0",
      currentVersion: "1.2.3",
      isSupported: true,
      platform: "darwin-arm64",
      state: "ready",
    };
    const downloadingStatus: AppUpdateStatus = {
      currentVersion: "1.2.3",
      isSupported: true,
      platform: "darwin-arm64",
      state: "downloading",
    };
    const { unmount } = renderAboutPreferences({ appUpdateStatus: readyStatus });

    expect(screen.getByText("1.2.3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Update" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();

    unmount();
    renderAboutPreferences({ appUpdateStatus: downloadingStatus });

    expect(screen.getByText("1.2.3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Downloading" })).toBeDisabled();
  });
});
