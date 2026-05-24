import { $getRoot, $getSelection, $setSelection } from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createBlockEditorRuntime,
  editorFromMarkdown,
  expectEditorMarkdown,
  readMarkdown,
} from "../test-helper/editor-driver";
import {
  insertClipboardPayloadAtSelection,
  insertSerializedNodesAtSelection,
} from "./clipboard-insert";

function textNode(text: string) {
  return {
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    text,
    type: "text",
    version: 1,
  };
}

describe("clipboard insert", () => {
  it("appends serialized nodes when there is no active selection", () => {
    const editor = editorFromMarkdown("");

    editor.update(
      () => {
        $getRoot().clear();
        $setSelection(null);
        insertSerializedNodesAtSelection([textNode("Appended")]);
      },
      { discrete: true },
    );

    expectEditorMarkdown(editor, "Appended");
  });

  it("inserts clipboard payload nodes at the restored selection", async () => {
    const editor = editorFromMarkdown("Hello world");
    const selection = editor.read(() => $getSelection()?.clone() ?? null);

    editor.update(
      () => {
        $setSelection(null);
      },
      { discrete: true },
    );

    await insertClipboardPayloadAtSelection(
      editor,
      createBlockEditorRuntime(),
      {
        nodes: [textNode("Start")],
        sourceBlockId: "source-block",
      },
      selection,
    );

    expect(readMarkdown(editor)).toContain("Start");
    expect(readMarkdown(editor)).toContain("Hello world");
  });

  it("copies payload assets into the target block before inserting nodes", async () => {
    const editor = editorFromMarkdown("");
    const copyAssets = vi.fn(async () => ({
      assets: [
        {
          assetUrl: "assets://target/photo.png",
          sourceAssetUrl: "assets://source/photo.png",
        },
      ],
    }));
    const runtime = createBlockEditorRuntime({
      assets: {
        copy: copyAssets,
      },
    });

    await insertClipboardPayloadAtSelection(
      editor,
      runtime,
      {
        nodes: [
          {
            alt: "Photo",
            src: "assets://source/photo.png",
            title: null,
            type: "image",
            version: 1,
          },
        ],
        sourceBlockId: "source-block",
      },
      null,
    );

    expect(readMarkdown(editor)).toContain("assets://target/photo.png");
  });
});
