import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { i18nProjects, repositoryRoot } from "./projects.mjs";

const rootRequire = createRequire(pathToFileURL(path.join(repositoryRoot, "package.json")));
const linguiCliPath = path.join(path.dirname(rootRequire.resolve("@lingui/cli")), "lingui.js");

function run(project, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [linguiCliPath, ...args], {
      cwd: project.rootDir,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${project.name}: lingui ${args.join(" ")} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

for (const project of i18nProjects) {
  await run(project, ["extract", "--overwrite", "--clean"]);

  if (project.compileAfterExtract) {
    await run(project, ["compile", "--namespace", "es", "--typescript"]);
  }
}
