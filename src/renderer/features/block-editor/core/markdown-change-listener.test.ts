import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createHeadlessMarkdownEditor } from "../test-helper/headless-editor-test-utils";
import { registerMarkdownChangeListener } from "./markdown-change-listener";
import { importMarkdownToEditor } from "./markdown-editor-io";

function replaceDocumentText(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));

      const root = $getRoot();
      root.clear();
      root.append(paragraph);
    },
    { discrete: true },
  );
}

function createMarkdownChangeListener(initialMarkdown = "Initial") {
  const editor = createHeadlessMarkdownEditor();
  importMarkdownToEditor(editor, initialMarkdown);

  const onMarkdownChange = vi.fn<(markdown: string) => void>();
  const listener = registerMarkdownChangeListener(editor, {
    onMarkdownChange,
  });

  return { editor, listener, onMarkdownChange };
}

describe("markdown change listener", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces markdown updates after dirty editor updates", () => {
    const { editor, listener, onMarkdownChange } = createMarkdownChangeListener();

    replaceDocumentText(editor, "Updated");

    expect(onMarkdownChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(599);
    expect(onMarkdownChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onMarkdownChange).toHaveBeenCalledTimes(1);
    expect(onMarkdownChange).toHaveBeenLastCalledWith(expect.stringContaining("Updated"));

    listener.dispose();
  });

  it("emits only the latest markdown in a burst of updates", () => {
    const { editor, listener, onMarkdownChange } = createMarkdownChangeListener();

    replaceDocumentText(editor, "First");
    vi.advanceTimersByTime(300);
    replaceDocumentText(editor, "Second");

    vi.advanceTimersByTime(599);
    expect(onMarkdownChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    const emittedMarkdown = onMarkdownChange.mock.calls[0]?.[0] ?? "";

    expect(onMarkdownChange).toHaveBeenCalledTimes(1);
    expect(emittedMarkdown).toContain("Second");
    expect(emittedMarkdown).not.toContain("First");

    listener.dispose();
  });

  it("flushes pending markdown immediately", () => {
    const { editor, listener, onMarkdownChange } = createMarkdownChangeListener();

    replaceDocumentText(editor, "Flush me");
    const markdown = listener.flush();

    expect(markdown).toContain("Flush me");
    expect(onMarkdownChange).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(600);
    expect(onMarkdownChange).toHaveBeenCalledTimes(1);

    listener.dispose();
  });

  it("does not emit unchanged markdown", () => {
    const { editor, listener, onMarkdownChange } = createMarkdownChangeListener();

    replaceDocumentText(editor, "Initial");
    vi.advanceTimersByTime(600);

    expect(listener.flush()).toContain("Initial");
    expect(onMarkdownChange).not.toHaveBeenCalled();

    listener.dispose();
  });

  it("flushes pending markdown when disposed", () => {
    const { editor, listener, onMarkdownChange } = createMarkdownChangeListener();

    replaceDocumentText(editor, "Disposed");
    listener.dispose();

    expect(onMarkdownChange).toHaveBeenCalledTimes(1);
    expect(onMarkdownChange).toHaveBeenLastCalledWith(expect.stringContaining("Disposed"));
  });
});
