import type { IpcRouter } from "@main/core/ipc/register-ipc";

export function registerPreferencesCommands(ipc: IpcRouter): void {
  ipc.command("preferences.patch", (input, ctx) => {
    return ctx.preferencesService.patchSettings(input);
  });

  ipc.command("preferences.read", (_input, ctx) => {
    return ctx.preferencesService.readSettings();
  });

  ipc.command("preferences.reset", (_input, ctx) => {
    return ctx.preferencesService.resetSettings();
  });
}
