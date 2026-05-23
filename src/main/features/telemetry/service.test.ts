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
  it("returns disabled bootstrap when PostHog config is incomplete", () => {
    const service = createTelemetryService({
      appVersion: "1.0.0",
      env: {},
      readSettings: () => ({ telemetry: { enabled: true } }),
      storage: { store: {} },
    });

    expect(service.getBootstrap()).toEqual({
      anonId: expect.any(String),
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
      readSettings: () => ({ telemetry: { enabled: true } }),
      storage,
    });

    const bootstrap = service.getBootstrap();

    expect(storage.store["anonId"]).toBe(bootstrap.anonId);
    expect(
      createTelemetryService({
        appVersion: "1.0.0",
        env: {},
        readSettings: () => ({ telemetry: { enabled: true } }),
        storage,
      }).getBootstrap().anonId,
    ).toBe(bootstrap.anonId);
  });

  it("does not capture when user preference disables telemetry", async () => {
    const { client, createClient } = createClientMock();
    const service = createTelemetryService({
      appVersion: "1.0.0",
      createClient,
      env: {
        VITE_FLUXNOTES_POSTHOG_HOST: "https://posthog.example",
        VITE_FLUXNOTES_POSTHOG_KEY: "key",
      },
      readSettings: () => ({ telemetry: { enabled: false } }),
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
      env: {
        VITE_FLUXNOTES_POSTHOG_HOST: "https://posthog.example",
        VITE_FLUXNOTES_POSTHOG_KEY: "key",
      },
      platform: "darwin",
      readSettings: () => ({ telemetry: { enabled: true } }),
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
        appVersion: "1.0.0",
        platform: "darwin",
        process: "main",
      },
    });
  });

  it("captures errors with explicit source", async () => {
    const { client, createClient } = createClientMock();
    const error = new Error("boom");
    const service = createTelemetryService({
      appVersion: "1.0.0",
      createClient,
      env: {
        VITE_FLUXNOTES_POSTHOG_HOST: "https://posthog.example",
        VITE_FLUXNOTES_POSTHOG_KEY: "key",
      },
      readSettings: () => ({ telemetry: { enabled: true } }),
      storage: { store: { anonId: "anon-1" } },
    });

    service.captureError(error, { source: "test" });
    await Promise.resolve();
    await Promise.resolve();

    expect(client.captureException).toHaveBeenCalledWith(error, "anon-1", {
      appVersion: "1.0.0",
      platform: process.platform,
      process: "main",
      source: "test",
    });
  });
});
