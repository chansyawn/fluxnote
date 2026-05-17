import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const cliResources = {
  "src/cli/flux": "flux",
  "src/cli/flux.cmd": "flux.cmd",
  ".vite/cli/flux-cli.mjs": "flux-cli.mjs",
} as const;

export async function copyCliResources(buildPath: string): Promise<void> {
  const resourcesCliPath = path.resolve(buildPath, "..", "cli");
  await mkdir(resourcesCliPath, { recursive: true });
  await Promise.all(
    Object.entries(cliResources).map(async ([sourcePath, fileName]) => {
      await cp(sourcePath, path.join(resourcesCliPath, fileName));
    }),
  );
}
