import path from "node:path";

import type { ForgeConfig } from "@electron-forge/shared-types";

type PackagerConfig = NonNullable<ForgeConfig["packagerConfig"]>;
type MacSigningConfig = Pick<PackagerConfig, "osxNotarize" | "osxSign">;
type PackagerOsxSignConfig = Exclude<NonNullable<PackagerConfig["osxSign"]>, true>;
type StrictOsxSignConfig = PackagerOsxSignConfig & { continueOnError: false };

const macSigningEnvNames = ["MACOS_SIGN_IDENTITY"] as const;
const macNotarizeEnvNames = ["APPLE_API_ISSUER", "APPLE_API_KEY_ID", "APPLE_API_KEY_PATH"] as const;

type MacSigningEnvName = (typeof macSigningEnvNames)[number];
type MacNotarizeEnvName = (typeof macNotarizeEnvNames)[number];

function readMacSigningEnv(): Partial<Record<MacSigningEnvName, string>> {
  return Object.fromEntries(
    macSigningEnvNames.map((name) => [name, process.env[name]?.trim()]).filter((entry) => entry[1]),
  ) as Partial<Record<MacSigningEnvName, string>>;
}

function readMacNotarizeEnv(): Partial<Record<MacNotarizeEnvName, string>> {
  return Object.fromEntries(
    macNotarizeEnvNames
      .map((name) => [name, process.env[name]?.trim()])
      .filter((entry) => entry[1]),
  ) as Partial<Record<MacNotarizeEnvName, string>>;
}

function assertCompleteEnv<T extends string>(
  env: Partial<Record<T, string>>,
  envNames: readonly T[],
  label: string,
): asserts env is Record<T, string> {
  const missingNames = envNames.filter((name) => !env[name]);

  if (missingNames.length > 0) {
    throw new Error(`Missing ${label} environment variables: ${missingNames.join(", ")}`);
  }
}

export function getMacSigningConfig(rootDir: string): Partial<MacSigningConfig> {
  if (process.platform !== "darwin") {
    return {};
  }

  const env = readMacSigningEnv();
  const configuredEnvCount = Object.keys(env).length;
  const notarizeEnv = readMacNotarizeEnv();
  const configuredNotarizeEnvCount = Object.keys(notarizeEnv).length;

  if (configuredEnvCount === 0 && configuredNotarizeEnvCount === 0) {
    return {};
  }

  assertCompleteEnv(env, macSigningEnvNames, "macOS signing");

  if (configuredNotarizeEnvCount > 0) {
    assertCompleteEnv(notarizeEnv, macNotarizeEnvNames, "macOS notarization");
  }

  const osxSign = Object.assign(
    {
      identity: env.MACOS_SIGN_IDENTITY,
      optionsForFile: (filePath) => ({
        entitlements: filePath.includes(".app/")
          ? path.join(rootDir, "config/forge/entitlements.mac.inherit.plist")
          : path.join(rootDir, "config/forge/entitlements.mac.plist"),
        hardenedRuntime: true,
      }),
    } satisfies PackagerOsxSignConfig,
    { continueOnError: false as const },
  ) satisfies StrictOsxSignConfig;
  const config: Partial<MacSigningConfig> = { osxSign };

  if (configuredNotarizeEnvCount > 0) {
    assertCompleteEnv(notarizeEnv, macNotarizeEnvNames, "macOS notarization");
    config.osxNotarize = {
      appleApiIssuer: notarizeEnv.APPLE_API_ISSUER,
      appleApiKey: notarizeEnv.APPLE_API_KEY_PATH,
      appleApiKeyId: notarizeEnv.APPLE_API_KEY_ID,
    };
  }

  return config;
}
