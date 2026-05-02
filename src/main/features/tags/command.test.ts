import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  listTags: vi.fn(),
  setBlockTags: vi.fn(),
}));

vi.mock("./service", () => mocks);

import { registerTagsCommands } from "./command";

describe("tags command", () => {
  const handlers = new Map<string, (input: any) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: any) => unknown) => handlers.set(name, handler)),
  };
  const deps = { db: {} as never };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  it("dispatches create command", async () => {
    mocks.createTag.mockResolvedValue({ id: "t1", name: "work" });
    registerTagsCommands(ipc as never, deps);

    const result = await handlers.get("tags.create")?.({ name: "work" });

    expect(mocks.createTag).toHaveBeenCalledWith(deps.db, "work");
    expect(result).toEqual({ id: "t1", name: "work" });
  });

  it("dispatches set-block-tags command", async () => {
    mocks.setBlockTags.mockResolvedValue({ id: "b1", tags: [] });
    registerTagsCommands(ipc as never, deps);

    const result = await handlers.get("tags.set-block-tags")?.({ blockId: "b1", tagIds: ["t1"] });

    expect(mocks.setBlockTags).toHaveBeenCalledWith(deps.db, "b1", ["t1"]);
    expect(result).toEqual({ id: "b1", tags: [] });
  });
});
