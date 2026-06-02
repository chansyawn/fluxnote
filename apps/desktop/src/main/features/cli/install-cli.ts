import {
  assertCliPlatformSupported,
  assertCliWrapperExists,
  assertWindowsCliScriptExists,
  createUnsupportedCliStatus,
  type CliInstallStatus,
} from "./cli-install-target";
import {
  getMacOSCliStatus,
  getMacOSCliTarget,
  installMacOSCli,
  uninstallMacOSCli,
} from "./macos-cli-link";
import {
  getWindowsCliStatus,
  getWindowsCliTarget,
  installWindowsCli,
  uninstallWindowsCli,
} from "./windows-cli-shim";

export async function getCliStatus(): Promise<CliInstallStatus> {
  if (process.platform === "darwin") {
    return await getMacOSCliStatus();
  }

  if (process.platform === "win32") {
    return await getWindowsCliStatus();
  }

  return createUnsupportedCliStatus();
}

export async function isCliInstalled(): Promise<boolean> {
  return (await getCliStatus()).installed;
}

export async function installCli(): Promise<void> {
  assertCliPlatformSupported();

  if (process.platform === "win32") {
    const target = getWindowsCliTarget();
    await assertWindowsCliScriptExists(target);
    await installWindowsCli(target);
    return;
  }

  const target = getMacOSCliTarget();
  await assertCliWrapperExists(target);
  await installMacOSCli(target);
}

export async function uninstallCli(): Promise<void> {
  assertCliPlatformSupported();

  if (process.platform === "win32") {
    await uninstallWindowsCli(getWindowsCliTarget());
    return;
  }

  await uninstallMacOSCli(getMacOSCliTarget());
}
