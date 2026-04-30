import { createFeatureClient } from "@renderer/app/ipc-client";
import { cliApi } from "@shared/features/cli";

export interface CliStatus {
  installed: boolean;
}

const cliClient = createFeatureClient(cliApi);

export async function getCliStatus(): Promise<CliStatus> {
  return await cliClient.commands.status(undefined);
}

export async function installCli(): Promise<void> {
  await cliClient.commands.install(undefined);
}

export async function uninstallCli(): Promise<void> {
  await cliClient.commands.uninstall(undefined);
}
