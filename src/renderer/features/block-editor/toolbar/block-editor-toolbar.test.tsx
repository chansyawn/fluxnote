// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen, within } from "@testing-library/react";
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
    formatBlock: vi.fn(),
    formatInline: vi.fn(),
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
  });

  it("renders nothing without a Block Editor controller or inactive content", () => {
    renderWithProviders(<BlockEditorToolbar />);

    expect(screen.queryByRole("button", { name: "Bold" })).not.toBeInTheDocument();
  });

  it("reflects toolbar state and dispatches block and inline format commands", async () => {
    const user = userEvent.setup();
    const { controller, setState } = createToolbarController({
      blockFormat: "bulletList",
      blockFormattingDisabled: false,
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
    const listButton = screen.getByRole("button", { name: "List" });
    const quoteButton = screen.getByRole("button", { name: "Quote" });

    expect(boldButton).toHaveAttribute("aria-pressed", "true");
    expect(boldButton).toHaveClass("text-foreground");
    expect(italicButton).toHaveClass("text-muted-foreground/60");
    expect(listButton).toHaveAttribute("aria-pressed", "true");
    expect(quoteButton).toHaveClass("text-muted-foreground/60");

    await user.click(quoteButton);
    expect(controller.formatBlock).toHaveBeenCalledWith("blockquote");

    await user.click(italicButton);
    expect(controller.formatInline).toHaveBeenCalledWith("italic");
    expect(controller.focus).toHaveBeenCalledTimes(2);

    act(() => {
      setState(DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
    });

    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(boldButton).toHaveClass("text-muted-foreground/60");
    expect(listButton).toHaveAttribute("aria-pressed", "false");
  });

  it("shows text style menu items with shortcuts and dispatches the selected format", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController({
      ...DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
      blockFormat: "heading2",
    });

    renderWithProviders(
      <BlockEditorToolbar controller={controller} shortcuts={{ heading1: "Control+Alt+1" }} />,
    );

    await user.click(screen.getByRole("button", { name: "Heading 2" }));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Normal text")).toBeVisible();
    expect(within(menu).getByText("Heading 1")).toBeVisible();
    expect(within(menu).getByText("Ctrl")).toBeVisible();
    expect(within(menu).getByText("Alt")).toBeVisible();
    expect(within(menu).getByText("1")).toBeVisible();

    await user.click(within(menu).getByText("Heading 1"));
    expect(controller.formatBlock).toHaveBeenCalledWith("heading1");
    expect(controller.focus).toHaveBeenCalledOnce();
  });

  it("keeps dropdown content inside the toolbar focus boundary", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController();

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    await user.click(screen.getByRole("button", { name: "Normal text" }));

    const toolbar = screen.getByRole("group", { name: "Editor" }).parentElement;
    const menu = await screen.findByRole("menu");

    expect(toolbar).toContainElement(menu);
  });

  it("shows list menu items and dispatches list formats", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController();

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    await user.click(screen.getByRole("button", { name: "List" }));
    const menu = await screen.findByRole("menu");

    expect(within(menu).getByText("Bullet list")).toBeVisible();
    expect(within(menu).getByText("Numbered list")).toBeVisible();
    expect(within(menu).getByText("Task list")).toBeVisible();

    await user.click(within(menu).getByText("Task list"));
    expect(controller.formatBlock).toHaveBeenCalledWith("taskList");
  });

  it("shows configured shortcuts in tooltips", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController();

    renderWithProviders(
      <BlockEditorToolbar controller={controller} shortcuts={{ bold: "Control+B" }} />,
    );

    await user.hover(screen.getByRole("button", { name: "Bold" }));

    expect(await screen.findByText("Bold")).toBeVisible();
    expect(screen.getByText("Ctrl")).toBeVisible();
    expect(screen.getByText("B")).toBeVisible();
  });

  it("disables block controls while preserving inline controls", () => {
    const { controller } = createToolbarController({
      ...DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
      blockFormattingDisabled: true,
    });

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    expect(screen.getByRole("button", { name: "Normal text" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "List" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quote" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bold" })).toBeEnabled();
  });
});
