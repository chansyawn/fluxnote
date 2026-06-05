import { describe, expect, it } from "vite-plus/test";

import { BLOCK_EDITOR_TOOLBAR_LAYOUT } from "../toolbar/action-layout";
import {
  BLOCK_EDITOR_ACTION_CATALOG,
  BLOCK_EDITOR_SHORTCUT_DEFAULTS,
  BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER,
  type BlockEditorActionId,
} from "./action-catalog";

const catalogActionIds = BLOCK_EDITOR_ACTION_CATALOG.map((action) => action.id);
const catalogActionIdSet = new Set<BlockEditorActionId>(catalogActionIds);

function expectValidActionIds(actions: readonly BlockEditorActionId[]): void {
  for (const action of actions) {
    expect(catalogActionIdSet.has(action)).toBe(true);
  }
}

describe("Block Editor action catalog", () => {
  it("defines unique action ids", () => {
    expect(new Set(catalogActionIds).size).toBe(catalogActionIds.length);
  });

  it("derives default shortcuts for every action", () => {
    expect(Object.keys(BLOCK_EDITOR_SHORTCUT_DEFAULTS).toSorted()).toEqual(
      catalogActionIds.toSorted(),
    );
  });

  it("derives a unique shortcut resolution order from catalog actions", () => {
    expectValidActionIds(BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER);
    expect(new Set(BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER).size).toBe(
      BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER.length,
    );
  });

  it("keeps toolbar layout order local while using catalog action ids", () => {
    expectValidActionIds(BLOCK_EDITOR_TOOLBAR_LAYOUT.textStyleMenu);
    expectValidActionIds(BLOCK_EDITOR_TOOLBAR_LAYOUT.listMenu);
    expectValidActionIds(BLOCK_EDITOR_TOOLBAR_LAYOUT.blockButtons);
    expectValidActionIds(BLOCK_EDITOR_TOOLBAR_LAYOUT.inlineButtons);
  });
});
