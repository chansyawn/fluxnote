import type { IpcRouter } from "@main/core/ipc";

import type { ExternalEditRuntime } from "./runtime";

interface ExternalEditCommandDeps {
  runtime: Pick<ExternalEditRuntime, "cancel" | "capture" | "listSessions" | "submit">;
}

export function registerExternalEditCommands(ipc: IpcRouter, deps: ExternalEditCommandDeps): void {
  ipc.command("external-edit.capture", async () => {
    return await deps.runtime.capture();
  });

  ipc.command("external-edit.cancel", async (input) => {
    await deps.runtime.cancel(input.editId);
    return undefined;
  });

  ipc.command("external-edit.list", async () => {
    return deps.runtime.listSessions();
  });

  ipc.command("external-edit.submit", async (input) => {
    return await deps.runtime.submit(input.editId, input.content);
  });
}
