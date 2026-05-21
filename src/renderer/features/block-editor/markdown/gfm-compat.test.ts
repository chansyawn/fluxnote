import { describe, expect, it } from "vite-plus/test";

import { escapeIsolatedGfmTaskMarkers } from "./gfm-compat";

describe("escapeIsolatedGfmTaskMarkers", () => {
  it("escapes paragraph-level task markers", () => {
    expect(escapeIsolatedGfmTaskMarkers("[ ] orphan")).toBe("\\[ ] orphan");
    expect(escapeIsolatedGfmTaskMarkers("[x] orphan")).toBe("\\[x] orphan");
  });

  it("preserves valid task markers under list items", () => {
    const input = "- [ ] task\n- [x] done";
    expect(escapeIsolatedGfmTaskMarkers(input)).toBe(input);
  });

  it("preserves indented code (4+ spaces)", () => {
    const input = "    [ ] still code";
    expect(escapeIsolatedGfmTaskMarkers(input)).toBe(input);
  });

  it("escapes 0-3 space indentation", () => {
    expect(escapeIsolatedGfmTaskMarkers("   [ ] indented")).toBe("   \\[ ] indented");
  });
});
