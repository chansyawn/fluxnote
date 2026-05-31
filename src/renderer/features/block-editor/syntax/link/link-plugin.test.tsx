// @vitest-environment jsdom

import type { BlockEditorHandle } from "@renderer/features/block-editor/core/types";
import {
  createBlockEditorRuntime,
  findBlockEditor,
  renderBlockEditor,
} from "@renderer/features/block-editor/test/block-editor-test-utils";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

async function findLink(container: HTMLElement, label: string): Promise<HTMLAnchorElement> {
  await waitFor(() => {
    expect(container.querySelector("a")).toBeInTheDocument();
  });

  const link = screen.getByRole("link", { name: label });
  return link as HTMLAnchorElement;
}

async function showLinkPopover(container: HTMLElement, label: string): Promise<HTMLAnchorElement> {
  const link = await findLink(container, label);
  vi.spyOn(link, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 80, 20));

  await act(async () => {
    link.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 24,
      }),
    );
  });

  await screen.findByRole("textbox", { name: "Link URL" });
  return link;
}

function getEditorTextNodes(editor: HTMLElement): Text[] {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();

  while (node) {
    if (node instanceof Text) {
      textNodes.push(node);
    }
    node = walker.nextNode();
  }

  return textNodes;
}

function resolveEditorTextPosition(
  editor: HTMLElement,
  targetOffset: number,
): { node: Text; offset: number } {
  let consumed = 0;

  for (const node of getEditorTextNodes(editor)) {
    const nextConsumed = consumed + node.data.length;
    if (targetOffset <= nextConsumed) {
      return {
        node,
        offset: targetOffset - consumed,
      };
    }
    consumed = nextConsumed;
  }

  throw new Error(`Expected editor text offset ${targetOffset} to exist.`);
}

async function selectEditorText(editor: HTMLElement, from: number, to: number): Promise<void> {
  const selection = window.getSelection();
  if (!selection) throw new Error("Expected a DOM selection.");

  const start = resolveEditorTextPosition(editor, from);
  const end = resolveEditorTextPosition(editor, to);
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  selection.removeAllRanges();
  selection.addRange(range);

  await act(async () => {
    editor.dispatchEvent(new Event("selectionchange", { bubbles: true }));
  });
}

async function placeEditorCursor(editor: HTMLElement, offset: number): Promise<void> {
  await selectEditorText(editor, offset, offset);
}

async function waitForFocusedLinkInput() {
  const input = await screen.findByRole("textbox", { name: "Link URL" });

  await waitFor(() => {
    expect(input).toHaveFocus();
  });

  return input;
}

