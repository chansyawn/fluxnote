import { describe, expect, it } from "vite-plus/test";

import { getAutomaticReleaseVersion, isSupportedReleaseVersion } from "./version.mjs";

describe("release version", () => {
  it("uses the next patch after the package version when there are no tags", () => {
    const version = getAutomaticReleaseVersion({
      packageVersion: "0.0.2",
      tagVersions: [],
    });

    expect(version).toBe("0.0.3");
  });

  it("uses the next patch after the latest stable tag when it is newer than package.json", () => {
    const version = getAutomaticReleaseVersion({
      packageVersion: "0.0.2",
      tagVersions: ["0.0.4", "0.0.5"],
    });

    expect(version).toBe("0.0.6");
  });

  it("ignores prerelease tags when choosing the automatic baseline", () => {
    const version = getAutomaticReleaseVersion({
      packageVersion: "0.2.9",
      tagVersions: ["0.3.0-beta.2"],
    });

    expect(version).toBe("0.2.10");
  });

  it("fails when there is no stable baseline for automatic release", () => {
    expect(() =>
      getAutomaticReleaseVersion({
        packageVersion: "0.3.0-beta.2",
        tagVersions: ["0.3.0-beta.3"],
      }),
    ).toThrow("No stable baseline version found.");
  });

  it("keeps explicit release version validation limited to supported formats", () => {
    expect(isSupportedReleaseVersion("0.2.0")).toBe(true);
    expect(isSupportedReleaseVersion("0.2.0-beta.1")).toBe(true);
    expect(isSupportedReleaseVersion("0.2.0-alpha.1")).toBe(false);
  });
});
