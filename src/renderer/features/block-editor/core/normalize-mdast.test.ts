import { describe, expect, it } from "vitest";

import { h, doc, p, t, tbl, td, tr } from "../test-helper/mdast-builders";
import { normalizeMdast } from "./normalize-mdast";

describe("normalizeMdast", () => {
  it("clamps heading depth to [1, 6]", () => {
    const result = normalizeMdast(doc(h(0, t("zero"))));
    const heading = result.children[0];
    expect(heading.type).toBe("heading");
    if (heading.type === "heading") {
      expect(heading.depth).toBe(1);
    }

    const overflow = normalizeMdast(doc(h(7, t("seven"))));
    const heading2 = overflow.children[0];
    if (heading2.type === "heading") {
      expect(heading2.depth).toBe(6);
    }
  });

  it("merges adjacent text nodes", () => {
    const result = normalizeMdast(doc(p(t("a"), t("b"), t("c"))));
    const para = result.children[0];
    if (para.type === "paragraph") {
      expect(para.children).toHaveLength(1);
      expect((para.children[0] as { value: string }).value).toBe("abc");
    }
  });

  it("removes empty inline nodes", () => {
    const result = normalizeMdast(doc(p(t(""), t("hello"), t(""))));
    const para = result.children[0];
    if (para.type === "paragraph") {
      expect(para.children).toHaveLength(1);
      expect((para.children[0] as { value: string }).value).toBe("hello");
    }
  });

  it("pads short table rows to match column count", () => {
    const table = tbl([null, null, null], tr(td(t("a")), td(t("b")), td(t("c"))), tr(td(t("d"))));
    const result = normalizeMdast(doc(table));
    const t0 = result.children[0];
    expect(t0.type).toBe("table");
    if (t0.type === "table") {
      expect(t0.children[1].children).toHaveLength(3);
    }
  });

  it("returns at least one empty paragraph for empty document", () => {
    const result = normalizeMdast({ children: [], type: "root" });
    expect(result.children).toHaveLength(1);
    expect(result.children[0].type).toBe("paragraph");
  });
});
