import type { TelemetryBootstrap } from "@shared/features/telemetry/contract";

import { invokeCommand, subscribeEvent } from "./ipc/invoke";

export async function readTelemetryBootstrap(): Promise<TelemetryBootstrap> {
  return await invokeCommand("telemetry.bootstrap", undefined);
}

export function onTelemetryChanged(handler: (bootstrap: TelemetryBootstrap) => void): () => void {
  return subscribeEvent("telemetry.changed", handler);
}
