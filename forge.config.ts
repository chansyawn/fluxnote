import { execSync } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

import { MakerZIP } from "@electron-forge/maker-zip";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const NATIVE_RUNTIME_DEPENDENCIES = ["better-sqlite3", "bindings", "file-uri-to-path"];

async function copyNativeRuntimeDependencies(buildPath: string): Promise<void> {
  const buildNodeModulesPath = path.join(buildPath, "node_modules");

  await mkdir(buildNodeModulesPath, { recursive: true });
  await Promise.all(
    NATIVE_RUNTIME_DEPENDENCIES.map((dependency) =>
      cp(path.join("node_modules", dependency), path.join(buildNodeModulesPath, dependency), {
        dereference: true,
        recursive: true,
      }),
    ),
  );
}

async function copyCliResources(buildPath: string): Promise<void> {
  const resourcesCliPath = path.resolve(buildPath, "..", "cli");
  await mkdir(resourcesCliPath, { recursive: true });
  await cp("src/cli/flux", path.join(resourcesCliPath, "flux"));
  await cp(".vite/cli/flux-cli.mjs", path.join(resourcesCliPath, "flux-cli.mjs"));
}

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: "app.fluxnote",
    appCategoryType: "public.app-category.productivity",
    asar: true,
    extraResource: ["src/main/features/database/drizzle", "src/assets"],
    icon: "src/assets/icons/icon",
    name: "fluxnote",
    protocols: [
      {
        name: "FluxNote",
        schemes: ["fluxnote"],
      },
    ],
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      execSync("vp build -c vite.cli.config.ts", { stdio: "inherit" });
      await copyNativeRuntimeDependencies(buildPath);
      await copyCliResources(buildPath);
    },
  },
  rebuildConfig: {},
  makers: [new MakerZIP({}, ["darwin"])],
  plugins: [
    new AutoUnpackNativesPlugin({}),
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
