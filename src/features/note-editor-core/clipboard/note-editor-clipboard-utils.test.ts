import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { NOTE_EDITOR_NODES } from "../composer/note-editor-nodes";
import { $createNoteEditorImageNode } from "../image/note-editor-image-node";
import { collectClipboardSnapshot } from "./note-editor-clipboard-snapshot";

describe("note-editor-clipboard-snapshot", () => {
  it("serializes nested document nodes recursively for whole-document copy", () => {
    const editor = createEditor({
      nodes: NOTE_EDITOR_NODES,
      onError: (error) => {
        throw error;
      },
    });

    editor.update(
      () => {
        const root = $getRoot();

        const firstParagraph = $createParagraphNode();
        firstParagraph.append($createTextNode("alpha"));

        const secondParagraph = $createParagraphNode();
        secondParagraph.append($createTextNode("omega"));

        root.append(firstParagraph);
        root.append(
          $createNoteEditorImageNode({
            altText: "diagram",
            blockId: "block-1",
            src: "https://example.com/image.png",
          }),
        );
        root.append(secondParagraph);
      },
      { discrete: true },
    );

    const snapshot = editor.read(() => collectClipboardSnapshot(editor, "document"));

    expect(snapshot).not.toBeNull();
    expect(snapshot?.serializedNodes).toMatchObject([
      {
        type: "paragraph",
        children: [{ type: "text", text: "alpha" }],
      },
      {
        type: "note-editor-image",
        altText: "diagram",
        blockId: "block-1",
        src: "https://example.com/image.png",
      },
      {
        type: "paragraph",
        children: [{ type: "text", text: "omega" }],
      },
    ]);
  });
});
