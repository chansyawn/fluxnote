import type { TelemetryBootstrap } from "@shared/features/telemetry/contract";

import { invokeCommand } from "./ipc/invoke";

export async function readTelemetryBootstrap(): Promise<TelemetryBootstrap> {
  return await invokeCommand("telemetry.bootstrap", undefined);
}
