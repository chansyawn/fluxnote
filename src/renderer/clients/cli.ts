import { invokeCommand } from "./ipc/invoke";

export interface CliStatus {
  installed: boolean;
}

export async function getCliStatus(): Promise<CliStatus> {
  return await invokeCommand("cli.status", undefined);
}

export async function installCli(): Promise<void> {
  await invokeCommand("cli.install", undefined);
}

export async function uninstallCli(): Promise<void> {
  await invokeCommand("cli.uninstall", undefined);
}
