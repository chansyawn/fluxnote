import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  shortcuts: {
    "create-block": "Mod+N",
    "delete-block": "Mod+D",
  } as Record<string, string | null>,
  useHotkeys: vi.fn(),
}));

vi.mock("react", () => ({
  useEffectEvent: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  useMemo: <T>(factory: () => T) => factory(),
}));

vi.mock("@renderer/features/shortcut/shortcut-state", () => ({
  useShortcutState: () => ({
    shortcuts: mocks.shortcuts,
  }),
}));

vi.mock("@tanstack/react-hotkeys", () => ({
  useHotkeys: mocks.useHotkeys,
}));

import { useBlockShortcuts } from "./use-block-shortcuts";

describe("useBlockShortcuts", () => {
  beforeEach(() => {
    mocks.useHotkeys.mockReset();
    mocks.shortcuts["create-block"] = "Mod+N";
    mocks.shortcuts["delete-block"] = "Mod+D";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("triggers create block without active block focus", () => {
    const createBlockWithFocus = vi.fn(async () => undefined);
    const deleteBlockWithFocus = vi.fn(async () => undefined);

    useBlockShortcuts({
      activeBlockId: "block-1",
      createBlockWithFocus,
      deleteBlockWithFocus,
    });

    const definitions = mocks.useHotkeys.mock.calls[0]?.[0] as Array<{
      hotkey: string;
      callback: (event: KeyboardEvent & { repeat: boolean }) => void;
    }>;
    const createDefinition = definitions.find((definition) => definition.hotkey === "Mod+N");
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    createDefinition?.callback({
      repeat: false,
      preventDefault,
      stopPropagation,
    } as unknown as KeyboardEvent & { repeat: boolean });

    expect(createBlockWithFocus).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
  });

  it("keeps delete block focus guard", () => {
    const createBlockWithFocus = vi.fn(async () => undefined);
    const deleteBlockWithFocus = vi.fn(async () => undefined);

    const activeElement = {
      closest: () => null,
    };
    vi.stubGlobal("document", { activeElement });

    useBlockShortcuts({
      activeBlockId: "block-1",
      createBlockWithFocus,
      deleteBlockWithFocus,
    });

    const definitions = mocks.useHotkeys.mock.calls[0]?.[0] as Array<{
      hotkey: string;
      callback: (event: KeyboardEvent & { repeat: boolean }) => void;
    }>;
    const deleteDefinition = definitions.find((definition) => definition.hotkey === "Mod+D");
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    deleteDefinition?.callback({
      repeat: false,
      preventDefault,
      stopPropagation,
    } as unknown as KeyboardEvent & { repeat: boolean });

    expect(deleteBlockWithFocus).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
  });
});
