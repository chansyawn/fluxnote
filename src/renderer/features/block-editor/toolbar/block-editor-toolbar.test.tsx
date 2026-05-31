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
  it("renders inactive content without a Block Editor controller", () => {
    renderWithProviders(<BlockEditorToolbar inactiveContent={<p>3 blocks</p>} />);

    expect(screen.getByText("3 blocks")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inline code" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Strikethrough" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Italic" })).not.toBeInTheDocument();
  });

  it("renders nothing without a Block Editor controller or inactive content", () => {
    renderWithProviders(<BlockEditorToolbar />);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
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
    const italicButton = screen.getByRole("button", { name: "Italic" });
    expect(boldButton).toHaveAttribute("aria-pressed", "true");
    expect(boldButton).toHaveClass("text-foreground");
    expect(italicButton).toHaveClass("text-muted-foreground/60");
    expect(
      screen.getAllByRole("button").map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Bold", "Italic", "Strikethrough", "Inline code"]);

    act(() => {
      setState(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
    });

    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(boldButton).toHaveClass("text-muted-foreground/60");

    await user.click(italicButton);

    expect(controller.formatText).toHaveBeenCalledWith("italic");
    expect(controller.focus).toHaveBeenCalledOnce();
  });

  it("shows configured shortcuts in tooltips", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController();

    renderWithProviders(
      <BlockEditorToolbar
        controller={controller}
        shortcuts={{ "editor.formatBold": "Control+B", "editor.formatInlineCode": null }}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Bold" }));

    expect(await screen.findByText("Bold")).toBeVisible();
    expect(screen.getByText("Ctrl")).toBeVisible();
    expect(screen.getByText("B")).toBeVisible();
  });
});
