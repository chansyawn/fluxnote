import { describe, expect, it, vi } from "vite-plus/test";

import type { ClipboardSerializedNode } from "../models/clipboard";
import {
  rewriteClipboardAssetsForExternalFormats,
  rewriteHtmlFileImageSources,
  rewriteMarkdownFileImageSources,
} from "./asset-rewrites";

describe("clipboard assets", () => {
  it("rewrites copied image assets for external formats", () => {
    const nodes: ClipboardSerializedNode[] = [
      {
        children: [
          {
            alt: "Photo",
            src: "assets://source/photo.png",
            title: null,
            type: "image",
            version: 1,
          },
        ],
        type: "paragraph",
        version: 1,
      },
    ];

    const rewritten = rewriteClipboardAssetsForExternalFormats(
      nodes,
      new Map([["assets://source/photo.png", "file:///tmp/photo.png"]]),
    );

    expect(rewritten[0]?.children?.[0]?.src).toBe("file:///tmp/photo.png");
    expect(nodes[0]?.children?.[0]?.src).toBe("assets://source/photo.png");
  });

  it("replaces unresolved copied image assets with unavailable placeholders", () => {
    const nodes: ClipboardSerializedNode[] = [
      {
        alt: "Photo",
        src: "assets://source/missing.png",
        title: "Caption",
        type: "image",
        version: 1,
      },
    ];

    const rewritten = rewriteClipboardAssetsForExternalFormats(nodes, new Map());

    expect(rewritten[0]).toEqual(
      expect.objectContaining({
        alt: "",
        src: "Unavailable",
        title: null,
      }),
    );
  });

  it("imports html file image sources without changing ordinary file links", async () => {
    const importFiles = vi.fn(async () => ({
      assets: [
        {
          altText: "photo.png",
          assetUrl: "assets://imported/photo.png",
          fileUrl: "file:///tmp/photo.png",
        },
      ],
    }));

    const html = [
      '<p><img src="file:///tmp/photo.png" alt="Photo"></p>',
      '<p><img src="file:///tmp/missing.png" alt="Missing" title="Old"></p>',
      '<a href="file:///tmp/document.pdf">Local</a>',
    ].join("");

    const rewritten = await rewriteHtmlFileImageSources(html, importFiles);

    expect(importFiles).toHaveBeenCalledWith({
      files: [{ fileUrl: "file:///tmp/photo.png" }, { fileUrl: "file:///tmp/missing.png" }],
    });
    expect(rewritten).toContain('<img src="assets://imported/photo.png" alt="Photo">');
    expect(rewritten).toContain('<img src="Unavailable" alt="">');
    expect(rewritten).toContain('<a href="file:///tmp/document.pdf">Local</a>');
  });

  it("imports markdown file image destinations and downgrades failures", async () => {
    const importFiles = vi.fn(async () => ({
      assets: [
        {
          altText: "photo.png",
          assetUrl: "assets://imported/photo.png",
          fileUrl: "file:///tmp/photo.png",
        },
        {
          error: "IMPORT_FAILED",
          fileUrl: "file:///tmp/missing.png",
        },
      ],
    }));

    const markdown = [
      "![Photo](file:///tmp/photo.png)",
      '![Missing](file:///tmp/missing.png "Old")',
      "[Local](file:///tmp/document.pdf)",
    ].join("\n\n");

    const rewritten = await rewriteMarkdownFileImageSources(markdown, importFiles);

    expect(rewritten).toContain("![Photo](assets://imported/photo.png)");
    expect(rewritten).toContain("![](Unavailable)");
    expect(rewritten).toContain("[Local](file:///tmp/document.pdf)");
  });
});
