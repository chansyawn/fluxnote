import { readFileSync } from "node:fs";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type {
  ForgeArch,
  ForgeConfig,
  ForgeMakeResult,
  ForgePlatform,
} from "@electron-forge/shared-types";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { convertVersion } from "electron-winstaller";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

async function copyCliResources(buildPath: string): Promise<void> {
  const resourcesCliPath = path.resolve(buildPath, "..", "cli");
  await mkdir(resourcesCliPath, { recursive: true });
  await cp("src/cli/flux", path.join(resourcesCliPath, "flux"));
  await cp("src/cli/flux.cmd", path.join(resourcesCliPath, "flux.cmd"));
  await cp(".vite/cli/flux-cli.mjs", path.join(resourcesCliPath, "flux-cli.mjs"));
}

export type ReleaseArtifactKind = "dmg" | "full-nupkg" | "releases" | "setup" | "zip";

interface ReleaseArtifactNameOptions {
  arch: ForgeArch;
  kind: ReleaseArtifactKind;
  platform: ForgePlatform;
  version: string;
}

const artifactPlatformNames: Partial<Record<ForgePlatform, string>> = {
  darwin: "macos",
  win32: "windows",
};

function getArtifactPlatformName(platform: ForgePlatform): string {
  return artifactPlatformNames[platform] ?? platform;
}

function getPackageVersion(packageJSON: ForgeMakeResult["packageJSON"]): string {
  return String((packageJSON as { version: unknown }).version);
}

export function getReleaseArtifactName({
  arch,
  kind,
  platform,
  version,
}: ReleaseArtifactNameOptions): string {
  const baseName = `fluxnotes-${version}-${getArtifactPlatformName(platform)}-${arch}`;

  switch (kind) {
    case "dmg":
      return `${baseName}.dmg`;
    case "full-nupkg":
      return `${baseName}-full.nupkg`;
    case "releases":
      return `${baseName}-releases`;
    case "setup":
      return `${baseName}-setup.exe`;
    case "zip":
      return `${baseName}.zip`;
  }
}

function getReleaseArtifactPath(
  currentArtifactPath: string,
  options: ReleaseArtifactNameOptions,
): string {
  return path.join(path.dirname(currentArtifactPath), getReleaseArtifactName(options));
}

async function renameArtifact(
  currentArtifactPath: string,
  options: ReleaseArtifactNameOptions,
): Promise<string> {
  const nextArtifactPath = getReleaseArtifactPath(currentArtifactPath, options);

  if (currentArtifactPath !== nextArtifactPath) {
    await rename(currentArtifactPath, nextArtifactPath);
  }

  return nextArtifactPath;
}

async function renameSquirrelArtifacts(
  artifacts: readonly string[],
  platform: ForgePlatform,
  arch: ForgeArch,
  version: string,
): Promise<string[]> {
  const nextArtifacts = [...artifacts];
  const releasesIndex = nextArtifacts.findIndex(
    (artifact) => path.basename(artifact) === "RELEASES",
  );
  const fullNupkgIndex = nextArtifacts.findIndex((artifact) => artifact.endsWith("-full.nupkg"));

  if (fullNupkgIndex >= 0) {
    const currentFullNupkgPath = nextArtifacts[fullNupkgIndex];
    const nextFullNupkgPath = await renameArtifact(currentFullNupkgPath, {
      arch,
      kind: "full-nupkg",
      platform,
      version,
    });
    nextArtifacts[fullNupkgIndex] = nextFullNupkgPath;

    if (releasesIndex >= 0) {
      const currentReleasesPath = nextArtifacts[releasesIndex];
      const currentPackageName = path.basename(currentFullNupkgPath);
      const nextPackageName = path.basename(nextFullNupkgPath);
      const releasesContent = await readFile(currentReleasesPath, "utf8");
      await writeFile(
        currentReleasesPath,
        releasesContent.replaceAll(currentPackageName, nextPackageName),
      );
    }
  }

  if (releasesIndex >= 0) {
    nextArtifacts[releasesIndex] = await renameArtifact(nextArtifacts[releasesIndex], {
      arch,
      kind: "releases",
      platform,
      version,
    });
  }

  return nextArtifacts;
}

export async function normalizeMakeArtifacts(
  makeResults: ForgeMakeResult[],
): Promise<ForgeMakeResult[]> {
  return await Promise.all(
    makeResults.map(async (makeResult) => {
      const { arch, platform } = makeResult;
      const version = getPackageVersion(makeResult.packageJSON);

      if (platform === "darwin") {
        return {
          ...makeResult,
          artifacts: await Promise.all(
            makeResult.artifacts.map(async (artifact) => {
              if (artifact.endsWith(".zip")) {
                return await renameArtifact(artifact, { arch, kind: "zip", platform, version });
              }

              return artifact;
            }),
          ),
        };
      }

      if (platform === "win32") {
        return {
          ...makeResult,
          artifacts: await renameSquirrelArtifacts(makeResult.artifacts, platform, arch, version),
        };
      }

      return makeResult;
    }),
  );
}

function getEnvPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8")) as {
    version: string;
  };
  return packageJson.version;
}

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: "app.fluxnotes",
    appCopyright: "Copyright (c) 2026 Fluxnotes",
    appCategoryType: "public.app-category.productivity",
    asar: true,
    executableName: "fluxnotes",
    extraResource: ["src/main/core/database/drizzle", "src/assets"],
    icon: "src/assets/icons/icon",
    name: "Fluxnotes",
    protocols: [
      {
        name: "Fluxnotes",
        schemes: ["flux"],
      },
    ],
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      await copyCliResources(buildPath);
    },
    postMake: async (_config, makeResults) => {
      return await normalizeMakeArtifacts(makeResults);
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerDMG(
      (arch) => ({
        name: path.basename(
          getReleaseArtifactName({
            arch,
            kind: "dmg",
            platform: "darwin",
            version: getEnvPackageVersion(),
          }),
          ".dmg",
        ),
      }),
      ["darwin"],
    ),
    new MakerZIP({}, ["darwin"]),
    new MakerSquirrel((arch) => ({
      setupExe: getReleaseArtifactName({
        arch,
        kind: "setup",
        platform: "win32",
        version: convertVersion(getEnvPackageVersion()),
      }),
    })),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload/index.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
        {
          entry: "src/cli/index.ts",
          config: "vite.cli.config.ts",
          target: "main",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
