import path from "node:path";

import { describe, expect, it } from "vitest";

import { createPersistencePaths } from "./paths";

describe("createPersistencePaths", () => {
  it("builds database and asset paths from userData", () => {
    const base = "/tmp/fluxnotes-user";
    const paths = createPersistencePaths({
      assetsDirName: "assets",
      databaseFileName: "fluxnotes.db",
      getUserDataPath: () => base,
    });

    expect(paths.getDatabasePath()).toBe(path.join(base, "fluxnotes.db"));
    expect(paths.getAssetsRootPath()).toBe(path.join(base, "assets"));
    expect(paths.getAssetPathForBlock("block-1")).toBe(path.join(base, "assets", "block-1"));
  });
});
