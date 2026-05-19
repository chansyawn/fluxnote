import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { formatter } from "@lingui/format-po";

import linguiConfig from "../lingui.config.ts";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = path.join(rootDir, "src/renderer/locales");
const poFormatter = formatter();
const linguiCliPath = path.join(path.dirname(require.resolve("@lingui/cli")), "lingui.js");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

function getCatalogPath(locale) {
  return path.join("src/renderer/locales", locale, "messages.po");
}

async function readCatalog(locale) {
  const relativePath = getCatalogPath(locale);
  return [relativePath, await readFile(path.join(rootDir, relativePath), "utf8")];
}

function readShippedLocales() {
  return linguiConfig.locales
    .filter(
      (locale) => locale !== linguiConfig.sourceLocale && locale !== linguiConfig.pseudoLocale,
    )
    .sort();
}

async function readCatalogSnapshot() {
  return new Map(await Promise.all(linguiConfig.locales.map(readCatalog)));
}

function findChangedCatalogs(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);

  return [...paths]
    .filter((catalogPath) => before.get(catalogPath) !== after.get(catalogPath))
    .sort((left, right) => left.localeCompare(right));
}

async function findMissingTranslations() {
  const missing = [];

  for (const locale of readShippedLocales()) {
    const absolutePath = path.join(localesDir, locale, "messages.po");
    const catalog = poFormatter.parse(await readFile(absolutePath, "utf8"));

    for (const [id, message] of Object.entries(catalog)) {
      if (!message.obsolete && message.translation.trim() === "") {
        missing.push({ id, locale });
      }
    }
  }

  return missing;
}

const beforeExtract = await readCatalogSnapshot();
await run(process.execPath, [linguiCliPath, "extract", "--overwrite", "--clean"]);

const changedCatalogs = findChangedCatalogs(beforeExtract, await readCatalogSnapshot());
const missing = await findMissingTranslations();

if (changedCatalogs.length > 0) {
  console.error("i18n catalogs are not current. Run `vp run i18n:extract` and commit the updates:");

  for (const catalogPath of changedCatalogs) {
    console.error(`- ${catalogPath}`);
  }
}

if (missing.length > 0) {
  console.error("Missing i18n translations:");

  for (const { locale, id } of missing) {
    console.error(`- ${locale}: ${id}`);
  }
}

if (changedCatalogs.length > 0 || missing.length > 0) {
  process.exitCode = 1;
}
