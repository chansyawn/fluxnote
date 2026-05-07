import { describe, expect, it } from "vite-plus/test";

import { rewriteImageNodeUrls } from "./image-insert-plugin";

describe("image insert plugin", () => {
  it("rewrites nested image node urls for internal clipboard paste", () => {
    const nodes = [
      {
        children: [
          { alt: "A", src: "assets://source/a.png", title: null, type: "image", version: 1 },
          { text: " untouched ", type: "text", version: 1 },
          { alt: "B", src: "https://example.com/b.png", title: null, type: "image", version: 1 },
        ],
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        type: "paragraph",
        version: 1,
      },
    ];

    expect(
      rewriteImageNodeUrls(nodes, new Map([["assets://source/a.png", "assets://target/a.png"]])),
    ).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({ src: "assets://target/a.png" }),
          expect.objectContaining({ text: " untouched " }),
          expect.objectContaining({ src: "https://example.com/b.png" }),
        ],
      }),
    ]);
    expect(nodes[0]?.children?.[0]?.src).toBe("assets://source/a.png");
  });
});
