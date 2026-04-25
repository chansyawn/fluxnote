import { invokeCommand } from "@renderer/app/invoke";

export interface CliStatus {
  installed: boolean;
}

export async function getCliStatus(): Promise<CliStatus> {
  return await invokeCommand("cliStatus", undefined);
}

export async function installCli(): Promise<void> {
  await invokeCommand("cliInstall", undefined);
}

export async function uninstallCli(): Promise<void> {
  await invokeCommand("cliUninstall", undefined);
}
