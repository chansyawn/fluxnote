#!/usr/bin/env node
import { execFileSync, type ExecFileSyncOptions } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredPrepareEnvNames = [
  "APPLE_API_KEY_BASE64",
  "APPLE_API_KEY_ID",
  "APPLE_API_ISSUER",
  "MACOS_CERTIFICATE_BASE64",
  "MACOS_CERTIFICATE_PASSWORD",
  "MACOS_SIGN_IDENTITY",
] as const;

const appleRootCertificateUrl = "https://www.apple.com/appleca/AppleIncRootCertificate.cer";
const developerIdG2CertificateUrl =
  "https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function assertRequiredEnv(names: readonly string[]): void {
  const missingNames = names.filter((name) => !process.env[name]?.trim());

  if (missingNames.length > 0) {
    throw new Error(
      `Missing required macOS release environment variables: ${missingNames.join(", ")}`,
    );
  }
}

function run(command: string, args: readonly string[], options: ExecFileSyncOptions = {}): void {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

async function downloadFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
}

function appendGithubEnv(values: Record<string, string>): void {
  const githubEnvPath = requireEnv("GITHUB_ENV");
  const content = Object.entries(values)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n");

  writeFileSync(githubEnvPath, `${content}\n`, { flag: "a" });
}

async function prepareSigningCredentials(): Promise<void> {
  assertRequiredEnv(requiredPrepareEnvNames);

  const runnerTemp = requireEnv("RUNNER_TEMP");
  const keychainPath = path.join(runnerTemp, "fluxnotes-signing.keychain-db");
  const certificatePath = path.join(runnerTemp, "developer-id-application.p12");
  const apiKeyPath = path.join(runnerTemp, `AuthKey_${requireEnv("APPLE_API_KEY_ID")}.p8`);
  const appleRootCertificatePath = path.join(runnerTemp, "AppleIncRootCertificate.cer");
  const developerIdG2CertificatePath = path.join(runnerTemp, "DeveloperIDG2CA.cer");

  writeFileSync(certificatePath, Buffer.from(requireEnv("MACOS_CERTIFICATE_BASE64"), "base64"), {
    mode: 0o600,
  });
  writeFileSync(apiKeyPath, Buffer.from(requireEnv("APPLE_API_KEY_BASE64"), "base64"), {
    mode: 0o600,
  });
  await downloadFile(appleRootCertificateUrl, appleRootCertificatePath);
  await downloadFile(developerIdG2CertificateUrl, developerIdG2CertificatePath);

  const certificatePassword = requireEnv("MACOS_CERTIFICATE_PASSWORD");

  run("security", ["create-keychain", "-p", certificatePassword, keychainPath]);
  run("security", ["set-keychain-settings", "-lut", "21600", keychainPath]);
  run("security", ["unlock-keychain", "-p", certificatePassword, keychainPath]);
  run("security", ["import", appleRootCertificatePath, "-A", "-k", keychainPath]);
  run("security", ["import", developerIdG2CertificatePath, "-A", "-k", keychainPath]);
  run("security", ["import", certificatePath, "-P", certificatePassword, "-A", "-k", keychainPath]);
  run("security", [
    "set-key-partition-list",
    "-S",
    "apple-tool:,apple:,codesign:",
    "-s",
    "-k",
    certificatePassword,
    keychainPath,
  ]);
  run("security", [
    "list-keychains",
    "-d",
    "user",
    "-s",
    keychainPath,
    "/Library/Keychains/System.keychain",
    "/System/Library/Keychains/SystemRootCertificates.keychain",
  ]);

  appendGithubEnv({
    APPLE_API_ISSUER: requireEnv("APPLE_API_ISSUER"),
    APPLE_API_KEY_ID: requireEnv("APPLE_API_KEY_ID"),
    APPLE_API_KEY_PATH: apiKeyPath,
    MACOS_SIGN_IDENTITY: requireEnv("MACOS_SIGN_IDENTITY"),
    MACOS_SIGNING_KEYCHAIN: keychainPath,
  });
}

function findFiles(directory: string, predicate: (filePath: string) => boolean): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter(predicate);
}

function findPackagedAppBundles(): string[] {
  if (!existsSync("out")) {
    return [];
  }

  return readdirSync("out", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageDirectoryPath = path.join(entry.parentPath, entry.name);

      return readdirSync(packageDirectoryPath, { withFileTypes: true })
        .filter((packageEntry) => packageEntry.isDirectory() && packageEntry.name.endsWith(".app"))
        .map((packageEntry) => path.join(packageEntry.parentPath, packageEntry.name));
    });
}

function notarizeDmgArtifacts(): void {
  const dmgPaths = findFiles("out/make", (filePath) => filePath.endsWith(".dmg"));

  if (dmgPaths.length === 0) {
    throw new Error("No macOS DMG artifacts found in out/make.");
  }

  for (const dmgPath of dmgPaths) {
    run("xcrun", [
      "notarytool",
      "submit",
      dmgPath,
      "--key",
      requireEnv("APPLE_API_KEY_PATH"),
      "--key-id",
      requireEnv("APPLE_API_KEY_ID"),
      "--issuer",
      requireEnv("APPLE_API_ISSUER"),
      "--wait",
    ]);
    run("xcrun", ["stapler", "staple", dmgPath]);
    run("xcrun", ["stapler", "validate", dmgPath]);
  }
}

function verifyMacArtifacts(): void {
  const appPaths = findPackagedAppBundles();

  if (appPaths.length === 0) {
    throw new Error("No packaged macOS app found.");
  }

  for (const appPath of appPaths) {
    const appContentsPath = path.join(appPath, "Contents");
    const nativeAddonPaths = findFiles(appContentsPath, (filePath) => filePath.endsWith(".node"));
    if (nativeAddonPaths.length === 0) {
      throw new Error("No native addon files found in packaged macOS app.");
    }
    for (const nativeAddonPath of nativeAddonPaths) {
      run("codesign", ["--verify", "--strict", "--verbose=2", nativeAddonPath]);
    }

    const macNativeDylibs = findFiles(
      appContentsPath,
      (filePath) => filePath.includes("mac-native") && filePath.endsWith(".dylib"),
    );
    if (macNativeDylibs.length > 0) {
      throw new Error(
        `Unexpected mac-native dynamic libraries found: ${macNativeDylibs.join(", ")}`,
      );
    }

    run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
    run("spctl", ["--assess", "--type", "execute", "--verbose=4", appPath]);
    run("xcrun", ["stapler", "validate", appPath]);
  }
}

function cleanupSigningKeychain(): void {
  const keychainPath = process.env.MACOS_SIGNING_KEYCHAIN?.trim();

  if (keychainPath) {
    run("security", ["delete-keychain", keychainPath]);
  }
}

async function main(): Promise<void> {
  const command = process.argv.slice(2).find((argument) => argument !== "--");

  switch (command) {
    case "prepare":
      await prepareSigningCredentials();
      break;
    case "notarize-dmg":
      notarizeDmgArtifacts();
      break;
    case "verify":
      verifyMacArtifacts();
      break;
    case "cleanup":
      cleanupSigningKeychain();
      break;
    default:
      throw new Error("Usage: node scripts/release/macos.ts <prepare|notarize-dmg|verify|cleanup>");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
