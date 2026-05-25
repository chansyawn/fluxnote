// @vitest-environment jsdom

import type { TelemetryBootstrap } from "@shared/features/telemetry/contract";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  onTelemetryChanged: vi.fn(),
  readTelemetryBootstrap: vi.fn(),
}));

const telemetryClientMocks = vi.hoisted(() => ({
  configureRendererTelemetry: vi.fn(),
  getPostHogClient: vi.fn(() => ({})),
}));

vi.mock("@renderer/clients", () => ({
  onTelemetryChanged: clientMocks.onTelemetryChanged,
  readTelemetryBootstrap: clientMocks.readTelemetryBootstrap,
}));

vi.mock("@renderer/features/telemetry/telemetry-client", () => ({
  configureRendererTelemetry: telemetryClientMocks.configureRendererTelemetry,
  getPostHogClient: telemetryClientMocks.getPostHogClient,
}));

vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { TelemetryProvider } from "./telemetry-provider";

function createBootstrap(patch: Partial<TelemetryBootstrap> = {}): TelemetryBootstrap {
  return {
    anonId: "anon-1",
    enabled: true,
    posthogHost: "https://posthog.example",
    posthogKey: "key",
    ...patch,
  };
}

describe("TelemetryProvider", () => {
  afterEach(() => {
    clientMocks.onTelemetryChanged.mockReset();
    clientMocks.readTelemetryBootstrap.mockReset();
    telemetryClientMocks.configureRendererTelemetry.mockReset();
    telemetryClientMocks.getPostHogClient.mockClear();
  });

  it("configures renderer telemetry from startup bootstrap", async () => {
    const bootstrap = createBootstrap();
    clientMocks.readTelemetryBootstrap.mockResolvedValue(bootstrap);
    clientMocks.onTelemetryChanged.mockReturnValue(() => undefined);

    render(
      <TelemetryProvider>
        <main>Workspace</main>
      </TelemetryProvider>,
    );

    expect(screen.queryByText("Workspace")).toBeNull();
    expect(await screen.findByText("Workspace")).toBeVisible();
    expect(telemetryClientMocks.configureRendererTelemetry).toHaveBeenCalledWith(bootstrap);
  });

  it("reconfigures renderer telemetry from telemetry changed events", async () => {
    const initialBootstrap = createBootstrap();
    const nextBootstrap = createBootstrap({ enabled: false });
    let telemetryChanged: (bootstrap: TelemetryBootstrap) => void = () => {
      throw new Error("Telemetry changed listener was not registered.");
    };
    const unlisten = vi.fn();
    clientMocks.readTelemetryBootstrap.mockResolvedValue(initialBootstrap);
    clientMocks.onTelemetryChanged.mockImplementation(
      (handler: (bootstrap: TelemetryBootstrap) => void) => {
        telemetryChanged = handler;
        return unlisten;
      },
    );
    const rendered = render(
      <TelemetryProvider>
        <main>Workspace</main>
      </TelemetryProvider>,
    );
    await screen.findByText("Workspace");

    telemetryChanged(nextBootstrap);

    expect(telemetryClientMocks.configureRendererTelemetry).toHaveBeenLastCalledWith(nextBootstrap);

    rendered.unmount();
    await waitFor(() => {
      expect(unlisten).toHaveBeenCalledOnce();
    });
  });
});
