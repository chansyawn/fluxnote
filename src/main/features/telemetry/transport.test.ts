import { describe, expect, it, vi } from "vite-plus/test";

import { createTelemetryTransport, type PostHogNodeClient } from "./transport";

function createClientMock() {
  const client = {
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn(),
  } satisfies PostHogNodeClient;
  const createClient = vi.fn(() => client);

  return { client, createClient };
}

describe("telemetry transport", () => {
  const projectConfig = {
    host: "https://posthog.example",
    key: "key",
  };

  it("does not create PostHog client when disabled", async () => {
    const { client, createClient } = createClientMock();
    const transport = createTelemetryTransport({
      anonId: "anon-1",
      createClient,
      getBaseProperties: () => ({ app_process: "main" }),
      isEnabled: () => false,
      projectConfig,
    });

    transport.captureEvent("app_started");
    await Promise.resolve();

    expect(createClient).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
  });

  it("lazy creates client on first capture", async () => {
    const { client, createClient } = createClientMock();
    const transport = createTelemetryTransport({
      anonId: "anon-1",
      createClient,
      getBaseProperties: () => ({ app_process: "main", app_version: "1.0.0" }),
      isEnabled: () => true,
      projectConfig,
    });

    expect(createClient).not.toHaveBeenCalled();

    transport.captureEvent("app_started", { source: "startup" });
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
        app_process: "main",
        app_version: "1.0.0",
        source: "startup",
      },
    });
  });

  it("reuses one pending client promise across captures", async () => {
    const client = {
      capture: vi.fn(),
      captureException: vi.fn(),
      shutdown: vi.fn(),
    } satisfies PostHogNodeClient;
    const createClient = vi.fn(() => Promise.resolve(client));
    const error = new Error("boom");
    const transport = createTelemetryTransport({
      anonId: "anon-1",
      createClient,
      getBaseProperties: () => ({ app_process: "main" }),
      isEnabled: () => true,
      projectConfig,
    });

    transport.captureEvent("app_started");
    transport.captureError(error, { source: "test" });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(client.capture).toHaveBeenCalledTimes(1);
    expect(client.captureException).toHaveBeenCalledWith(error, "anon-1", {
      app_process: "main",
      source: "test",
    });
  });

  it("does not create PostHog client when project config is missing", async () => {
    const { client, createClient } = createClientMock();
    const transport = createTelemetryTransport({
      anonId: "anon-1",
      createClient,
      getBaseProperties: () => ({ app_process: "main" }),
      isEnabled: () => true,
      projectConfig: null,
    });

    transport.captureError(new Error("boom"));
    await Promise.resolve();

    expect(createClient).not.toHaveBeenCalled();
    expect(client.captureException).not.toHaveBeenCalled();
  });

  it("calls shutdown only after client exists", async () => {
    const { client, createClient } = createClientMock();
    const transport = createTelemetryTransport({
      anonId: "anon-1",
      createClient,
      getBaseProperties: () => ({ app_process: "main" }),
      isEnabled: () => true,
      projectConfig,
    });

    transport.shutdown();
    expect(client.shutdown).not.toHaveBeenCalled();

    transport.captureEvent("app_started");
    await Promise.resolve();
    await Promise.resolve();
    transport.shutdown();

    expect(client.shutdown).toHaveBeenCalledTimes(1);
  });
});
