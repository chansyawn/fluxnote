import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import { cliApi } from "@shared/features/cli";

import { installCli, isCliInstalled, uninstallCli } from "./install-cli";

export function createCliFeature() {
  return defineBackendFeature(cliApi, {
    commands: {
      async install() {
        await installCli();
        return undefined;
      },
      async status() {
        return { installed: await isCliInstalled() };
      },
      async uninstall() {
        await uninstallCli();
        return undefined;
      },
    },
  });
}