describe("link plugin", () => {
  it("renders Markdown links with the link popover", async () => {
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    await findBlockEditor(container);

    await showLinkPopover(container, "Fluxnotes");

    expect(screen.getByRole("textbox", { name: "Link URL" })).toHaveValue("https://example.com");
    expect(screen.getByRole("button", { name: "Open" })).toBeVisible();
  });

  it("opens a hovered link through the runtime", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
      runtime,
    });
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(runtime.links.openExternal).toHaveBeenCalledWith("https://example.com");
  });

  it("copies a hovered link through the runtime", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
      runtime,
    });
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("https://example.com");
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("keeps the link popover open when the pointer returns before hover close", async () => {
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    const editor = await findBlockEditor(container);
    const link = await showLinkPopover(container, "Fluxnotes");

    vi.useFakeTimers();

    await act(async () => {
      editor.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 4,
          clientY: 4,
        }),
      );
    });

    await act(async () => {
      link.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 24,
          clientY: 24,
        }),
      );
    });

    act(() => {
      vi.advanceTimersByTime(121);
    });

    expect(screen.getByRole("button", { name: "Open" })).toBeVisible();
  });

  it("edits a hovered link url", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
      },
      editorRef,
    );
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    const input = screen.getByRole("textbox", { name: "Link URL" });
    await userEvent.clear(input);
    await userEvent.type(input, "https://fluxnotes.local");

    await expect(editorRef.current?.flush()).resolves.toContain(
      "[Fluxnotes](https://fluxnotes.local)",
    );
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("keeps the link input open when the pointer moves back to the anchor", async () => {
    const { container } = renderBlockEditor({
      initialMarkdown: "[Fluxnotes](https://example.com)",
    });
    const editor = await findBlockEditor(container);
    const link = await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("textbox", { name: "Link URL" }));
    expect(screen.getByRole("textbox", { name: "Link URL" })).toBeVisible();

    vi.useFakeTimers();

    await act(async () => {
      editor.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 4,
          clientY: 4,
        }),
      );
    });

    act(() => {
      vi.advanceTimersByTime(121);
    });

    expect(screen.getByRole("textbox", { name: "Link URL" })).toBeVisible();

    await act(async () => {
      link.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          clientX: 24,
          clientY: 24,
        }),
      );
    });

    expect(screen.getByRole("textbox", { name: "Link URL" })).toBeVisible();
  });

  it("allows a hovered link url to be empty", async () => {
    const runtime = createBlockEditorRuntime();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
        runtime,
      },
      editorRef,
    );
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    const input = screen.getByRole("textbox", { name: "Link URL" });
    await userEvent.clear(input);

    await expect(editorRef.current?.flush()).resolves.toContain("[Fluxnotes]()");
    expect(screen.getByRole("button", { name: "Open" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(runtime.links.openExternal).not.toHaveBeenCalled();
    expect(runtime.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("removes a hovered link while keeping its text", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: "[Fluxnotes](https://example.com)",
      },
      editorRef,
    );
    await findBlockEditor(container);
    await showLinkPopover(container, "Fluxnotes");

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await expect(editorRef.current?.flush()).resolves.toContain("Fluxnotes");
    await expect(editorRef.current?.flush()).resolves.not.toContain("https://example.com");
  });

  it("creates a link from selected text through the toolbar command", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "Add Fluxnotes link" }, editorRef);
    const editor = await findBlockEditor(container);

    editor.focus();
    await selectEditorText(editor, 4, 13);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "link", type: "toggle-inline" });
    });

    expect(await waitForFocusedLinkInput()).toHaveValue("");

    await userEvent.type(
      screen.getByRole("textbox", { name: "Link URL" }),
      "https://fluxnotes.local",
    );

    await expect(editorRef.current?.flush()).resolves.toContain(
      "[Fluxnotes](https://fluxnotes.local)",
    );
  });

  it("creates a link from the current word when the selection is empty", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "Alpha Beta" }, editorRef);
    const editor = await findBlockEditor(container);

    editor.focus();
    await placeEditorCursor(editor, 8);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "link", type: "toggle-inline" });
    });

    expect(await waitForFocusedLinkInput()).toBeVisible();

    await expect(editorRef.current?.flush()).resolves.toContain("[Beta]()");
  });

  it("shows feedback without mutating content when no text can be selected", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "Alpha Beta" }, editorRef);
    const editor = await findBlockEditor(container);

    editor.focus();
    await placeEditorCursor(editor, 5);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "link", type: "toggle-inline" });
    });

    expect(mocks.toast.info).toHaveBeenCalledWith("Select text to add a link");
    expect(screen.queryByRole("textbox", { name: "Link URL" })).not.toBeInTheDocument();
    await expect(editorRef.current?.flush()).resolves.not.toContain("[](");
  });

  it("highlights and removes the current link through the toolbar command", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      { initialMarkdown: "[Fluxnotes](https://example.com)" },
      editorRef,
    );
    const editor = await findBlockEditor(container);

    editor.focus();
    await placeEditorCursor(editor, 4);

    await waitFor(() => {
      expect(editorRef.current?.getToolbarState().inlineFormats.link).toBe(true);
    });

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "link", type: "toggle-inline" });
    });

    await expect(editorRef.current?.flush()).resolves.toContain("Fluxnotes");
    expect(editorRef.current?.getToolbarState().inlineFormats.link).toBe(false);
  });

  it("replaces existing links inside a partial selected range", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      { initialMarkdown: "[Alpha](https://alpha.example) and Beta" },
      editorRef,
    );
    const editor = await findBlockEditor(container);

    editor.focus();
    await selectEditorText(editor, 2, 13);

    await act(async () => {
      editorRef.current?.runToolbarCommand({ format: "link", type: "toggle-inline" });
    });

    await userEvent.type(
      screen.getByRole("textbox", { name: "Link URL" }),
      "https://selected.example",
    );

    await expect(editorRef.current?.flush()).resolves.toContain(
      "Al[pha and Bet](https://selected.example)a",
    );
    await expect(editorRef.current?.flush()).resolves.not.toContain("https://alpha.example");
  });

  it("runs the configured link shortcut", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        config: { shortcuts: { editor: { "editor.link": "Control+Shift+L" } } },
        initialMarkdown: "Shortcut Link",
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();
    await selectEditorText(editor, 9, 13);
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "l",
      shiftKey: true,
    });

    await act(async () => {
      editor.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(await waitForFocusedLinkInput()).toBeVisible();
    await expect(editorRef.current?.flush()).resolves.toContain("[Link]()");
  });
});
