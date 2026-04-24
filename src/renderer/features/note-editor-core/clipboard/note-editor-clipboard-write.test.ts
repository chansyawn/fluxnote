import { describe, expect, it } from "vite-plus/test";

import type { ClipboardPayload } from "./note-editor-clipboard-types";
import { buildClipboardWriteCandidates } from "./note-editor-clipboard-write";

const basePayload: ClipboardPayload = {
  html: "<p>alpha</p>",
  hasUncachedInternalImages: false,
  imageRefs: [],
  lexicalJson: '{"nodes":[]}',
  markdown: "alpha",
  singleSelectedImage: null,
};

describe("note-editor-clipboard-write", () => {
  it("builds standard clipboard candidates with lexical fallback first", () => {
    const candidates = buildClipboardWriteCandidates(basePayload);

    expect(candidates).toHaveLength(2);
    expect(Object.keys(candidates[0])).toEqual([
      "text/html",
      "text/plain",
      "application/x-lexical-editor",
    ]);
    expect(Object.keys(candidates[1])).toEqual(["text/html", "text/plain"]);
  });

  it("prioritizes native image mime before rich text for single-image payloads", () => {
    const candidates = buildClipboardWriteCandidates(basePayload, {
      html: '<img src="data:image/png;base64,abc" alt="diagram">',
      imageBlob: new Blob(["png"], { type: "image/png" }),
      imageMimeType: "image/png",
    });

    expect(candidates).toHaveLength(3);
    expect(Object.keys(candidates[0])).toEqual([
      "image/png",
      "text/html",
      "text/plain",
      "application/x-lexical-editor",
    ]);
    expect(Object.keys(candidates[1])).toEqual([
      "text/html",
      "text/plain",
      "application/x-lexical-editor",
    ]);
    expect(Object.keys(candidates[2])).toEqual(["text/html", "text/plain"]);
  });
});
