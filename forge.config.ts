import path from "node:path";
import { fileURLToPath } from "node:url";

import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";
import type { FuseConfig } from "@electron/fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

import { getReleaseArtifactName, normalizeMakeArtifacts } from "./config/forge/artifacts";
import { copyCliResources } from "./config/forge/cli-resources";
import { getMacSigningConfig } from "./config/forge/mac-signing";
import { readPackageVersion } from "./config/forge/package-version";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packageVersion = readPackageVersion(rootDir);
const appIconPath = "src/assets/icons/icon";
const macInstallerIconPath = "src/assets/icons/icon.icns";
const windowsInstallerIconPath = "src/assets/icons/icon.ico";
const dmgBackgroundPath = "src/assets/makers/dmg-background.png";

const packagerConfig = {
  appBundleId: "app.fluxnotes",
  appCopyright: "Copyright (c) 2026 Fluxnotes",
  appCategoryType: "public.app-category.productivity",
  asar: true,
  executableName: "Fluxnotes",
  extendInfo: {
    LSUIElement: true,
  },
  extraResource: ["src/main/core/database/drizzle", "src/assets"],
  icon: appIconPath,
  name: "Fluxnotes",
  protocols: [
    {
      name: "Fluxnotes",
      schemes: ["flux"],
    },
  ],
  ...getMacSigningConfig(rootDir),
} satisfies ForgeConfig["packagerConfig"];

const vitePluginConfig = {
  build: [
    {
      entry: "src/main/index.ts",
      config: "config/vite/vite.main.config.ts",
      target: "main",
    },
    {
      entry: "src/preload/index.ts",
      config: "config/vite/vite.preload.config.ts",
      target: "preload",
    },
    {
      entry: "src/cli/index.ts",
      config: "config/vite/vite.cli.config.ts",
      target: "main",
    },
  ],
  renderer: [
    {
      name: "main_window",
      config: "config/vite/vite.renderer.config.ts",
    },
  ],
} satisfies ConstructorParameters<typeof VitePlugin>[0];

const fuseConfig = {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: true,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
} satisfies FuseConfig;

const config: ForgeConfig = {
  packagerConfig,
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
      (_arch) => ({
        background: dmgBackgroundPath,
        contents: (opts) => [
          { path: opts.appPath, type: "file", x: 200, y: 210 },
          { path: "/Applications", type: "link", x: 460, y: 210 },
        ],
        additionalDMGOptions: { window: { size: { width: 660, height: 420 } } },
        icon: macInstallerIconPath,
        iconSize: 80,
        name: "Fluxnotes",
        title: "Fluxnotes",
      }),
      ["darwin"],
    ),
    new MakerZIP({}, ["darwin"]),
    new MakerSquirrel((arch) => ({
      setupIcon: windowsInstallerIconPath,
      setupExe: getReleaseArtifactName({
        arch,
        kind: "setup",
        platform: "win32",
        version: packageVersion,
      }),
    })),
  ],
  plugins: [new VitePlugin(vitePluginConfig), new FusesPlugin(fuseConfig)],
};

export default config;
