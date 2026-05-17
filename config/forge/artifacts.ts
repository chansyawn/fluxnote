import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ForgeArch, ForgeMakeResult, ForgePlatform } from "@electron-forge/shared-types";

export type ReleaseArtifactKind = "dmg" | "full-nupkg" | "releases" | "setup" | "zip";

interface ReleaseArtifactNameOptions {
  arch: ForgeArch;
  kind: ReleaseArtifactKind;
  platform: ForgePlatform;
  version: string;
}

type ArtifactIdentity = Omit<ReleaseArtifactNameOptions, "kind">;

const artifactPlatformNames: Partial<Record<ForgePlatform, string>> = {
  darwin: "macos",
  win32: "windows",
};

const artifactNameSuffixes = {
  dmg: ".dmg",
  "full-nupkg": "-full.nupkg",
  releases: "-releases",
  setup: "-setup.exe",
  zip: ".zip",
} satisfies Record<ReleaseArtifactKind, string>;

function getArtifactPlatformName(platform: ForgePlatform): string {
  return artifactPlatformNames[platform] ?? platform;
}

function getArtifactBaseName({ arch, platform, version }: ArtifactIdentity): string {
  return `fluxnotes-${version}-${getArtifactPlatformName(platform)}-${arch}`;
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
  return `${getArtifactBaseName({ arch, platform, version })}${artifactNameSuffixes[kind]}`;
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
  const releasesPath = artifacts.find((artifact) => path.basename(artifact) === "RELEASES");
  const fullNupkgPath = artifacts.find((artifact) => artifact.endsWith("-full.nupkg"));
  const renamedArtifacts = await Promise.all(
    artifacts.map(async (artifact) => {
      if (artifact === releasesPath) {
        return await renameArtifact(artifact, { arch, kind: "releases", platform, version });
      }

      if (artifact === fullNupkgPath) {
        return await renameArtifact(artifact, { arch, kind: "full-nupkg", platform, version });
      }

      return artifact;
    }),
  );

  if (releasesPath && fullNupkgPath) {
    const nextReleasesPath = renamedArtifacts[artifacts.indexOf(releasesPath)];
    const nextFullNupkgPath = renamedArtifacts[artifacts.indexOf(fullNupkgPath)];
    const releasesContent = await readFile(nextReleasesPath, "utf8");
    await writeFile(
      nextReleasesPath,
      releasesContent.replaceAll(path.basename(fullNupkgPath), path.basename(nextFullNupkgPath)),
    );
  }

  return renamedArtifacts;
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
              if (artifact.endsWith(".dmg")) {
                return await renameArtifact(artifact, { arch, kind: "dmg", platform, version });
              }

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
