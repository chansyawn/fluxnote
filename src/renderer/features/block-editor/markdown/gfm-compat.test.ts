import { describe, expect, it } from "vite-plus/test";

import { escapeIsolatedGfmTaskMarkers } from "./gfm-compat";

describe("gfm compat", () => {
  it("escapes only isolated task markers that can trigger gfm parser assertions", () => {
    const markdown = [
      "[ ] paragraph marker",
      "  [x] indented paragraph marker",
      "   [X] deeply indented paragraph marker",
      "    [ ] code marker",
      "- [ ] task",
      "- [x] done",
      "  - [ ] nested task",
    ].join("\n");

    expect(escapeIsolatedGfmTaskMarkers(markdown)).toBe(
      [
        "\\[ ] paragraph marker",
        "  \\[x] indented paragraph marker",
        "   \\[X] deeply indented paragraph marker",
        "    [ ] code marker",
        "- [ ] task",
        "- [x] done",
        "  - [ ] nested task",
      ].join("\n"),
    );
  });
});
