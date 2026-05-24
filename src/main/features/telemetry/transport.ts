import { type PostHogProjectConfig } from "@shared/features/telemetry/config";
import type { TelemetryEventName } from "@shared/features/telemetry/contract";
import type { PostHog } from "posthog-node";

export type PostHogNodeClient = Pick<PostHog, "capture" | "captureException" | "shutdown">;

export interface TelemetryClientFactoryDeps {
  apiHost: string;
  apiKey: string;
}

type TelemetryClientFactory = (
  deps: TelemetryClientFactoryDeps,
) => PostHogNodeClient | Promise<PostHogNodeClient>;

interface TelemetryTransportDeps {
  anonId: string;
  createClient?: TelemetryClientFactory;
  getBaseProperties: () => Record<string, unknown>;
  isEnabled: () => boolean;
  projectConfig: PostHogProjectConfig | null;
}

export interface TelemetryTransport {
  captureError: (error: unknown, properties?: Record<string, unknown>) => void;
  captureEvent: (event: TelemetryEventName, properties?: Record<string, unknown>) => void;
  shutdown: () => void;
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

export function createTelemetryTransport({
  anonId,
  createClient,
  getBaseProperties,
  isEnabled,
  projectConfig,
}: TelemetryTransportDeps): TelemetryTransport {
  let client: PostHogNodeClient | null = null;
  let clientPromise: Promise<PostHogNodeClient> | null = null;

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

  function shutdown(): void {
    void client?.shutdown();
  }

  return {
    captureError,
    captureEvent,
    shutdown,
  };
}
