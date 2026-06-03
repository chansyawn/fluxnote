import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { i18nProjects, repositoryRoot } from "./projects.mjs";

const rootRequire = createRequire(pathToFileURL(path.join(repositoryRoot, "package.json")));
const { formatter } = rootRequire("@lingui/format-po");
const poFormatter = formatter();
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

async function readLinguiConfig(project) {
  const configPath = path.join(project.rootDir, "lingui.config.ts");
  const configModule = await import(pathToFileURL(configPath).href);
  return configModule.default;
}

function readShippedLocales(linguiConfig) {
  return linguiConfig.locales
    .filter(
      (locale) => locale !== linguiConfig.sourceLocale && locale !== linguiConfig.pseudoLocale,
    )
    .sort();
}

function resolveCatalogPath(catalogPath, locale) {
  const poPath = `${catalogPath.replace("<rootDir>/", "").replace("<rootDir>", "").replace("{locale}", locale)}.po`;

  return path.normalize(poPath);
}

function getCatalogPaths(linguiConfig, locale) {
  return linguiConfig.catalogs.map((catalog) => resolveCatalogPath(catalog.path, locale));
}

async function readCatalog(project, relativePath) {
  return [relativePath, await readFile(path.join(project.rootDir, relativePath), "utf8")];
}

async function readCatalogSnapshot(project, linguiConfig) {
  const catalogPaths = linguiConfig.locales.flatMap((locale) =>
    getCatalogPaths(linguiConfig, locale),
  );
  return new Map(
    await Promise.all(catalogPaths.map((catalogPath) => readCatalog(project, catalogPath))),
  );
}

function findChangedCatalogs(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);

  return [...paths]
    .filter((catalogPath) => before.get(catalogPath) !== after.get(catalogPath))
    .sort((left, right) => left.localeCompare(right));
}

async function findMissingTranslations(project, linguiConfig) {
  const missing = [];

  for (const locale of readShippedLocales(linguiConfig)) {
    for (const relativePath of getCatalogPaths(linguiConfig, locale)) {
      const catalog = poFormatter.parse(
        await readFile(path.join(project.rootDir, relativePath), "utf8"),
      );

      for (const [id, message] of Object.entries(catalog)) {
        if (!message.obsolete && message.translation.trim() === "") {
          missing.push({ id, locale, path: relativePath, project: project.name });
        }
      }
    }
  }

  return missing;
}

const changedCatalogs = [];
const missing = [];

for (const project of i18nProjects) {
  const linguiConfig = await readLinguiConfig(project);
  const beforeExtract = await readCatalogSnapshot(project, linguiConfig);
  await run(project, ["extract", "--overwrite", "--clean"]);

  for (const catalogPath of findChangedCatalogs(
    beforeExtract,
    await readCatalogSnapshot(project, linguiConfig),
  )) {
    changedCatalogs.push({ path: catalogPath, project: project.name });
  }

  missing.push(...(await findMissingTranslations(project, linguiConfig)));
}

if (changedCatalogs.length > 0) {
  console.error("i18n catalogs are not current. Run `vp run i18n:extract` and commit the updates:");

  for (const { path: catalogPath, project } of changedCatalogs) {
    console.error(`- ${project}: ${catalogPath}`);
  }
}

if (missing.length > 0) {
  console.error("Missing i18n translations:");

  for (const { locale, id, path: catalogPath, project } of missing) {
    console.error(`- ${project}: ${catalogPath} (${locale}): ${id}`);
  }
}

if (changedCatalogs.length > 0 || missing.length > 0) {
  process.exitCode = 1;
}
