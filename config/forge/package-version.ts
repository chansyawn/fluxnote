import { readFileSync } from "node:fs";
import path from "node:path";

export function readPackageVersion(rootDir: string): string {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8")) as {
    version: string;
  };
  return packageJson.version;
}
