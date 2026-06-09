// @vitest-environment jsdom

import { createTestQueryClient, renderWithProviders } from "@renderer/test/render";
import type { SystemPermissionStatus } from "@shared/features/system-permissions/contract";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  getCliStatus: vi.fn(),
  getSystemPermissionStatus: vi.fn(),
  installCli: vi.fn(),
  onWindowFocusChanged: vi.fn(),
  openSystemPermissionSettings: vi.fn(),
  requestSystemPermission: vi.fn(),
  uninstallCli: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  getCliStatus: clientMocks.getCliStatus,
  getSystemPermissionStatus: clientMocks.getSystemPermissionStatus,
  installCli: clientMocks.installCli,
  onWindowFocusChanged: clientMocks.onWindowFocusChanged,
  openSystemPermissionSettings: clientMocks.openSystemPermissionSettings,
  requestSystemPermission: clientMocks.requestSystemPermission,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
  uninstallCli: clientMocks.uninstallCli,
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

vi.mock("@renderer/app/i18n", () => ({
  useI18nState: () => ({
    locale: "en",
    localeOptions: [{ key: "en", name: "English" }],
    setLocale: vi.fn(),
  }),
}));

vi.mock("@renderer/features/preferences/preferences-query", () => ({
  useFontSizePreference: () => ({ fontSize: 16, setFontSize: vi.fn() }),
  useThemePreference: () => ({ setTheme: vi.fn(), theme: "system" }),
}));

import { AppPreferencesSection } from "./app-preferences-section";

const cliStatus = {
  canInstall: true,
  canUninstall: false,
  commandName: "flux" as const,
  installed: false,
  installPath: null,
  managedBy: "unsupported" as const,
  targetPath: null,
};

function permissionStatus(overrides: Partial<SystemPermissionStatus> = {}): SystemPermissionStatus {
  return {
    granted: false,
    permission: "macos_accessibility",
    supported: true,
    ...overrides,
  };
}

function renderAppPreferences(status: SystemPermissionStatus) {
  clientMocks.getCliStatus.mockResolvedValue(cliStatus);
  clientMocks.getSystemPermissionStatus.mockResolvedValue(status);
  clientMocks.onWindowFocusChanged.mockReturnValue(() => undefined);
  return renderWithProviders(<AppPreferencesSection />, {
    queryClient: createTestQueryClient(),
  });
}

describe("AppPreferencesSection", () => {
  beforeEach(() => {
    clientMocks.getCliStatus.mockReset();
    clientMocks.getSystemPermissionStatus.mockReset();
    clientMocks.installCli.mockReset();
    clientMocks.onWindowFocusChanged.mockReset();
    clientMocks.openSystemPermissionSettings.mockReset();
    clientMocks.requestSystemPermission.mockReset();
    clientMocks.uninstallCli.mockReset();
    toastMocks.error.mockReset();
  });

  it("shows ready Accessibility status when permission is granted", async () => {
    renderAppPreferences(permissionStatus({ granted: true }));

    expect(await screen.findByText("Accessibility")).toBeInTheDocument();
    expect(await screen.findByText("Ready")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Allow" })).not.toBeInTheDocument();
  });

  it("shows an Allow action when Accessibility permission is missing", async () => {
    const grantedStatus = permissionStatus({ granted: true });
    clientMocks.requestSystemPermission.mockResolvedValue(grantedStatus);
    renderAppPreferences(permissionStatus({ granted: false }));

    await userEvent.click(await screen.findByRole("button", { name: "Allow" }));

    expect(clientMocks.requestSystemPermission).toHaveBeenCalledWith({
      permission: "macos_accessibility",
    });
    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });
  });

  it("switches to Open Settings when requesting permission still leaves it missing", async () => {
    clientMocks.requestSystemPermission.mockResolvedValue(permissionStatus({ granted: false }));
    clientMocks.openSystemPermissionSettings.mockResolvedValue(undefined);
    renderAppPreferences(permissionStatus({ granted: false }));

    await userEvent.click(await screen.findByRole("button", { name: "Allow" }));
    await userEvent.click(await screen.findByRole("button", { name: "Open Settings" }));

    expect(clientMocks.openSystemPermissionSettings).toHaveBeenCalledWith({
      permission: "macos_accessibility",
    });
  });

  it("shows macOS only when Accessibility is unsupported", async () => {
    renderAppPreferences(permissionStatus({ granted: false, supported: false }));

    expect(await screen.findByText("macOS only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Allow" })).toBeDisabled();
  });

  it("refreshes Accessibility status when the window regains focus", async () => {
    let focusHandler: ((focused: boolean) => void) | undefined;
    clientMocks.onWindowFocusChanged.mockImplementation((handler: (focused: boolean) => void) => {
      focusHandler = handler;
      return () => undefined;
    });
    clientMocks.getCliStatus.mockResolvedValue(cliStatus);
    clientMocks.getSystemPermissionStatus.mockResolvedValue(permissionStatus());
    renderWithProviders(<AppPreferencesSection />, { queryClient: createTestQueryClient() });
    await screen.findByText("Permission needed");

    focusHandler?.(true);

    await waitFor(() => {
      expect(clientMocks.getSystemPermissionStatus).toHaveBeenCalledTimes(2);
    });
  });
});
