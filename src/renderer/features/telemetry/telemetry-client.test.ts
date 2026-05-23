import type { TelemetryBootstrap } from "@shared/features/telemetry/contract";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  captureRendererError,
  configureRendererTelemetry,
  setRendererPostHogClientForTest,
  type RendererPostHogClient,
} from "./telemetry-client";

function createClient(): RendererPostHogClient {
  return {
    capture: vi.fn(),
    captureException: vi.fn(),
    identify: vi.fn(),
    init: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  };
}

function createBootstrap(patch: Partial<TelemetryBootstrap> = {}): TelemetryBootstrap {
  return {
    anonId: "anon-1",
    enabled: true,
    posthogHost: "https://posthog.example",
    posthogKey: "key",
    ...patch,
  };
}

describe("renderer telemetry client", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      appEnvironment: { platform: "darwin" },
    });
  });

  it("initializes PostHog with automatic capture disabled", () => {
    const client = createClient();
    setRendererPostHogClientForTest(client);

    configureRendererTelemetry(createBootstrap());

    expect(client.init).toHaveBeenCalledWith("key", {
      api_host: "https://posthog.example",
      autocapture: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_pageleave: false,
      capture_pageview: false,
      disable_external_dependency_loading: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_surveys_automatic_display: true,
      disable_web_experiments: true,
      person_profiles: "never",
    });
    expect(client.identify).toHaveBeenCalledWith("anon-1");
    expect(client.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
  });

  it("opts out and skips error capture when disabled", () => {
    const client = createClient();
    setRendererPostHogClientForTest(client);

    configureRendererTelemetry(createBootstrap({ enabled: false }));
    captureRendererError(new Error("boom"));

    expect(client.opt_out_capturing).toHaveBeenCalled();
    expect(client.captureException).not.toHaveBeenCalled();
  });

  it("captures renderer errors with non-content metadata", () => {
    const client = createClient();
    const error = new Error("boom");
    setRendererPostHogClientForTest(client);

    configureRendererTelemetry(createBootstrap());
    captureRendererError(error, { pathname: "/preferences", source: "test" });

    expect(client.captureException).toHaveBeenCalledWith(error, {
      pathname: "/preferences",
      platform: "darwin",
      process: "renderer",
      source: "test",
    });
  });
});
