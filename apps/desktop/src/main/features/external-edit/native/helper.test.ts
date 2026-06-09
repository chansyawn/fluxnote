import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vite-plus/test";

import { FocusedAppHelperError, SpawnedFocusedAppHelper } from "./helper";

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
  helper: SpawnedFocusedAppHelper;
  requests: string[];
} {
  const child = new FakeHelperProcess();
  const requests: string[] = [];
  child.stdin.on("data", (chunk: Buffer) => {
    requests.push(chunk.toString("utf8"));
  });

  return {
    child,
    helper: new SpawnedFocusedAppHelper(child as unknown as ChildProcessWithoutNullStreams),
    requests,
  };
}

describe("focused app helper wrapper", () => {
  it("maps capture responses to focused app captures", async () => {
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
        mode: "write_back",
        processId: 123,
        source: "focused_app",
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
      name: "FocusedAppHelperError",
    } satisfies Partial<FocusedAppHelperError>);
  });

  it("preserves helper failure metadata when available", async () => {
    const { child, helper } = createHelper();

    const capture = helper.capture();
    child.stdout.write(
      `${JSON.stringify({
        ok: false,
        code: "no_editable_element",
        data: {
          appBundleId: "com.example.App",
          appName: "Example",
          processId: 123,
        },
        error: "No focused editable element was found.",
      })}\n`,
    );

    await expect(capture).rejects.toMatchObject({
      code: "no_editable_element",
      data: {
        appBundleId: "com.example.App",
        appName: "Example",
        processId: 123,
      },
      name: "FocusedAppHelperError",
    } satisfies Partial<FocusedAppHelperError>);
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
