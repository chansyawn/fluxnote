#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import semver from "semver";

const supportedVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.(0|[1-9]\d*))?$/;

export function isSupportedReleaseVersion(version) {
  return supportedVersionPattern.test(version) && semver.valid(version) === version;
}

export function isStableVersion(version) {
  return semver.valid(version) === version && semver.prerelease(version) === null;
}

export function getLatestVersion(versions) {
  return semver.rsort(versions).at(0) ?? null;
}

export function getAutomaticReleaseVersion({ packageVersion, tagVersions }) {
  const validPackageVersion = isStableVersion(packageVersion) ? packageVersion : null;
  const stableTagVersions = tagVersions.filter(isStableVersion);
  const baselineVersion = getLatestVersion(
    [validPackageVersion, ...stableTagVersions].filter(Boolean),
  );

  if (!baselineVersion) {
    throw new Error("No stable baseline version found. Provide RELEASE_VERSION manually.");
  }

  return semver.inc(baselineVersion, "patch");
}

function readPackageJson() {
  return JSON.parse(readFileSync("package.json", "utf8"));
}

function writePackageJson(packageJson) {
  writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
}

function getReleaseVersion() {
  const version = process.env.RELEASE_VERSION?.trim();

  if (!version) {
    const automaticVersion = getAutomaticReleaseVersion({
      packageVersion: readPackageJson().version,
      tagVersions: getTagVersions(),
    });

    console.log(`No RELEASE_VERSION provided. Using ${automaticVersion}.`);
    return automaticVersion;
  }

  if (!isSupportedReleaseVersion(version)) {
    throw new Error(`Invalid version: ${version}. Use x.y.z or x.y.z-beta.n.`);
  }

  return version;
}

function getTagVersions() {
  return execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((tag) => tag.trim().replace(/^v/, ""))
    .filter(Boolean)
    .filter((tag) => semver.valid(tag));
}

function getLatestTagVersion() {
  return getLatestVersion(getTagVersions());
}

function getBaselineVersion() {
  const packageVersion = readPackageJson().version;
  const validPackageVersion = semver.valid(packageVersion) ? packageVersion : null;
  const latestTagVersion = getLatestTagVersion();
  const versions = [validPackageVersion, latestTagVersion].filter(Boolean);

  return semver.rsort(versions).at(0) ?? null;
}

function validateReleaseVersion() {
  const version = getReleaseVersion();
  const tag = `v${version}`;
  const exactTagExists =
    execFileSync("git", ["tag", "--list", tag], { encoding: "utf8" }).trim() === tag;

  if (exactTagExists) {
    throw new Error(`Tag ${tag} already exists.`);
  }

  const baselineVersion = getBaselineVersion();

  if (baselineVersion && !semver.gt(version, baselineVersion)) {
    throw new Error(`Version ${version} must be greater than ${baselineVersion}.`);
  }

  const prerelease = semver.prerelease(version) === null ? "false" : "true";

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `prerelease=${prerelease}\n`);
  }

  console.log(`Release version ${version} is valid.`);
}

function writeReleaseVersion() {
  const version = getReleaseVersion();
  const packageJson = readPackageJson();
  packageJson.version = version;
  writePackageJson(packageJson);
  console.log(`Updated package.json version to ${version}.`);
}

function main() {
  const command = process.argv.slice(2).find((argument) => argument !== "--");

  switch (command) {
    case "validate":
      validateReleaseVersion();
      break;
    case "write":
      writeReleaseVersion();
      break;
    default:
      throw new Error("Usage: node scripts/release/version.mjs <validate|write>");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
