import { DEFAULT_USER_PREFERENCES } from "@shared/features/preferences/user-preferences";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { registerExternalEditCommands } from "./command";

describe("external-edit command", () => {
  const handlers = new Map<string, (input: unknown) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: unknown) => unknown) =>
      handlers.set(name, handler),
    ),
  };
  const runtime = {
    cancel: vi.fn(),
    capture: vi.fn(),
    listSessions: vi.fn(),
    submit: vi.fn(),
  };
  const deps = {
    hideMainWindow: vi.fn(),
    readUserPreferences: vi.fn(),
    runtime,
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(runtime).forEach((fn) => fn.mockReset());
    deps.hideMainWindow.mockReset();
    deps.readUserPreferences.mockReset();
    runtime.cancel.mockResolvedValue(undefined);
    runtime.capture.mockResolvedValue({ id: "capture-1" });
    runtime.listSessions.mockReturnValue([{ id: "e1" }]);
    runtime.submit.mockResolvedValue({ id: "b1" });
    deps.readUserPreferences.mockReturnValue(DEFAULT_USER_PREFERENCES);
  });

  it("dispatches commands and hides after a successful submit by default", async () => {
    registerExternalEditCommands(ipc as never, deps as never);

    const captureResult = await handlers.get("external-edit.capture")?.(undefined);
    const cancelResult = await handlers.get("external-edit.cancel")?.({ id: "e1" });
    const listResult = await handlers.get("external-edit.list")?.(undefined);
    const submitResult = await handlers.get("external-edit.submit")?.({
      id: "e1",
      content: "after",
    });

    expect(runtime.capture).toHaveBeenCalledOnce();
    expect(runtime.cancel).toHaveBeenCalledWith("e1");
    expect(runtime.listSessions).toHaveBeenCalledOnce();
    expect(runtime.submit).toHaveBeenCalledWith("e1", "after");
    expect(deps.hideMainWindow).toHaveBeenCalledOnce();
    expect(captureResult).toEqual({ id: "capture-1" });
    expect(cancelResult).toBeUndefined();
    expect(listResult).toEqual([{ id: "e1" }]);
    expect(submitResult).toEqual({ id: "b1" });
  });

  it("keeps the window visible when hiding after submit is disabled", async () => {
    deps.readUserPreferences.mockReturnValue({
      ...DEFAULT_USER_PREFERENCES,
      externalEdit: { hideAfterSubmit: false },
    });
    registerExternalEditCommands(ipc as never, deps as never);

    await handlers.get("external-edit.submit")?.({ id: "e1", content: "after" });

    expect(deps.hideMainWindow).not.toHaveBeenCalled();
  });

  it("does not hide after a failed submit", async () => {
    runtime.submit.mockRejectedValue(new Error("submit failed"));
    registerExternalEditCommands(ipc as never, deps as never);

    await expect(
      handlers.get("external-edit.submit")?.({ id: "e1", content: "after" }),
    ).rejects.toThrow("submit failed");

    expect(deps.hideMainWindow).not.toHaveBeenCalled();
  });

  it("keeps a successful submit successful when hiding fails", async () => {
    const error = new Error("hide failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    deps.hideMainWindow.mockRejectedValue(error);
    registerExternalEditCommands(ipc as never, deps as never);

    await expect(
      handlers.get("external-edit.submit")?.({ id: "e1", content: "after" }),
    ).resolves.toEqual({ id: "b1" });

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to hide Fluxnotes after external edit submit",
      error,
    );
    consoleError.mockRestore();
  });
});
