import { describe, expect, it } from "vite-plus/test";

import { createMarkdownSyntaxSnapshot } from "../../utils/headless-editor-test-utils";

describe("code syntax", () => {
  it("imports and exports fenced code blocks", () => {
    const { lexical, mdast } = createMarkdownSyntaxSnapshot("```ts\ntype Id = string;\n```");
    const code = lexical.root.children[0];

    expect(code).toMatchObject({
      language: "ts",
      type: "code",
    });
    expect(mdast.children[0]).toMatchObject({
      lang: "ts",
      type: "code",
      value: "type Id = string;",
    });
  });
});
