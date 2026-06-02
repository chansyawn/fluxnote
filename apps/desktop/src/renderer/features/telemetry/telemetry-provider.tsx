import { onTelemetryChanged, readTelemetryBootstrap } from "@renderer/clients";
import {
  configureRendererTelemetry,
  getPostHogClient,
} from "@renderer/features/telemetry/telemetry-client";
import { PostHogProvider } from "posthog-js/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface TelemetryProviderProps {
  children: ReactNode;
}

export function TelemetryProvider({ children }: TelemetryProviderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTelemetry(): Promise<void> {
      const bootstrap = await readTelemetryBootstrap();
      if (cancelled) {
        return;
      }

      configureRendererTelemetry(bootstrap);
      setReady(true);
    }

    void loadTelemetry().catch((error) => {
      console.error("Failed to initialize telemetry", error);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onTelemetryChanged(configureRendererTelemetry);
  }, []);

  if (!ready) {
    return null;
  }

  return <PostHogProvider client={getPostHogClient()}>{children}</PostHogProvider>;
}
