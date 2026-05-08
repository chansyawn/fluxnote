import { LexicalBuilder } from "@lexical/extension";
import { describe, expect, it } from "vite-plus/test";

import { createBlockEditorContentExtension } from "./block-editor-content-extension";
import { createBlockEditorCoreExtension } from "./block-editor-core-extension";
import { createMarkdownEditor } from "./editor-state";
import { parseMarkdownWithShortcuts } from "./test-helper/headless-editor-test-utils";

describe("block editor core extension", () => {
  it("creates the shared headless editor composition", () => {
    const editor = LexicalBuilder.fromExtensions([
      createBlockEditorCoreExtension("BlockEditorCoreTest"),
    ]).buildEditor();

    expect(editor).toBeDefined();
  });

  it("backs markdown editor helpers with the shared core composition", () => {
    const editor = createMarkdownEditor("BlockEditorCoreHelperTest");

    expect(editor).toBeDefined();
    expect(parseMarkdownWithShortcuts("# Heading").children[0]).toMatchObject({
      depth: 1,
      type: "heading",
    });
  });

  it("keeps runtime content extension creation separate from core registration", () => {
    const extension = createBlockEditorContentExtension({
      blockId: "block-1",
      initialMarkdown: "# Heading",
      namespace: "BlockEditorRuntimeTest",
    });

    expect(extension.name).toBe("fluxnotes/block-editor/content");
  });
});
