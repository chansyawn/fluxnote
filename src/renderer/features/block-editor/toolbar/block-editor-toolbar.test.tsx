// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { BlockEditorToolbar } from "./block-editor-toolbar";
import {
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorToolbarController,
  type BlockEditorToolbarState,
  type BlockEditorToolbarStateListener,
} from "./types";

function createToolbarController(
  initialState: BlockEditorToolbarState = DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
) {
  let state = initialState;
  const listeners = new Set<BlockEditorToolbarStateListener>();
  const controller: BlockEditorToolbarController = {
    focus: vi.fn(),
    formatText: vi.fn(),
    getToolbarState: () => state,
    subscribeToolbarState: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    controller,
    setState: (nextState: BlockEditorToolbarState) => {
      state = nextState;
      for (const listener of listeners) {
        listener(nextState);
      }
    },
  };
}

describe("BlockEditorToolbar", () => {
  it("disables text format controls without a Block Editor controller", () => {
    renderWithProviders(<BlockEditorToolbar />);

    expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Inline code" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Strikethrough" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Italic" })).toBeDisabled();
  });

  it("reflects toolbar state and dispatches text format commands", async () => {
    const user = userEvent.setup();
    const { controller, setState } = createToolbarController({
      textFormats: {
        bold: true,
        code: false,
        italic: false,
        strikethrough: false,
      },
    });

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    const boldButton = screen.getByRole("button", { name: "Bold" });
    expect(boldButton).toHaveAttribute("aria-pressed", "true");

    act(() => {
      setState(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
    });

    expect(boldButton).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Italic" }));

    expect(controller.formatText).toHaveBeenCalledWith("italic");
    expect(controller.focus).toHaveBeenCalledOnce();
  });
});
