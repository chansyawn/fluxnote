import { describe, expect, it, vi } from "vite-plus/test";

import { createTelemetryService, type PostHogNodeClient } from "./service";

function createClientMock() {
  const client = {
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn(),
  } satisfies PostHogNodeClient;
  const createClient = vi.fn(() => client);

  return { client, createClient };
}

describe("telemetry service", () => {
  const postHogEnv = {
    VITE_FLUXNOTES_POSTHOG_HOST: "https://posthog.example",
    VITE_FLUXNOTES_POSTHOG_KEY: "key",
  };

  it("returns disabled bootstrap when PostHog config is incomplete", () => {
    const service = createTelemetryService({
      appVersion: "1.0.0",
      env: {},
      readUserPreferences: () => ({ telemetry: { enabled: true } }),
      storage: { store: {} },
    });

    expect(service.getBootstrap()).toEqual({
      anonId: expect.any(String),
      appVersion: "1.0.0",
      enabled: false,
      posthogHost: null,
      posthogKey: null,
    });
  });

  it("creates and reuses anonId", () => {
    const storage: { store: Record<string, unknown> } = { store: {} };
    const service = createTelemetryService({
      appVersion: "1.0.0",
      env: {},
      readUserPreferences: () => ({ telemetry: { enabled: true } }),
      storage,
    });

    const bootstrap = service.getBootstrap();

    expect(storage.store["anonId"]).toBe(bootstrap.anonId);
    expect(
      createTelemetryService({
        appVersion: "1.0.0",
        env: {},
        readUserPreferences: () => ({ telemetry: { enabled: true } }),
        storage,
      }).getBootstrap().anonId,
    ).toBe(bootstrap.anonId);
  });

  it("does not capture when user preference disables telemetry", async () => {
    const { client, createClient } = createClientMock();
    const service = createTelemetryService({
      appVersion: "1.0.0",
      createClient,
      env: postHogEnv,
      readUserPreferences: () => ({ telemetry: { enabled: false } }),
      storage: { store: { anonId: "anon-1" } },
    });

    service.captureEvent("app_started");
    await Promise.resolve();

    expect(createClient).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
  });

  it("captures app events with base properties", async () => {
    const { client, createClient } = createClientMock();
    const service = createTelemetryService({
      appVersion: "1.0.0",
      createClient,
      env: postHogEnv,
      platform: "darwin",
      readUserPreferences: () => ({ telemetry: { enabled: true } }),
      storage: { store: { anonId: "anon-1" } },
    });

    service.captureEvent("app_started");
    await Promise.resolve();
    await Promise.resolve();

    expect(createClient).toHaveBeenCalledWith({
      apiHost: "https://posthog.example",
      apiKey: "key",
    });
    expect(client.capture).toHaveBeenCalledWith({
      distinctId: "anon-1",
      event: "app_started",
      properties: {
        app_platform: "darwin",
        app_process: "main",
        app_version: "1.0.0",
      },
    });
  });

  it("captures errors with explicit source", async () => {
    const { client, createClient } = createClientMock();
    const error = new Error("boom");
    const service = createTelemetryService({
      appVersion: "1.0.0",
      createClient,
      env: postHogEnv,
      readUserPreferences: () => ({ telemetry: { enabled: true } }),
      storage: { store: { anonId: "anon-1" } },
    });

    service.captureError(error, { source: "test" });
    await Promise.resolve();
    await Promise.resolve();

    expect(client.captureException).toHaveBeenCalledWith(error, "anon-1", {
      app_platform: expect.any(String),
      app_process: "main",
      app_version: "1.0.0",
      source: "test",
    });
  });

  it("emits current telemetry bootstrap after Telemetry Preference changes", () => {
    let telemetryEnabled = true;
    const emitEvent = vi.fn();
    const service = createTelemetryService({
      appVersion: "1.0.0",
      emitEvent,
      env: postHogEnv,
      readUserPreferences: () => ({ telemetry: { enabled: telemetryEnabled } }),
      storage: { store: { anonId: "anon-1" } },
    });

    telemetryEnabled = false;
    service.notifyPreferenceChanged();

    expect(emitEvent).toHaveBeenCalledWith("telemetry.changed", {
      anonId: "anon-1",
      appVersion: "1.0.0",
      enabled: false,
      posthogHost: "https://posthog.example",
      posthogKey: "key",
    });
  });

  it("uses latest Telemetry Preference for later captures", async () => {
    let telemetryEnabled = true;
    const { client, createClient } = createClientMock();
    const service = createTelemetryService({
      appVersion: "1.0.0",
      createClient,
      env: postHogEnv,
      readUserPreferences: () => ({ telemetry: { enabled: telemetryEnabled } }),
      storage: { store: { anonId: "anon-1" } },
    });

    telemetryEnabled = false;
    service.captureEvent("app_started");
    await Promise.resolve();

    expect(createClient).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
  });
});
