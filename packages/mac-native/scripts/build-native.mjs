#!/usr/bin/env node
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") {
  console.log("@fluxnotes/mac-native: skipping native build on non-macOS platform.");
  process.exit(0);
}

const result = spawnSync("node-gyp", ["rebuild"], {
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
