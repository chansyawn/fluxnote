import type { ResolveAssetRequest } from "@renderer/clients";
import { describe, expect, it, vi } from "vite-plus/test";

import { withBlockEditorDOM } from "../test-helper/dom-runtime";
import {
  createEditorFromMarkdown,
  selectFirstImage,
  selectText,
} from "../test-helper/editor-driver";
import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "./clipboard-data";

describe("block editor clipboard data", () => {
  it("exports the full document with one application payload", async () => {
    const editor = createEditorFromMarkdown(
      ["# Title", "", "Text **bold**"].join("\n"),
      "SourceBlockEditor",
    );

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

  it("exports tables as root block nodes", async () => {
    const editor = createEditorFromMarkdown(["| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n"));

    const data = await createClipboardDataFromDocument(editor, "block-1", async () => ({
      assets: [],
    }));

    expect(data?.text).toContain("| A");
    expect(data?.payload).toMatchObject({
      nodes: [expect.objectContaining({ type: "table" })],
      sourceBlockId: "block-1",
    });
  });

  it("exports selected inline content as markdown", async () => {
    const editor = createEditorFromMarkdown("Text **bold** after");
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

  it("exports external formats from file-url rewritten nodes without changing the payload", async () => {
    const editor = createEditorFromMarkdown(
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

  it("exports file-url image html without assigning the file url to image DOM", async () => {
    const editor = createEditorFromMarkdown("![Alt](assets://block-1/photo.png)");
    const { imagePrototype, setAttribute, srcDescriptor, srcSetter, writeRequest } =
      withBlockEditorDOM((window) => {
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

        const writeRequest = createClipboardDataFromDocument(editor, "block-1", async () => ({
          assets: [
            {
              assetUrl: "assets://block-1/photo.png",
              fileUrl: "file:///tmp/block-1/photo.png",
            },
          ],
        }));

        return { imagePrototype, setAttribute, srcDescriptor, srcSetter, writeRequest };
      });

    try {
      const data = await writeRequest;

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

  it("exports an image file url for a selected single asset image", async () => {
    const editor = createEditorFromMarkdown("![Alt](assets://block-1/photo.png)");
    selectFirstImage(editor);
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

  it("does not export an image file url for full document copy", async () => {
    const editor = createEditorFromMarkdown("![Alt](assets://block-1/photo.png)");

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

  it("does not export an image file url for selected remote images", async () => {
    const editor = createEditorFromMarkdown("![Alt](https://example.com/photo.png)");
    selectFirstImage(editor);

    const data = await createClipboardDataFromCurrentSelection(editor, "block-1", async () => ({
      assets: [],
    }));

    expect(data?.imageFileUrl).toBeUndefined();
    expect(data?.text).toBe("![Alt](https://example.com/photo.png)\n");
  });

  it("does not export collapsed selections", async () => {
    const editor = createEditorFromMarkdown("Text");
    selectText(editor, "");

    await expect(createClipboardDataFromCurrentSelection(editor, "block-1")).resolves.toBeNull();
  });
});
