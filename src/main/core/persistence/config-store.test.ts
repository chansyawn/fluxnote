import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  electronStoreCtor: vi.fn(),
}));

vi.mock("electron-store", () => ({
  default: function ElectronStoreMock(options: unknown) {
    mocks.electronStoreCtor(options);
    return { store: {} };
  },
}));

describe("config-store", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.electronStoreCtor.mockReset();
  });

  it("creates store with normalized file name and defaults", async () => {
    const { getConfigStore } = await import("./config-store");

    getConfigStore("/mock/user-data", " preferences.json ", { a: 1 });

    expect(mocks.electronStoreCtor).toHaveBeenCalledWith({
      clearInvalidConfig: false,
      cwd: "/mock/user-data",
      defaults: { a: 1 },
      fileExtension: "json",
      name: "preferences",
    });
  });

  it("falls back to empty defaults for non-object", async () => {
    const { getConfigStore } = await import("./config-store");

    getConfigStore("/mock/user-data", "plain", null);

    expect(mocks.electronStoreCtor).toHaveBeenCalledWith(
      expect.objectContaining({ defaults: {}, fileExtension: "json", name: "plain" }),
    );
  });

  it("reuses cached store for same normalized name", async () => {
    const { getConfigStore } = await import("./config-store");

    const one = getConfigStore("/mock/user-data", "a.json", {});
    const two = getConfigStore("/mock/user-data", " a.json ", { x: 1 });

    expect(one).toBe(two);
    expect(mocks.electronStoreCtor).toHaveBeenCalledTimes(1);
  });
});
