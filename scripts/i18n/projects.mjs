import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const i18nProjects = [
  {
    name: "editor",
    rootDir: path.join(repositoryRoot, "packages/editor"),
    compileAfterExtract: true,
  },
  {
    name: "desktop",
    rootDir: path.join(repositoryRoot, "apps/desktop"),
    compileAfterExtract: false,
  },
];
