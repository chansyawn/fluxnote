// @vitest-environment jsdom

import type { TelemetryBootstrap } from "@shared/features/telemetry/contract";
import type { CaptureResult } from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  captureRendererEvent,
  captureRendererError,
  configureRendererTelemetry,
  createRendererPostHogInitOptions,
  setRendererPostHogClientForTest,
  type RendererPostHogClient,
} from "./telemetry-client";

function createClient(): RendererPostHogClient {
  return {
    capture: vi.fn(),
    captureException: vi.fn(),
    init: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  };
}

function createBootstrap(patch: Partial<TelemetryBootstrap> = {}): TelemetryBootstrap {
  return {
    anonId: "anon-1",
    appVersion: "1.0.0",
    enabled: true,
    posthogHost: "https://posthog.example",
    posthogKey: "key",
    ...patch,
  };
}

describe("renderer telemetry client", () => {
  beforeEach(() => {
    vi.stubGlobal("appEnvironment", { platform: "darwin" });
  });

  it("initializes PostHog with automatic capture disabled", () => {
    const client = createClient();
    setRendererPostHogClientForTest(client);

    configureRendererTelemetry(createBootstrap());

    expect(client.init).toHaveBeenCalledWith("key", {
      api_host: "https://posthog.example",
      autocapture: false,
      bootstrap: {
        distinctID: "anon-1",
        isIdentifiedID: false,
      },
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
    expect(client.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
  });

  it("configures real PostHog capture to use the shared anonymous id", async () => {
    const { PostHog } = await import("posthog-js");
    const client = new PostHog();
    const capturedRequests: CaptureResult[] = [];
    const bootstrap = createBootstrap({ anonId: "anon-main" });

    client.init("key", {
      ...createRendererPostHogInitOptions(bootstrap),
      before_send: (captureResult) => {
        if (captureResult) {
          capturedRequests.push(captureResult);
        }
        return null;
      },
    });
    client.capture("block_created", {
      app_process: "renderer",
      source: "workspace_shortcut",
    });
    client.opt_out_capturing();

    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0]?.properties.distinct_id).toBe("anon-main");
    expect(capturedRequests[0]?.properties.$is_identified).toBe(false);
    expect(capturedRequests[0]?.properties.$process_person_profile).toBe(false);
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
      app_platform: "darwin",
      app_process: "renderer",
      app_version: "1.0.0",
      pathname: "/preferences",
      source: "test",
    });
  });

  it("captures renderer events with base metadata", () => {
    const client = createClient();
    setRendererPostHogClientForTest(client);

    configureRendererTelemetry(createBootstrap());
    captureRendererEvent("block_created", { source: "workspace_shortcut" });

    expect(client.capture).toHaveBeenCalledWith("block_created", {
      app_platform: "darwin",
      app_process: "renderer",
      app_version: "1.0.0",
      source: "workspace_shortcut",
    });
  });
});
