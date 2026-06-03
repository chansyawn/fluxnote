import type { IpcRouter } from "@main/core/ipc";

import type { TelemetryService } from "./service";

interface TelemetryCommandDeps {
  telemetryService: Pick<TelemetryService, "getBootstrap">;
}

export function registerTelemetryCommands(ipc: IpcRouter, deps: TelemetryCommandDeps): void {
  ipc.command("telemetry.bootstrap", () => {
    return deps.telemetryService.getBootstrap();
  });
}
