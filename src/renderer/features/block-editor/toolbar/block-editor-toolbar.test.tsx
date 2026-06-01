// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  type BlockEditorActionController,
  type BlockEditorActionState,
  type BlockEditorActionStateListener,
} from "../actions";
import { BlockEditorToolbar } from "./block-editor-toolbar";

function createToolbarController(
  initialState: BlockEditorActionState = DEFAULT_BLOCK_EDITOR_ACTION_STATE,
) {
  let state = initialState;
  const listeners = new Set<BlockEditorActionStateListener>();
  const controller: BlockEditorActionController = {
    executeAction: vi.fn((action) => ({ action, status: "executed" as const })),
    focus: vi.fn(),
    getActionState: () => state,
    subscribeActionState: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    controller,
    setState: (nextState: BlockEditorActionState) => {
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
      ...DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      activeActions: {
        ...DEFAULT_BLOCK_EDITOR_ACTION_STATE.activeActions,
        "editor.bold": true,
        "editor.bulletList": true,
        "editor.codeBlock": true,
        "editor.link": true,
      },
    });

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    const boldButton = screen.getByRole("button", { name: "Bold" });
    const italicButton = screen.getByRole("button", { name: "Italic" });
    const linkButton = screen.getByRole("button", { name: "Link" });
    const listButton = screen.getByRole("button", { name: "List" });
    const quoteButton = screen.getByRole("button", { name: "Quote" });
    const codeBlockButton = screen.getByRole("button", { name: "Code block" });

    expect(boldButton).toHaveAttribute("aria-pressed", "true");
    expect(boldButton).toHaveClass("text-foreground");
    expect(italicButton).toHaveClass("text-muted-foreground/60");
    expect(listButton).toHaveAttribute("aria-pressed", "true");
    expect(quoteButton).toHaveClass("text-muted-foreground/60");
    expect(codeBlockButton).toHaveAttribute("aria-pressed", "true");
    expect(linkButton).toHaveAttribute("aria-pressed", "true");

    await user.click(quoteButton);
    expect(controller.executeAction).toHaveBeenCalledWith("editor.blockquote");

    await user.click(codeBlockButton);
    expect(controller.executeAction).toHaveBeenCalledWith("editor.codeBlock");

    await user.click(italicButton);
    expect(controller.executeAction).toHaveBeenCalledWith("editor.italic");

    await user.click(linkButton);
    expect(controller.executeAction).toHaveBeenCalledWith("editor.link");
    expect(controller.focus).toHaveBeenCalledTimes(4);

    act(() => {
      setState(DEFAULT_BLOCK_EDITOR_ACTION_STATE);
    });

    expect(boldButton).toHaveAttribute("aria-pressed", "false");
    expect(boldButton).toHaveClass("text-muted-foreground/60");
    expect(listButton).toHaveAttribute("aria-pressed", "false");
  });

  it("shows text style menu items with shortcuts and dispatches the selected format", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController({
      ...DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      activeActions: {
        ...DEFAULT_BLOCK_EDITOR_ACTION_STATE.activeActions,
        "editor.heading2": true,
      },
    });

    renderWithProviders(
      <BlockEditorToolbar
        controller={controller}
        shortcuts={{ "editor.heading1": "Control+Alt+1" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Heading 2" }));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Normal text")).toBeVisible();
    expect(within(menu).getByText("Heading 1")).toBeVisible();
    expect(within(menu).getByText("Ctrl")).toBeVisible();
    expect(within(menu).getByText("Alt")).toBeVisible();
    expect(within(menu).getByText("1")).toBeVisible();

    await user.click(within(menu).getByText("Heading 1"));
    expect(controller.executeAction).toHaveBeenCalledWith("editor.heading1");
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
    expect(controller.executeAction).toHaveBeenCalledWith("editor.taskList");
  });

  it("shows configured shortcuts in tooltips", async () => {
    const user = userEvent.setup();
    const { controller } = createToolbarController();

    renderWithProviders(
      <BlockEditorToolbar
        controller={controller}
        shortcuts={{ "editor.bold": "Control+B", "editor.link": "Control+Shift+L" }}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Bold" }));

    expect(await screen.findByText("Bold")).toBeVisible();
    expect(screen.getByText("Ctrl")).toBeVisible();
    expect(screen.getByText("B")).toBeVisible();

    await user.hover(screen.getByRole("button", { name: "Link" }));

    expect(await screen.findByText("Link")).toBeVisible();
    expect(screen.getByText("Ctrl")).toBeVisible();
    expect(screen.getByText("Shift")).toBeVisible();
    expect(screen.getByText("L")).toBeVisible();
  });

  it("disables block controls while preserving inline controls", () => {
    const { controller } = createToolbarController({
      ...DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      disabledActions: {
        ...DEFAULT_BLOCK_EDITOR_ACTION_STATE.disabledActions,
        "editor.blockquote": true,
        "editor.bulletList": true,
        "editor.codeBlock": true,
        "editor.heading1": true,
        "editor.heading2": true,
        "editor.heading3": true,
        "editor.heading4": true,
        "editor.heading5": true,
        "editor.heading6": true,
        "editor.link": true,
        "editor.orderedList": true,
        "editor.paragraph": true,
        "editor.taskList": true,
      },
    });

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    expect(screen.getByRole("button", { name: "Normal text" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "List" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quote" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Code block" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bold" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Link" })).toBeDisabled();
  });

  it("prevents disabled toolbar clicks from focusing the editor underneath", () => {
    const { controller } = createToolbarController({
      ...DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      disabledActions: {
        ...DEFAULT_BLOCK_EDITOR_ACTION_STATE.disabledActions,
        "editor.blockquote": true,
        "editor.bulletList": true,
        "editor.codeBlock": true,
        "editor.heading1": true,
        "editor.heading2": true,
        "editor.heading3": true,
        "editor.heading4": true,
        "editor.heading5": true,
        "editor.heading6": true,
        "editor.orderedList": true,
        "editor.paragraph": true,
        "editor.taskList": true,
      },
    });

    renderWithProviders(<BlockEditorToolbar controller={controller} />);

    const toolbar = screen.getByRole("group", { name: "Editor" }).parentElement;
    expect(toolbar).not.toBeNull();

    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    const wasNotCanceled = toolbar?.dispatchEvent(event);

    expect(wasNotCanceled).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(controller.executeAction).not.toHaveBeenCalled();
    expect(controller.focus).not.toHaveBeenCalled();
  });
});
