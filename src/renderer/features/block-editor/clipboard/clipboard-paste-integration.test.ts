import { $getRoot, $getSelection, type LexicalEditor, type PasteCommandType } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import type { BlockEditorRuntime } from "../core/types";
import { editorFromMarkdown, readMarkdown } from "../test-helper/editor-driver";
import { handleBlockEditorPaste } from "./clipboard-paste";

class TestDataTransfer {
  private readonly data: Map<string, string>;
  readonly files: File[] = [];
  readonly items = [];
  readonly types: string[];

  constructor(data: Map<string, string>) {
    this.data = data;
    this.types = Array.from(data.keys());
  }

  getData(type: string): string {
    return this.data.get(type) ?? "";
  }

  setData(): void {}

  clearData(): void {}

  setDragImage(): void {}

  dropEffect = "none" as const;
  effectAllowed = "none" as const;
}

function makePasteEvent(data: Map<string, string>): PasteCommandType {
  const dataTransfer = new TestDataTransfer(data) as unknown as DataTransfer;
  return {
    clipboardData: dataTransfer,
    preventDefault() {},
    stopPropagation() {},
  } as unknown as PasteCommandType;
}

function cloneSelection(editor: LexicalEditor) {
  return editor.read(() => $getSelection()?.clone() ?? null);
}

const runtime = {} as BlockEditorRuntime;

describe("handleBlockEditorPaste integration", () => {
  it("parses pasted plain text as markdown into the document", () => {
    const editor = editorFromMarkdown("");
    const event = makePasteEvent(new Map([["text/plain", "# Heading"]]));

    expect(handleBlockEditorPaste(editor, runtime, event, cloneSelection(editor))).toBe(true);
    expect(readMarkdown(editor).trim()).toBe("# Heading");
  });

  it("inserts plain text verbatim when the selection is inside a code block", () => {
    const editor = editorFromMarkdown("```ts\nconst x = 1;\n```");
    editor.update(
      () => {
        $getRoot()
          .getChildren()
          .find((child) => child.getType() === "code")
          ?.selectEnd();
      },
      { discrete: true },
    );

    const event = makePasteEvent(new Map([["text/plain", "# Not a heading"]]));
    expect(handleBlockEditorPaste(editor, runtime, event, cloneSelection(editor))).toBe(true);

    const markdown = readMarkdown(editor);
    expect(markdown).toContain("```ts");
    expect(markdown).toContain("# Not a heading");
    expect(markdown).not.toMatch(/^# Not a heading/m);
  });
});
