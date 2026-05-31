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
    getToolbarState: () => state,
    runToolbarCommand: vi.fn(),
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
    expect(screen.queryByRole("button", { name: "Text style" })).not.toBeInTheDocument();
  });

  it("renders nothing without a Block Editor controller or inactive content", () => {
    renderWithProviders(<BlockEditorToolbar />);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });

  it("reflects toolbar state and dispatches inline commands", async () => {
    const user = userEvent.setup();
    const { controller, setState } = createToolbarController({
      ...DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
      inlineFormats: {
        bold: true,
        inlineCode: false,
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
    ).toEqual([
      "Text style",
      "Quote",
      "Bullet list",
      "Numbered list",
      "Code block",
      "Bold",
      "Italic",
      "Strikethrough",
      "Inline code",
    ]);

    act(() => {
      setState(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
    });

    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(boldButton).toHaveClass("text-muted-foreground/60");

    await user.click(italicButton);

    expect(controller.runToolbarCommand).toHaveBeenCalledWith({
      format: "italic",
      type: "toggle-inline",
    });
    expect(controller.focus).toHaveBeenCalledOnce();
  });

  it("reflects block state and dispatches block commands", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController({
      ...DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
      activeBlocks: {
        ...DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE.activeBlocks,
        blockquote: true,
        heading2: true,
        paragraph: false,
      },
      blockFormat: "heading2",
    });

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    expect(screen.getByRole("button", { name: "Text style" })).not.toHaveTextContent("H2");
    expect(screen.getByRole("button", { name: "Quote" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Code block" }));

    expect(controller.runToolbarCommand).toHaveBeenCalledWith({
      format: "codeBlock",
      type: "set-block",
    });
  });

  it("shows heading commands in a dropdown menu", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController();

    renderWithProviders(
      <BlockEditorToolbar
        controller={controller}
        shortcuts={{ "editor.heading2": "Control+Alt+2" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Text style" }));
    await user.click(await screen.findByRole("menuitemradio", { name: /Heading 2/ }));

    expect(controller.runToolbarCommand).toHaveBeenCalledWith({
      format: "heading2",
      type: "set-block",
    });
    expect(controller.focus).toHaveBeenCalledOnce();
    expect(screen.getByText("Ctrl+Alt+2")).toBeVisible();
  });

  it("shows configured shortcuts in tooltips", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController();

    renderWithProviders(
      <BlockEditorToolbar
        controller={controller}
        shortcuts={{ "editor.bold": "Control+B", "editor.inlineCode": null }}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Bold" }));

    expect(await screen.findByText("Bold")).toBeVisible();
    expect(screen.getByText("Ctrl")).toBeVisible();
    expect(screen.getByText("B")).toBeVisible();
  });
});
