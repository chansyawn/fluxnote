import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vite-plus/test";

import { MacAccessibilityHelperError, SpawnedMacAccessibilityHelper } from "./helper";

class FakeHelperProcess extends EventEmitter {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  killed = false;

  kill(): boolean {
    this.killed = true;
    return true;
  }
}

function createHelper(): {
  child: FakeHelperProcess;
  helper: SpawnedMacAccessibilityHelper;
  requests: string[];
} {
  const child = new FakeHelperProcess();
  const requests: string[] = [];
  child.stdin.on("data", (chunk: Buffer) => {
    requests.push(chunk.toString("utf8"));
  });

  return {
    child,
    helper: new SpawnedMacAccessibilityHelper(child as unknown as ChildProcessWithoutNullStreams),
    requests,
  };
}

describe("macOS Accessibility helper wrapper", () => {
  it("maps capture responses to macOS accessibility captures", async () => {
    const { child, helper, requests } = createHelper();

    const capture = helper.capture();
    child.stdout.write(
      `${JSON.stringify({
        ok: true,
        data: {
          appBundleId: "com.example.App",
          appName: "Example",
          content: "selected",
          elementRole: "AXTextArea",
          processId: 123,
        },
      })}\n`,
    );

    await expect(capture).resolves.toEqual({
      content: "selected",
      trigger: {
        appBundleId: "com.example.App",
        appName: "Example",
        elementRole: "AXTextArea",
        processId: 123,
        source: "mac_accessibility",
      },
    });
    expect(requests).toEqual([`${JSON.stringify({ command: "capture" })}\n`]);
  });

  it("rejects helper failures with stable error codes", async () => {
    const { child, helper } = createHelper();

    const capture = helper.capture();
    child.stdout.write(
      `${JSON.stringify({
        ok: false,
        code: "permission_required",
        error: "Accessibility permission is not granted.",
      })}\n`,
    );

    await expect(capture).rejects.toMatchObject({
      code: "permission_required",
      message: "Accessibility permission is not granted.",
      name: "MacAccessibilityHelperError",
    } satisfies Partial<MacAccessibilityHelperError>);
  });

  it("rejects invalid JSON output", async () => {
    const { child, helper } = createHelper();

    const capture = helper.capture();
    child.stdout.write("not-json\n");

    await expect(capture).rejects.toThrow("Unexpected token");
  });

  it("rejects malformed helper responses", async () => {
    const { child, helper } = createHelper();

    const capture = helper.capture();
    child.stdout.write(`${JSON.stringify({ ok: "yes" })}\n`);

    await expect(capture).rejects.toThrow("Invalid macOS Accessibility helper response.");
  });

  it("rejects non-quit requests after disposal", async () => {
    vi.useFakeTimers();
    try {
      const { helper } = createHelper();

      helper.dispose();

      await expect(helper.capture()).rejects.toThrow(
        "macOS Accessibility helper is no longer running.",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
