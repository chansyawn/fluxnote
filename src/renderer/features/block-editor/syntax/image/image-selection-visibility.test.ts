import { JSDOM } from "jsdom";
import {
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  type LexicalEditor,
} from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { createHeadlessMarkdownEditor } from "../../test-helper/headless-editor-test-utils";
import { $createImageNode } from "./image-node";
import { IMAGE_SELECTED_CLASS, setImageOutlineClass } from "./image-outline-plugin";
import { getSingleSelectedImageKey, shouldShowImageOutline } from "./image-selection-visibility";

function readSelectedImageKey(markdown = "![Alt](https://example.com/image.png)"): string | null {
  const editor = createHeadlessMarkdownEditor();
  let imageKey: string | null = null;
  let selectedImageKey: string | null = null;

  editor.update(
    () => {
      const root = $getRoot();
      root.clear();

      const paragraph = $createParagraphNode();
      const image = $createImageNode({
        alt: "Alt",
        src: "https://example.com/image.png",
        title: null,
      });
      imageKey = image.getKey();
      paragraph.append(image);
      root.append(paragraph);

      const selection = $createNodeSelection();
      selection.add(image.getKey());
      $setSelection(selection);

      selectedImageKey = getSingleSelectedImageKey(selection);
    },
    { discrete: true },
  );

  expect(markdown).toBeDefined();
  expect(imageKey).not.toBeNull();
  return selectedImageKey;
}

function withDOM<T>(run: (document: Document) => T): T {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  try {
    return run(dom.window.document);
  } finally {
    dom.window.close();
  }
}

describe("image selection visibility", () => {
  it("returns the selected image key for a single image node selection", () => {
    expect(readSelectedImageKey()).not.toBeNull();
  });

  it("ignores multi node selections", () => {
    const editor = createHeadlessMarkdownEditor();
    let selectedImageKey: string | null = "initial";

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();

        const firstImage = $createImageNode({
          alt: "First",
          src: "https://example.com/first.png",
          title: null,
        });
        const secondImage = $createImageNode({
          alt: "Second",
          src: "https://example.com/second.png",
          title: null,
        });
        const paragraph = $createParagraphNode();
        paragraph.append(firstImage, secondImage);
        root.append(paragraph);

        const selection = $createNodeSelection();
        selection.add(firstImage.getKey());
        selection.add(secondImage.getKey());

        selectedImageKey = getSingleSelectedImageKey(selection);
      },
      { discrete: true },
    );

    expect(selectedImageKey).toBeNull();
  });

  it("ignores range selections", () => {
    const editor = createHeadlessMarkdownEditor();
    let selectedImageKey: string | null = "initial";

    editor.update(
      () => {
        const root = $getRoot();
        root.clear();

        const text = $createTextNode("Text");
        const paragraph = $createParagraphNode();
        paragraph.append(text);
        root.append(paragraph);

        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, "text");
        selection.focus.set(text.getKey(), text.getTextContentSize(), "text");

        selectedImageKey = getSingleSelectedImageKey(selection);
      },
      { discrete: true },
    );

    expect(selectedImageKey).toBeNull();
  });

  it("shows outline only while the focused editor owns a non-dragging single image cursor", () => {
    const nodeKey = "image-key";

    expect(
      shouldShowImageOutline(nodeKey, {
        editorHasFocus: true,
        isPointerSelecting: false,
        selectedImageKey: nodeKey,
      }),
    ).toBe(true);

    expect(
      shouldShowImageOutline(nodeKey, {
        editorHasFocus: false,
        isPointerSelecting: false,
        selectedImageKey: nodeKey,
      }),
    ).toBe(false);

    expect(
      shouldShowImageOutline(nodeKey, {
        editorHasFocus: true,
        isPointerSelecting: true,
        selectedImageKey: nodeKey,
      }),
    ).toBe(false);

    expect(
      shouldShowImageOutline(nodeKey, {
        editorHasFocus: true,
        isPointerSelecting: false,
        selectedImageKey: "other-image-key",
      }),
    ).toBe(false);
  });

  it("moves the selected class between image wrappers", () => {
    withDOM((document) => {
      const firstElement = document.createElement("span");
      const secondElement = document.createElement("span");
      const editor = {
        getElementByKey: (key: string) => {
          if (key === "first") {
            return firstElement;
          }
          if (key === "second") {
            return secondElement;
          }
          return null;
        },
      } as Pick<LexicalEditor, "getElementByKey"> as LexicalEditor;

      setImageOutlineClass(editor, null, "first");
      expect(firstElement.classList.contains(IMAGE_SELECTED_CLASS)).toBe(true);
      expect(secondElement.classList.contains(IMAGE_SELECTED_CLASS)).toBe(false);

      setImageOutlineClass(editor, "first", "second");
      expect(firstElement.classList.contains(IMAGE_SELECTED_CLASS)).toBe(false);
      expect(secondElement.classList.contains(IMAGE_SELECTED_CLASS)).toBe(true);

      setImageOutlineClass(editor, "second", null);
      expect(secondElement.classList.contains(IMAGE_SELECTED_CLASS)).toBe(false);
    });
  });
});
