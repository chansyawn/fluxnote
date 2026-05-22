import os from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createCliEntrypointEnvelope, resolveCliIpcSocketPath } from "./cli-transport";

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value,
  });
}

describe("cli transport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setPlatform("darwin");
    Object.defineProperty(process, "getuid", {
      configurable: true,
      value: () => 501,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve unix socket path from uid", () => {
    vi.spyOn(os, "tmpdir").mockReturnValue("/tmp");

    expect(resolveCliIpcSocketPath()).toBe("/tmp/fluxnotes-501.sock");
  });

  it("should resolve windows named pipe path", () => {
    setPlatform("win32");

    expect(resolveCliIpcSocketPath()).toBe("\\\\.\\pipe\\fluxnotes-501");
  });

  it("should sanitize username when getuid is unavailable", () => {
    Object.defineProperty(process, "getuid", {
      configurable: true,
      value: undefined,
    });
    vi.spyOn(os, "userInfo").mockReturnValue({ username: "user name!*" } as never);
    vi.spyOn(os, "tmpdir").mockReturnValue("/tmp");

    expect(resolveCliIpcSocketPath()).toBe("/tmp/fluxnotes-user-name--.sock");
  });

  it("should create cli entrypoint envelope", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "id-1") });
    vi.spyOn(Date, "now").mockReturnValue(42);

    const envelope = createCliEntrypointEnvelope("app.open", null);

    expect(envelope).toEqual({
      id: "id-1",
      kind: "command",
      command: "app.open",
      payload: null,
      meta: {
        source: "cli",
        timestamp: 42,
      },
    });
  });
});
