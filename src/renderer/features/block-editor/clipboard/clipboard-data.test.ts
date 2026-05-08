import type { ResolveAssetRequest } from "@renderer/clients";
import { JSDOM } from "jsdom";
import {
  $createNodeSelection,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { describe, expect, it, vi } from "vite-plus/test";

import { importMarkdownToEditor } from "../editor-state";
import { $isImageNode } from "../syntax/image";
import { createHeadlessMarkdownEditor } from "../test-helper/headless-editor-test-utils";
import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "./clipboard-data";

async function withClipboardDOM<T>(run: () => Promise<T>): Promise<T> {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousDOMParser = globalThis.DOMParser;
  const previousMutationObserver = globalThis.MutationObserver;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const { window } = dom;

  Reflect.set(globalThis, "window", window);
  Reflect.set(globalThis, "document", window.document);
  Reflect.set(globalThis, "DOMParser", window.DOMParser);
  Reflect.set(globalThis, "MutationObserver", window.MutationObserver);
  Reflect.set(globalThis, "getComputedStyle", (element: Element) =>
    window.getComputedStyle(element as never),
  );

  try {
    return await run();
  } finally {
    Reflect.set(globalThis, "window", previousWindow);
    Reflect.set(globalThis, "document", previousDocument);
    Reflect.set(globalThis, "DOMParser", previousDOMParser);
    Reflect.set(globalThis, "MutationObserver", previousMutationObserver);
    Reflect.set(globalThis, "getComputedStyle", previousGetComputedStyle);
    window.close();
  }
}

function createEditorWithMarkdown(markdown: string): LexicalEditor {
  const editor = createHeadlessMarkdownEditor("SourceBlockEditor");
  importMarkdownToEditor(editor, markdown);
  return editor;
}

function visitTextNodes(node: LexicalNode, visit: (node: LexicalNode) => boolean): boolean {
  if (visit(node)) {
    return true;
  }

  if (!$isElementNode(node)) {
    return false;
  }

  return node.getChildren().some((child) => visitTextNodes(child, visit));
}

function selectText(editor: LexicalEditor, value: string): void {
  editor.update(
    () => {
      const found = visitTextNodes($getRoot(), (node) => {
        if (!$isTextNode(node)) {
          return false;
        }

        const start = node.getTextContent().indexOf(value);
        if (start === -1) {
          return false;
        }

        node.select(start, start + value.length);
        return true;
      });

      if (!found) {
        throw new Error(`Text not found: ${value}`);
      }
    },
    { discrete: true },
  );
}

function selectImage(editor: LexicalEditor): void {
  editor.update(
    () => {
      let imageKey: string | null = null;

      const visit = (node: LexicalNode): boolean => {
        if ($isImageNode(node)) {
          imageKey = node.getKey();
          return true;
        }

        if (!$isElementNode(node)) {
          return false;
        }

        return node.getChildren().some(visit);
      };

      if (!visit($getRoot()) || imageKey === null) {
        throw new Error("Image not found");
      }

      const selection = $createNodeSelection();
      selection.add(imageKey);
      $setSelection(selection);
    },
    { discrete: true },
  );
}

describe("block editor clipboard data", () => {
  it("exports the full document with one application payload", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown(["# Title", "", "Text **bold**"].join("\n"));

      const data = await createClipboardDataFromDocument(editor, "block-1", async () => ({
        assets: [],
      }));

      expect(data?.text).toBe(["# Title", "", "Text **bold**", ""].join("\n"));
      expect(data?.html).toContain("Title");
      expect(data?.html).toContain("<strong");
      expect(data?.payload).toMatchObject({
        nodes: [{ type: "heading" }, { type: "paragraph" }],
        sourceBlockId: "block-1",
      });
    });
  });

  it("exports tables as root block nodes", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown(
        ["| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n"),
      );

      const data = await createClipboardDataFromDocument(editor, "block-1", async () => ({
        assets: [],
      }));

      expect(data?.text).toContain("| A");
      expect(data?.payload).toMatchObject({
        nodes: [expect.objectContaining({ type: "table" })],
        sourceBlockId: "block-1",
      });
    });
  });

  it("exports selected inline content as markdown", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown("Text **bold** after");
      selectText(editor, "bold");

      const data = await createClipboardDataFromCurrentSelection(editor, "block-1", async () => ({
        assets: [],
      }));

      expect(data?.text).toBe("**bold**\n");
      expect(data?.html).toContain("bold");
      expect(data?.html).toContain("<strong");
      expect(data?.payload).toMatchObject({
        nodes: [{ type: "text" }],
        sourceBlockId: "block-1",
      });
    });
  });

  it("exports external formats from file-url rewritten nodes without changing the payload", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown(
        "Literal assets://block-1/photo.png\n\n![Alt](assets://block-1/photo.png)",
      );
      const resolveAssets = vi.fn(async (request: ResolveAssetRequest) => {
        expect(request).toEqual({ assetUrls: ["assets://block-1/photo.png"] });
        return {
          assets: [
            {
              assetUrl: "assets://block-1/photo.png",
              fileUrl: "file:///tmp/block-1/photo.png",
            },
          ],
        };
      });

      const data = await createClipboardDataFromDocument(editor, "block-1", resolveAssets);

      expect(data?.text).toContain("Literal assets\\://block-1/photo.png");
      expect(data?.text).toContain("![Alt](file:///tmp/block-1/photo.png)");
      expect(data?.html).toContain("file:///tmp/block-1/photo.png");
      expect(data?.html).not.toContain('src="assets://block-1/photo.png"');
      expect(data?.payload.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({ text: "Literal assets://block-1/photo.png" }),
            ]),
          }),
          expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({ src: "assets://block-1/photo.png" }),
            ]),
          }),
        ]),
      );
    });
  });

  it("exports file-url image html without assigning the file url to image DOM", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown("![Alt](assets://block-1/photo.png)");
      const imagePrototype = window.HTMLImageElement.prototype;
      const srcDescriptor = Object.getOwnPropertyDescriptor(imagePrototype, "src");
      const srcSetter = vi.fn();
      const setAttribute = vi.spyOn(window.Element.prototype, "setAttribute");

      Object.defineProperty(imagePrototype, "src", {
        configurable: true,
        get() {
          return srcDescriptor?.get?.call(this) ?? "";
        },
        set(value: string) {
          srcSetter(value);
          srcDescriptor?.set?.call(this, value);
        },
      });

      try {
        const data = await createClipboardDataFromDocument(editor, "block-1", async () => ({
          assets: [
            {
              assetUrl: "assets://block-1/photo.png",
              fileUrl: "file:///tmp/block-1/photo.png",
            },
          ],
        }));

        expect(data?.html).toContain('src="file:///tmp/block-1/photo.png"');
        expect(srcSetter).not.toHaveBeenCalledWith("file:///tmp/block-1/photo.png");
        expect(setAttribute).not.toHaveBeenCalledWith("src", "file:///tmp/block-1/photo.png");
      } finally {
        setAttribute.mockRestore();
        if (srcDescriptor) {
          Object.defineProperty(imagePrototype, "src", srcDescriptor);
        }
      }
    });
  });

  it("exports an image file url for a selected single asset image", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown("![Alt](assets://block-1/photo.png)");
      selectImage(editor);
      const resolveAssets = vi.fn(async (request: ResolveAssetRequest) => {
        expect(request).toEqual({ assetUrls: ["assets://block-1/photo.png"] });
        return {
          assets: [
            {
              assetUrl: "assets://block-1/photo.png",
              fileUrl: "file:///tmp/block-1/photo.png",
            },
          ],
        };
      });

      const data = await createClipboardDataFromCurrentSelection(editor, "block-1", resolveAssets);

      expect(data?.imageFileUrl).toBe("file:///tmp/block-1/photo.png");
      expect(data?.text).toBe("![Alt](file:///tmp/block-1/photo.png)\n");
    });
  });

  it("does not export an image file url for full document copy", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown("![Alt](assets://block-1/photo.png)");

      const data = await createClipboardDataFromDocument(editor, "block-1", async () => ({
        assets: [
          {
            assetUrl: "assets://block-1/photo.png",
            fileUrl: "file:///tmp/block-1/photo.png",
          },
        ],
      }));

      expect(data?.imageFileUrl).toBeUndefined();
    });
  });

  it("does not export an image file url for selected remote images", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown("![Alt](https://example.com/photo.png)");
      selectImage(editor);

      const data = await createClipboardDataFromCurrentSelection(editor, "block-1", async () => ({
        assets: [],
      }));

      expect(data?.imageFileUrl).toBeUndefined();
      expect(data?.text).toBe("![Alt](https://example.com/photo.png)\n");
    });
  });

  it("does not export collapsed selections", async () => {
    await withClipboardDOM(async () => {
      const editor = createEditorWithMarkdown("Text");
      selectText(editor, "");

      await expect(createClipboardDataFromCurrentSelection(editor, "block-1")).resolves.toBeNull();
    });
  });
});
