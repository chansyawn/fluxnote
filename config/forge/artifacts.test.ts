import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ForgeMakeResult } from "@electron-forge/shared-types";
import { describe, expect, it } from "vitest";

import { getReleaseArtifactName, normalizeMakeArtifacts } from "./artifacts";

async function writeArtifact(directory: string, fileName: string, content = ""): Promise<string> {
  const filePath = path.join(directory, fileName);
  await writeFile(filePath, content);
  return filePath;
}

function makeResult(overrides: Partial<ForgeMakeResult>): ForgeMakeResult {
  return {
    arch: "arm64",
    artifacts: [],
    packageJSON: { version: "1.2.3" },
    platform: "darwin",
    ...overrides,
  };
}

describe("forge artifact naming", () => {
  it("builds stable release artifact names", () => {
    expect(
      getReleaseArtifactName({
        arch: "arm64",
        kind: "zip",
        platform: "darwin",
        version: "1.2.3",
      }),
    ).toBe("fluxnotes-1.2.3-darwin-arm64.zip");
    expect(
      getReleaseArtifactName({
        arch: "x64",
        kind: "setup",
        platform: "win32",
        version: "1.2.3",
      }),
    ).toBe("fluxnotes-1.2.3-win32-x64-setup.exe");
    expect(
      getReleaseArtifactName({
        arch: "x64",
        kind: "dmg",
        platform: "linux",
        version: "1.2.3",
      }),
    ).toBe("fluxnotes-1.2.3-linux-x64.dmg");
  });
});

describe("normalizeMakeArtifacts", () => {
  it("renames darwin dmg and zip artifacts", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fluxnotes-forge-"));
    const zipPath = await writeArtifact(directory, "Fluxnotes-darwin-arm64-1.2.3.zip");
    const dmgPath = await writeArtifact(directory, "Fluxnotes.dmg");

    const [result] = await normalizeMakeArtifacts([
      makeResult({ artifacts: [zipPath, dmgPath], platform: "darwin" }),
    ]);

    expect(result?.artifacts).toEqual([
      path.join(directory, "fluxnotes-1.2.3-darwin-arm64.zip"),
      path.join(directory, "fluxnotes-1.2.3-darwin-arm64.dmg"),
    ]);
  });

  it("renames windows squirrel artifacts and updates RELEASES", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "fluxnotes-forge-"));
    const releasesPath = await writeArtifact(
      directory,
      "RELEASES",
      "hash old-1.2.3-full.nupkg 123",
    );
    const setupPath = await writeArtifact(directory, "FluxnotesSetup.exe");
    const nupkgPath = await writeArtifact(directory, "old-1.2.3-full.nupkg");

    const [result] = await normalizeMakeArtifacts([
      makeResult({
        arch: "x64",
        artifacts: [releasesPath, setupPath, nupkgPath],
        platform: "win32",
      }),
    ]);

    const nextReleasesPath = path.join(directory, "fluxnotes-1.2.3-win32-x64-RELEASES");
    const nextNupkgPath = path.join(directory, "fluxnotes-1.2.3-win32-x64-full.nupkg");

    expect(result?.artifacts).toEqual([nextReleasesPath, setupPath, nextNupkgPath]);
    await expect(readFile(nextReleasesPath, "utf8")).resolves.toBe(
      "hash fluxnotes-1.2.3-win32-x64-full.nupkg 123",
    );
  });
});
