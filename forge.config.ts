import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

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
    extraResource: ["src/main/core/database/drizzle", "src/assets"],
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
      await copyCliResources(buildPath);
    },
  },
  rebuildConfig: {},
  makers: [new MakerZIP({}, ["darwin"])],
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
