import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  createMacAccessibilityHelperCompileCommand,
  macAccessibilityHelperOutputName,
  macAccessibilityHelperSource,
} from "../native/macos-accessibility-helper.ts";

function compileSwiftHelper(sourcePath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const compiler = createMacAccessibilityHelperCompileCommand(sourcePath, outputPath);
    const child = spawn(compiler.command, compiler.args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(stderr.trim() || `${compiler.label} exited with status ${code ?? "unknown"}.`),
      );
    });
  });
}

export async function copyNativeResources(buildPath: string): Promise<void> {
  if (process.platform !== "darwin") {
    return;
  }

  const resourcesNativePath = path.resolve(buildPath, "..", "native");
  await mkdir(resourcesNativePath, { recursive: true });
  await compileSwiftHelper(
    macAccessibilityHelperSource,
    path.join(resourcesNativePath, macAccessibilityHelperOutputName),
  );
}
