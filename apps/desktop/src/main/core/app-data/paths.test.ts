import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { createAppDataPaths } from "./paths";

describe("createAppDataPaths", () => {
  it("builds database and asset paths from userData", () => {
    const userDataPath = "/tmp/fluxnotes-user";
    const paths = createAppDataPaths({
      assetsDirName: "assets",
      databaseFileName: "fluxnotes.db",
      userDataPath,
    });

    expect(paths.databasePath).toBe(path.join(userDataPath, "fluxnotes.db"));
    expect(paths.assetsRootPath).toBe(path.join(userDataPath, "assets"));
    expect(paths.assetPathForBlock("block-1")).toBe(path.join(userDataPath, "assets", "block-1"));
  });
});
