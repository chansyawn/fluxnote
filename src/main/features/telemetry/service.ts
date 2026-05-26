import { normalizeAppPlatform } from "@shared/app/platform";
import {
  resolvePostHogProjectConfig,
  type PostHogProjectConfig,
} from "@shared/features/telemetry/config";
import type { TelemetryBootstrap, TelemetryEventName } from "@shared/features/telemetry/contract";

import {
  createTelemetryTransport,
  type PostHogNodeClient,
  type TelemetryClientFactoryDeps,
} from "./transport";

interface TelemetryStorage {
  store: Record<string, unknown>;
}

interface TelemetrySettingsReader {
  readSettings: () => {
    telemetry: {
      enabled: boolean;
    };
  };
}

type TelemetryEventEmitter = (name: "telemetry.changed", payload: TelemetryBootstrap) => boolean;

interface TelemetryServiceDeps {
  appVersion: string;
  createClient?: (deps: TelemetryClientFactoryDeps) => PostHogNodeClient;
  emitEvent?: TelemetryEventEmitter;
  env?: Record<string, string | undefined>;
  platform?: string;
  readSettings: TelemetrySettingsReader["readSettings"];
  storage: TelemetryStorage;
}

export interface TelemetryService {
  captureError: (error: unknown, properties?: Record<string, unknown>) => void;
  captureEvent: (event: TelemetryEventName, properties?: Record<string, unknown>) => void;
  getBootstrap: () => TelemetryBootstrap;
  notifyPreferenceChanged: () => void;
  shutdown: () => void;
}

const ANON_ID_KEY = "anonId";

function getStoredAnonId(storage: TelemetryStorage): string | null {
  const value = storage.store[ANON_ID_KEY];
  return typeof value === "string" && value.trim() ? value : null;
}

function getOrCreateAnonId(storage: TelemetryStorage): string {
  const existing = getStoredAnonId(storage);
  if (existing) {
    return existing;
  }

  const anonId = crypto.randomUUID();
  storage.store = {
    ...storage.store,
    [ANON_ID_KEY]: anonId,
  };
  return anonId;
}

function resolveProjectConfig(
  env: Record<string, string | undefined>,
): PostHogProjectConfig | null {
  return resolvePostHogProjectConfig({
    host: env.VITE_FLUXNOTES_POSTHOG_HOST,
    key: env.VITE_FLUXNOTES_POSTHOG_KEY,
  });
}

export function createTelemetryService({
  appVersion,
  createClient,
  emitEvent,
  env = process.env,
  platform = process.platform,
  readSettings,
  storage,
}: TelemetryServiceDeps): TelemetryService {
  const projectConfig = resolveProjectConfig(env);
  const anonId = getOrCreateAnonId(storage);

  function isEnabled(): boolean {
    return readSettings().telemetry.enabled && projectConfig !== null;
  }

  function getBaseProperties(): Record<string, unknown> {
    return {
      app_platform: normalizeAppPlatform(platform),
      app_process: "main",
      app_version: appVersion,
    };
  }

  const transport = createTelemetryTransport({
    anonId,
    createClient,
    getBaseProperties,
    isEnabled,
    projectConfig,
  });

  function captureEvent(event: TelemetryEventName, properties: Record<string, unknown> = {}): void {
    transport.captureEvent(event, properties);
  }

  function captureError(error: unknown, properties: Record<string, unknown> = {}): void {
    transport.captureError(error, properties);
  }

  function getBootstrap(): TelemetryBootstrap {
    return {
      anonId,
      appVersion,
      enabled: isEnabled(),
      posthogHost: projectConfig?.host ?? null,
      posthogKey: projectConfig?.key ?? null,
    };
  }

  function notifyPreferenceChanged(): void {
    emitEvent?.("telemetry.changed", getBootstrap());
  }

  function shutdown(): void {
    transport.shutdown();
  }

  return {
    captureError,
    captureEvent,
    getBootstrap,
    notifyPreferenceChanged,
    shutdown,
  };
}

export function reportProcessError(
  telemetryService: Pick<TelemetryService, "captureError">,
  source: string,
  error: unknown,
): void {
  telemetryService.captureError(error, { source });
}

export type { PostHogNodeClient };
