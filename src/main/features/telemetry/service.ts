import {
  resolvePostHogProjectConfig,
  type PostHogProjectConfig,
} from "@shared/features/telemetry/config";
import type { TelemetryBootstrap, TelemetryEventName } from "@shared/features/telemetry/contract";
import type { PostHog } from "posthog-node";

type PostHogNodeClient = Pick<PostHog, "capture" | "captureException" | "shutdown">;

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

interface TelemetryClientFactoryDeps {
  apiHost: string;
  apiKey: string;
}

interface TelemetryServiceDeps {
  appVersion: string;
  createClient?: (deps: TelemetryClientFactoryDeps) => PostHogNodeClient;
  env?: Record<string, string | undefined>;
  platform?: string;
  readSettings: TelemetrySettingsReader["readSettings"];
  storage: TelemetryStorage;
}

export interface TelemetryService {
  captureError: (error: unknown, properties?: Record<string, unknown>) => void;
  captureEvent: (event: TelemetryEventName, properties?: Record<string, unknown>) => void;
  getBootstrap: () => TelemetryBootstrap;
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
    host: env.FLUXNOTES_POSTHOG_HOST ?? env.VITE_FLUXNOTES_POSTHOG_HOST,
    key: env.FLUXNOTES_POSTHOG_KEY ?? env.VITE_FLUXNOTES_POSTHOG_KEY,
  });
}

async function createPostHogNodeClient({
  apiHost,
  apiKey,
}: TelemetryClientFactoryDeps): Promise<PostHogNodeClient> {
  const { PostHog } = await import("posthog-node");
  return new PostHog(apiKey, {
    host: apiHost,
    enableExceptionAutocapture: false,
  });
}

export function createTelemetryService({
  appVersion,
  createClient,
  env = process.env,
  platform = process.platform,
  readSettings,
  storage,
}: TelemetryServiceDeps): TelemetryService {
  const projectConfig = resolveProjectConfig(env);
  const anonId = getOrCreateAnonId(storage);
  let client: PostHogNodeClient | null = null;
  let clientPromise: Promise<PostHogNodeClient> | null = null;

  function isEnabled(): boolean {
    return readSettings().telemetry.enabled && projectConfig !== null;
  }

  function getClient(): Promise<PostHogNodeClient> | null {
    if (!isEnabled() || !projectConfig) {
      return null;
    }

    if (client) {
      return Promise.resolve(client);
    }

    clientPromise ??= (
      createClient
        ? Promise.resolve(
            createClient({
              apiHost: projectConfig.host,
              apiKey: projectConfig.key,
            }),
          )
        : createPostHogNodeClient({
            apiHost: projectConfig.host,
            apiKey: projectConfig.key,
          })
    ).then((createdClient) => {
      client = createdClient;
      return createdClient;
    });

    return clientPromise;
  }

  function getBaseProperties(): Record<string, unknown> {
    return {
      appVersion,
      platform,
      process: "main",
    };
  }

  function captureEvent(event: TelemetryEventName, properties: Record<string, unknown> = {}): void {
    const pendingClient = getClient();
    if (!pendingClient) {
      return;
    }

    void pendingClient.then((posthog) => {
      posthog.capture({
        distinctId: anonId,
        event,
        properties: {
          ...getBaseProperties(),
          ...properties,
        },
      });
    });
  }

  function captureError(error: unknown, properties: Record<string, unknown> = {}): void {
    const pendingClient = getClient();
    if (!pendingClient) {
      return;
    }

    void pendingClient.then((posthog) => {
      posthog.captureException(error, anonId, {
        ...getBaseProperties(),
        ...properties,
      });
    });
  }

  function getBootstrap(): TelemetryBootstrap {
    return {
      anonId,
      enabled: isEnabled(),
      posthogHost: projectConfig?.host ?? null,
      posthogKey: projectConfig?.key ?? null,
    };
  }

  function shutdown(): void {
    void client?.shutdown();
  }

  return {
    captureError,
    captureEvent,
    getBootstrap,
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
