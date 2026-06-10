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
    cancel: vi.fn(async () => undefined),
    capture: vi.fn(async () => ({ editId: "capture-1" })),
    listSessions: vi.fn(() => [{ editId: "e1" }]),
    submit: vi.fn(async () => ({ id: "b1" })),
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(runtime).forEach((fn) => fn.mockClear());
  });

  it("dispatches capture/cancel/list/submit commands", async () => {
    registerExternalEditCommands(ipc as never, { runtime } as never);

    const captureResult = await handlers.get("external-edit.capture")?.(undefined);
    const cancelResult = await handlers.get("external-edit.cancel")?.({ editId: "e1" });
    const listResult = await handlers.get("external-edit.list")?.(undefined);
    const submitResult = await handlers.get("external-edit.submit")?.({
      editId: "e1",
      content: "after",
    });

    expect(runtime.capture).toHaveBeenCalledTimes(1);
    expect(runtime.cancel).toHaveBeenCalledWith("e1");
    expect(runtime.listSessions).toHaveBeenCalledTimes(1);
    expect(runtime.submit).toHaveBeenCalledWith("e1", "after");
    expect(captureResult).toEqual({ editId: "capture-1" });
    expect(cancelResult).toBeUndefined();
    expect(listResult).toEqual([{ editId: "e1" }]);
    expect(submitResult).toEqual({ id: "b1" });
  });
});
