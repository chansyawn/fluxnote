// @vitest-environment jsdom

import { APP_UPDATE_QUERY_KEY } from "@renderer/features/app-update/app-update-query";
import { SETTINGS_QUERY_KEY } from "@renderer/features/preferences/preferences-query";
import { createRendererSettings } from "@renderer/test/fixtures";
import { createTestQueryClient, renderWithProviders } from "@renderer/test/render";
import type { AppUpdateStatus } from "@shared/features/app-update/contract";
import type { Settings, SettingsPatch } from "@shared/features/preferences/settings";
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
  patchSettings: vi.fn(),
  readSettings: vi.fn(),
  resetSettings: vi.fn(),
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
  patchSettings: clientMocks.patchSettings,
  readSettings: clientMocks.readSettings,
  resetSettings: clientMocks.resetSettings,
  restartAndInstallAppUpdate: clientMocks.restartAndInstallAppUpdate,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: { children?: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { AboutSettingsSection } from "./about-settings-section";

const supportedUpdateStatus: AppUpdateStatus = {
  currentVersion: "1.2.3",
  isSupported: true,
  platform: "darwin-arm64",
  state: "idle",
};

function setupUserPreferences(initialSettings: Settings): Settings {
  let settings = initialSettings;
  clientMocks.readSettings.mockImplementation(async () => settings);
  clientMocks.patchSettings.mockImplementation(async (patch: SettingsPatch) => {
    settings = createRendererSettings({
      ...settings,
      ...patch,
      appUpdate: { ...settings.appUpdate, ...patch.appUpdate },
      appearance: { ...settings.appearance, ...patch.appearance },
      autoArchive: { ...settings.autoArchive, ...patch.autoArchive },
      markdown: {
        ...settings.markdown,
        ...patch.markdown,
        codeBlock: {
          ...settings.markdown.codeBlock,
          ...patch.markdown?.codeBlock,
        },
      },
      shortcuts: { ...settings.shortcuts, ...patch.shortcuts },
      telemetry: { ...settings.telemetry, ...patch.telemetry },
    });
    return settings;
  });
  return settings;
}

function renderAboutSettings({
  appUpdateStatus = supportedUpdateStatus,
  settings = createRendererSettings(),
}: {
  appUpdateStatus?: AppUpdateStatus;
  settings?: Settings;
} = {}) {
  const currentSettings = setupUserPreferences(settings);
  clientMocks.getAppUpdateStatus.mockResolvedValue(appUpdateStatus);
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(SETTINGS_QUERY_KEY, currentSettings);
  queryClient.setQueryData(APP_UPDATE_QUERY_KEY, appUpdateStatus);

  return renderWithProviders(<AboutSettingsSection />, { queryClient });
}

function lastSettingsPatch(): SettingsPatch {
  const patch = clientMocks.patchSettings.mock.calls.at(-1)?.[0];
  if (!patch) {
    throw new Error("Expected User Preferences to be patched.");
  }
  return patch;
}

describe("AboutSettingsSection", () => {
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
    clientMocks.patchSettings.mockReset();
    clientMocks.readSettings.mockReset();
    clientMocks.resetSettings.mockReset();
    clientMocks.restartAndInstallAppUpdate.mockReset();
    toastMocks.error.mockReset();
  });

  it("shows About information and actions in the expected order", () => {
    renderAboutSettings();

    const pageText = document.body.textContent ?? "";
    const labels = ["Version", "Auto updates", "Telemetry", "GitHub"];

    expect(screen.getByRole("heading", { name: "About" })).toBeVisible();
    expect(screen.getByText("1.2.3")).toBeVisible();
    expect(labels.every((label) => pageText.includes(label))).toBe(true);
    expect(labels.map((label) => pageText.indexOf(label))).toEqual(
      [...labels].map((label) => pageText.indexOf(label)).sort((left, right) => left - right),
    );
  });

  it("opens the repository and issues links through the external URL client", async () => {
    const user = userEvent.setup();
    renderAboutSettings();

    await user.click(screen.getByRole("button", { name: "Repository" }));
    await user.click(screen.getByRole("button", { name: "Issues" }));

    expect(clientMocks.openExternalUrl).toHaveBeenNthCalledWith(1, {
      url: "https://github.com/chansyawn/fluxnotes",
    });
    expect(clientMocks.openExternalUrl).toHaveBeenNthCalledWith(2, {
      url: "https://github.com/chansyawn/fluxnotes/issues",
    });
  });

  it("persists telemetry and automatic update preferences", async () => {
    const user = userEvent.setup();
    renderAboutSettings({
      settings: createRendererSettings({
        appUpdate: { automaticChecksEnabled: true },
        telemetry: { enabled: true },
      }),
    });

    await user.click(screen.getByRole("switch", { name: "Telemetry" }));

    await waitFor(() => {
      expect(lastSettingsPatch()).toEqual({ telemetry: { enabled: false } });
    });

    await user.click(screen.getByRole("switch", { name: "Auto updates" }));

    await waitFor(() => {
      expect(lastSettingsPatch()).toEqual({ appUpdate: { automaticChecksEnabled: false } });
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
    const { unmount } = renderAboutSettings();

    await user.click(screen.getByRole("button", { name: "Check" }));

    await waitFor(() => {
      expect(clientMocks.checkForAppUpdate).toHaveBeenCalledWith({ source: "manual" });
    });

    unmount();
    renderAboutSettings({ appUpdateStatus: unsupportedStatus });

    expect(screen.getByRole("switch", { name: "Auto updates" })).toHaveAttribute(
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
    const { unmount } = renderAboutSettings({ appUpdateStatus: readyStatus });

    expect(screen.getByText("1.2.3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Update" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();

    unmount();
    renderAboutSettings({ appUpdateStatus: downloadingStatus });

    expect(screen.getByText("1.2.3")).toBeVisible();
    expect(screen.getByRole("button", { name: "Downloading" })).toBeDisabled();
  });
});
