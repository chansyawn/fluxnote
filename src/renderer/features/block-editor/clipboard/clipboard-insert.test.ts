import { $getRoot, $getSelection, $setSelection } from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import type { BlockEditorRuntime } from "../core/types";
import { editorFromMarkdown, readMarkdown } from "../test-helper/editor-driver";
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

    expect(readMarkdown(editor).trim()).toBe("Appended");
  });

  it("inserts serialized nodes at the restored selection", () => {
    const editor = editorFromMarkdown("Hello world");
    const selection = editor.read(() => $getSelection()?.clone() ?? null);

    editor.update(
      () => {
        $setSelection(null);
        if (selection) {
          $setSelection(selection.clone());
        }
        insertSerializedNodesAtSelection([textNode("Start")]);
      },
      { discrete: true },
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
    const runtime = {
      assets: {
        copy: copyAssets,
      },
    } as unknown as BlockEditorRuntime;

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

    expect(copyAssets).toHaveBeenCalledWith({
      assetUrls: ["assets://source/photo.png"],
      sourceBlockId: "source-block",
    });
    expect(readMarkdown(editor)).toContain("assets://target/photo.png");
  });
});
