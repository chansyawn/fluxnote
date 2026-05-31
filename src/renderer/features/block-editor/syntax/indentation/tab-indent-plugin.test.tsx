// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import { describe, expect, it } from "vite-plus/test";

import type { BlockEditorHandle } from "../../core/types";
import { findBlockEditor, renderBlockEditor } from "../../test/block-editor-test-utils";

function createTabEvent(options: { shiftKey?: boolean } = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "Tab",
    shiftKey: options.shiftKey,
  });
}

async function dispatchTab(editor: HTMLElement, options: { shiftKey?: boolean } = {}) {
  const event = createTabEvent(options);

  await act(async () => {
    editor.dispatchEvent(event);
  });

  return event;
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

describe("tab indent plugin", () => {
  it("inserts two spaces at the line start in paragraph text", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findBlockEditor(container);

    await user.click(editor);
    await user.keyboard("Hello");
    const event = await dispatchTab(editor);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByText("Hello").textContent).toBe("  Hello");
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("&#x20; Hello");
    });
  });

  it("keeps the cursor at the same content position after indenting the line start", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findBlockEditor(container);

    await user.click(editor);
    await user.keyboard("Hello");
    await placeEditorCursor(editor, 3);
    const event = await dispatchTab(editor);
    await user.keyboard("X");

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByText("HelXlo").textContent).toBe("  HelXlo");
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("&#x20; HelXlo");
    });
  });

  it("removes up to two leading spaces from paragraph text on Shift+Tab", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findBlockEditor(container);

    await user.click(editor);
    await user.keyboard("  Hello");
    const event = await dispatchTab(editor, { shiftKey: true });

    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("Hello");
    });
  });

  it("keeps focus when Shift+Tab has no leading spaces to remove", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor({ initialMarkdown: "" }, editorRef);
    const editor = await findBlockEditor(container);

    await user.click(editor);
    await user.keyboard("Hello");
    const event = await dispatchTab(editor, { shiftKey: true });

    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("Hello");
    });
  });

  it("inserts two spaces at the current code line start", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["```ts", "const value = 1;", "```"].join("\n"),
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    const code = container.querySelector<HTMLElement>("code");
    expect(code).not.toBeNull();

    await userEvent.click(code as HTMLElement);
    const event = await dispatchTab(editor);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("  const value = 1;");
    });
  });

  it("indents every selected paragraph line at the line start", async () => {
    const user = userEvent.setup();
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["Alpha", "", "Beta"].join("\n"),
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    await user.click(editor);
    await selectEditorText(editor, 0, "AlphaBeta".length);
    const event = await dispatchTab(editor);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByText("Alpha").textContent).toBe("  Alpha");
    expect(screen.getByText("Beta").textContent).toBe("  Beta");
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toContain("&#x20; Alpha\n\n&#x20; Beta");
    });
  });

  it("does not insert plain spaces when Tab is pressed in list items", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["- Parent", "- Child"].join("\n"),
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);

    await userEvent.click(screen.getByText("Child"));
    const event = await dispatchTab(editor);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.not.toContain("*   Child");
    });
  });

  it("traps focus when Tab cannot indent a list item", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["- Parent", "- Child"].join("\n"),
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);

    await userEvent.click(screen.getByText("Parent"));
    const event = await dispatchTab(editor);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.toBe("* Parent\n\n* Child\n");
    });
  });

  it("keeps default table Tab behavior for table cells", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["| Name | Status |", "| --- | --- |", "| Alpha | Ready |"].join("\n"),
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);

    await userEvent.click(await screen.findByRole("cell", { name: "Alpha" }));
    const event = await dispatchTab(editor);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => {
      await expect(editorRef.current?.flush()).resolves.not.toContain("|   Alpha");
    });
  });
});
