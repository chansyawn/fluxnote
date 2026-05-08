import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelEdit: vi.fn(),
  submitEdit: vi.fn(),
}));

vi.mock("./service", () => mocks);

import { registerExternalEditCommands } from "./command";

describe("external-edit command", () => {
  const handlers = new Map<string, (input: any) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: any) => unknown) => handlers.set(name, handler)),
  };
  const deps = {
    db: {} as never,
    manager: { listSessions: vi.fn(() => [{ editId: "e1" }]) },
    paths: {} as never,
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  it("dispatches cancel/list/submit commands", async () => {
    mocks.submitEdit.mockResolvedValue({ id: "b1" });
    registerExternalEditCommands(ipc as never, deps as never);

    const cancelResult = await handlers.get("external-edit.cancel")?.({ editId: "e1" });
    const listResult = await handlers.get("external-edit.list")?.({});
    const submitResult = await handlers.get("external-edit.submit")?.({
      editId: "e1",
      content: "after",
    });

    expect(mocks.cancelEdit).toHaveBeenCalled();
    expect(deps.manager.listSessions).toHaveBeenCalled();
    expect(mocks.submitEdit).toHaveBeenCalledWith(
      { manager: deps.manager, paths: deps.paths },
      deps.db,
      "e1",
      "after",
    );
    expect(cancelResult).toBeUndefined();
    expect(listResult).toEqual([{ editId: "e1" }]);
    expect(submitResult).toEqual({ id: "b1" });
  });
});
