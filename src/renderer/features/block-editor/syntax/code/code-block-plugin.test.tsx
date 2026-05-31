// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import type { BlockEditorHandle } from "../../core/types";
import {
  createBlockEditorRuntime,
  findBlockEditor,
  renderBlockEditor,
} from "../../test/block-editor-test-utils";

function createBackspaceEvent(): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "Backspace",
  });
}

async function dispatchBackspace(editor: HTMLElement): Promise<KeyboardEvent> {
  const event = createBackspaceEvent();

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

describe("code block plugin", () => {
  it("copies code block text through the code block controls", async () => {
    const runtime = createBlockEditorRuntime();
    const { container } = renderBlockEditor({
      initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      runtime,
    });
    await findBlockEditor(container);

    await userEvent.click(await screen.findByRole("button", { name: "Copy code" }));

    expect(runtime.clipboard.writeText).toHaveBeenCalledWith("const answer = 42;");
    expect(await screen.findByRole("button", { name: "Copy code" })).toBeVisible();
  });

  it("updates a code block language through the code block controls", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      },
      editorRef,
    );
    await findBlockEditor(container);

    await userEvent.click(await screen.findByRole("combobox", { name: "Code language" }));
    await userEvent.click(await screen.findByRole("option", { name: "Python" }));

    await expect(editorRef.current?.flush()).resolves.toContain("```python");
  });

  it("renders code block line numbers when the Markdown preference is enabled", async () => {
    const { container } = renderBlockEditor({
      config: { markdown: { codeBlock: { showLineNumbers: true } } },
      initialMarkdown: ["```ts", "const answer = 42;", "answer;", "```"].join("\n"),
    });
    await findBlockEditor(container);

    await waitFor(() => {
      expect(container.querySelectorAll("pre .line-number")).toHaveLength(2);
    });
  });

  it("configures code highlighting before the highlight plugin starts", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const { container } = renderBlockEditor({
        config: { markdown: { codeBlock: { showLineNumbers: true } } },
        initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      });
      await findBlockEditor(container);

      await waitFor(() => {
        expect(container.querySelectorAll("pre .line-number")).toHaveLength(1);
      });

      const consoleOutput = consoleError.mock.calls.flat().map(String).join("\n");
      expect(consoleOutput).not.toContain(
        "Highlight plugin requires a parser to be set in the highlightPluginConfig.",
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("turns a first single-line code block into text when Backspace starts the code block", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["```ts", "const answer = 42;", "```"].join("\n"),
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();

    await placeEditorCursor(editor, 0);
    const event = await dispatchBackspace(editor);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(async () => {
      const markdown = await editorRef.current?.flush();
      expect(markdown).toContain("const answer = 42;");
      expect(markdown).not.toContain("```");
    });
  });

  it("keeps a multi-line code block when Backspace starts the code block", async () => {
    const editorRef = createRef<BlockEditorHandle>();
    const { container } = renderBlockEditor(
      {
        initialMarkdown: ["```ts", "const answer = 42;", "answer;", "```"].join("\n"),
      },
      editorRef,
    );
    const editor = await findBlockEditor(container);
    editor.focus();

    await placeEditorCursor(editor, 0);
    const event = await dispatchBackspace(editor);

    expect(event.defaultPrevented).toBe(false);
    await expect(editorRef.current?.flush()).resolves.toContain("```ts");
  });
});
