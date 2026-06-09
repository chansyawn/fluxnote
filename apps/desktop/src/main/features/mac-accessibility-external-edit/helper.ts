import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";

import type { MacAccessibilityExternalEditTrigger } from "@shared/features/external-edit/session-contracts";
import { app } from "electron";

export interface MacAccessibilityCapture {
  content: string;
  trigger: MacAccessibilityExternalEditTrigger;
}

interface HelperJsonResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface HelperCaptureResponse {
  appBundleId: string | null;
  appName: string | null;
  content: string;
  editScope: MacAccessibilityExternalEditTrigger["editScope"];
  elementRole: string | null;
  processId: number;
  selectedRange: MacAccessibilityExternalEditTrigger["selectedRange"];
}

type HelperRequest =
  | { command: "capture" }
  | { command: "quit" }
  | { command: "writeBack"; content: string };

interface PendingRequest {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
}

export interface MacAccessibilityHelper {
  capture: () => Promise<MacAccessibilityCapture>;
  dispose: () => void;
  writeBack: (content: string) => Promise<void>;
}

export interface MacAccessibilityHelperFactory {
  create: () => Promise<MacAccessibilityHelper>;
}

function getAppRoot(): string {
  return app.getAppPath();
}

function resolvePackagedHelperPath(): string {
  return path.join(process.resourcesPath, "native", "macos-accessibility-helper");
}

function resolveDevelopmentSourcePath(): string {
  return path.join(getAppRoot(), "src/native/macos-accessibility-helper/main.m");
}

function resolveDevelopmentHelperPath(): string {
  return path.join(app.getPath("userData"), "native", "macos-accessibility-helper");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function compileDevelopmentHelper(): Promise<string> {
  const outputPath = resolveDevelopmentHelperPath();
  const sourcePath = resolveDevelopmentSourcePath();
  if (await pathExists(outputPath)) {
    const [sourceStats, outputStats] = await Promise.all([stat(sourcePath), stat(outputPath)]);
    if (outputStats.mtimeMs >= sourceStats.mtimeMs) {
      return outputPath;
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "clang",
      [
        sourcePath,
        "-fobjc-arc",
        "-framework",
        "ApplicationServices",
        "-framework",
        "AppKit",
        "-o",
        outputPath,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
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

      reject(new Error(stderr.trim() || `clang exited with status ${code ?? "unknown"}.`));
    });
  });
  return outputPath;
}

async function resolveHelperPath(): Promise<string> {
  if (app.isPackaged) {
    return resolvePackagedHelperPath();
  }

  return await compileDevelopmentHelper();
}

function parseHelperResponse<T>(line: string): HelperJsonResponse<T> {
  const parsed = JSON.parse(line) as HelperJsonResponse<T>;
  if (typeof parsed !== "object" || parsed === null || typeof parsed.ok !== "boolean") {
    throw new Error("Invalid macOS Accessibility helper response.");
  }
  return parsed;
}

class SpawnedMacAccessibilityHelper implements MacAccessibilityHelper {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pendingRequests: PendingRequest[] = [];
  private disposed = false;

  constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child;

    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      const pending = this.pendingRequests.shift();
      if (!pending) {
        return;
      }

      try {
        const response = parseHelperResponse(line);
        if (!response.ok) {
          pending.reject(new Error(response.error || "macOS Accessibility helper failed."));
          return;
        }

        pending.resolve(response.data);
      } catch (error) {
        pending.reject(
          error instanceof Error ? error : new Error("Invalid macOS Accessibility helper output."),
        );
      }
    });

    child.on("error", (error) => {
      this.rejectPending(error);
    });

    child.on("exit", (code, signal) => {
      this.disposed = true;
      this.rejectPending(
        new Error(
          `macOS Accessibility helper exited before responding: ${signal ?? code ?? "unknown"}.`,
        ),
      );
    });
  }

  async capture(): Promise<MacAccessibilityCapture> {
    const data = await this.request<HelperCaptureResponse>({ command: "capture" });
    return {
      content: data.content,
      trigger: {
        appBundleId: data.appBundleId,
        appName: data.appName,
        editScope: data.editScope,
        elementRole: data.elementRole,
        processId: data.processId,
        selectedRange: data.selectedRange,
        source: "mac_accessibility",
      },
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    void this.request({ command: "quit" }).catch(() => {
      this.child.kill();
    });
    setTimeout(() => {
      if (!this.child.killed) {
        this.child.kill();
      }
    }, 1_000).unref();
  }

  async writeBack(content: string): Promise<void> {
    await this.request({ command: "writeBack", content });
  }

  private rejectPending(error: Error): void {
    const pending = this.pendingRequests.splice(0);
    for (const request of pending) {
      request.reject(error);
    }
  }

  private request<T = unknown>(request: HelperRequest): Promise<T> {
    if (this.disposed && request.command !== "quit") {
      return Promise.reject(new Error("macOS Accessibility helper is no longer running."));
    }

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.push({
        reject,
        resolve: (value) => resolve(value as T),
      });
      this.child.stdin.write(`${JSON.stringify(request)}\n`, (error) => {
        if (error) {
          const pending = this.pendingRequests.pop();
          pending?.reject(error);
        }
      });
    });
  }
}

export function createMacAccessibilityHelperFactory(): MacAccessibilityHelperFactory {
  async function create(): Promise<MacAccessibilityHelper> {
    const helperPath = await resolveHelperPath();
    const child = spawn(helperPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stderr.on("data", (chunk: Buffer) => {
      console.warn("macOS Accessibility helper stderr", chunk.toString("utf8"));
    });

    return new SpawnedMacAccessibilityHelper(child);
  }

  return { create };
}
