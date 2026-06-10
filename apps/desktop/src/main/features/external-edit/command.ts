import type { IpcRouter } from "@main/core/ipc";
import type { UserPreferences } from "@shared/features/preferences/user-preferences";

import type { ExternalEditRuntime } from "./runtime";

interface ExternalEditCommandDeps {
  hideMainWindow: () => Promise<void> | void;
  readUserPreferences: () => Promise<UserPreferences> | UserPreferences;
  runtime: Pick<ExternalEditRuntime, "cancel" | "capture" | "listSessions" | "submit">;
}

async function hideMainWindowAfterSubmit(deps: ExternalEditCommandDeps): Promise<void> {
  try {
    const preferences = await deps.readUserPreferences();
    if (preferences.externalEdit.hideAfterSubmit) {
      await deps.hideMainWindow();
    }
  } catch (error) {
    console.error("Failed to hide Fluxnotes after external edit submit", error);
  }
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
    const block = await deps.runtime.submit(input.editId, input.content);
    await hideMainWindowAfterSubmit(deps);
    return block;
  });
}
