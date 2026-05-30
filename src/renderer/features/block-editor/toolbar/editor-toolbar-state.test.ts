import { describe, expect, it, vi } from "vite-plus/test";

import { BlockEditorToolbarStateStore, areToolbarStatesEqual } from "./editor-toolbar-state";
import { DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE, type BlockEditorToolbarState } from "./types";

const boldToolbarState: BlockEditorToolbarState = {
  textFormats: {
    bold: true,
    code: false,
    italic: false,
    strikethrough: false,
  },
};

describe("BlockEditorToolbarStateStore", () => {
  it("starts with the default toolbar state", () => {
    const store = new BlockEditorToolbarStateStore();

    expect(store.getSnapshot()).toBe(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
  });

  it("compares toolbar states by text format values", () => {
    expect(
      areToolbarStatesEqual(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE, DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE),
    ).toBe(true);
    expect(areToolbarStatesEqual(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE, boldToolbarState)).toBe(false);
  });

  it("notifies listeners only when the toolbar state changes", () => {
    const store = new BlockEditorToolbarStateStore();
    const listener = vi.fn();

    store.subscribe(listener);
    store.publish(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
    store.publish(boldToolbarState);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(boldToolbarState);
    expect(store.getSnapshot()).toBe(boldToolbarState);
  });

  it("stops notifying unsubscribed listeners", () => {
    const store = new BlockEditorToolbarStateStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.publish(boldToolbarState);

    expect(listener).not.toHaveBeenCalled();
  });
});
