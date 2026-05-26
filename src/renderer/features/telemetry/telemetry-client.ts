import type {
  BlockCreatedProperties,
  TelemetryBootstrap,
  TelemetryEventName,
} from "@shared/features/telemetry/contract";
import type { CaptureResult, PostHog, Properties } from "posthog-js";
import posthog from "posthog-js";

export type RendererPostHogClient = Pick<
  PostHog,
  "capture" | "captureException" | "identify" | "init" | "opt_in_capturing" | "opt_out_capturing"
>;

let currentBootstrap: TelemetryBootstrap | null = null;
let initialized = false;
let postHogClient: PostHog = posthog;

export function getPostHogClient(): PostHog {
  return postHogClient;
}

export function configureRendererTelemetry(bootstrap: TelemetryBootstrap): RendererPostHogClient {
  currentBootstrap = bootstrap;

  if (bootstrap.posthogKey && bootstrap.posthogHost && !initialized) {
    postHogClient.init(bootstrap.posthogKey, {
      api_host: bootstrap.posthogHost,
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
    postHogClient.identify(bootstrap.anonId);
    initialized = true;
  }

  if (initialized) {
    if (bootstrap.enabled) {
      postHogClient.opt_in_capturing({ captureEventName: false });
    } else {
      postHogClient.opt_out_capturing();
    }
  }

  return postHogClient;
}

function isCaptureEnabled(): boolean {
  return currentBootstrap?.enabled === true && initialized;
}

function getBaseProperties(): Properties {
  return {
    platform: window.appEnvironment.platform,
    process: "renderer",
  };
}

export function captureRendererError(
  error: unknown,
  properties: Record<string, unknown> = {},
): CaptureResult | undefined {
  if (!isCaptureEnabled()) {
    return undefined;
  }

  return postHogClient.captureException(error, {
    ...getBaseProperties(),
    ...properties,
  });
}

type RendererTelemetryProperties = {
  block_created: BlockCreatedProperties;
};

export function captureRendererEvent<TEvent extends keyof RendererTelemetryProperties>(
  event: TEvent & TelemetryEventName,
  properties: RendererTelemetryProperties[TEvent],
): CaptureResult | undefined {
  if (!isCaptureEnabled()) {
    return undefined;
  }

  return postHogClient.capture(event, {
    ...getBaseProperties(),
    ...properties,
  });
}

export function setRendererPostHogClientForTest(client: RendererPostHogClient): void {
  postHogClient = client as PostHog;
  currentBootstrap = null;
  initialized = false;
}
