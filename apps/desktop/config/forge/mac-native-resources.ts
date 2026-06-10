import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ForgePlatform } from "@electron-forge/shared-types";

const macNativePackageName = "@fluxnotes/mac-native";

export async function copyMacNativeResources(
  buildPath: string,
  platform: ForgePlatform,
): Promise<void> {
  const packageRoot = path.resolve("..", "..", "packages", "mac-native");
  const targetPackageRoot = path.join(buildPath, "node_modules", "@fluxnotes", "mac-native");
  const targetBuildPath = path.join(targetPackageRoot, "build", "Release");
  const targetSourcePath = path.join(targetPackageRoot, "src");

  await mkdir(targetSourcePath, { recursive: true });

  await Promise.all([
    cp(path.join(packageRoot, "src", "index.cjs"), path.join(targetSourcePath, "index.cjs")),
    writeFile(
      path.join(targetPackageRoot, "package.json"),
      `${JSON.stringify(
        {
          name: macNativePackageName,
          private: true,
          type: "module",
          exports: {
            ".": {
              require: "./src/index.cjs",
            },
          },
        },
        null,
        2,
      )}\n`,
    ),
  ]);

  if (platform !== "darwin") {
    return;
  }

  await mkdir(targetBuildPath, { recursive: true });
  await cp(
    path.join(packageRoot, "build", "Release", "mac_native.node"),
    path.join(targetBuildPath, "mac_native.node"),
  );
}
