import type { ClipboardSerializedNode } from "@shared/features/block-editor/clipboard";
import { describe, expect, it } from "vite-plus/test";

import { editorFromMdast } from "../test-helper/editor-driver";
import {
  bold,
  code,
  doc,
  h,
  hr,
  img,
  inlineCode,
  italic,
  link,
  ol,
  p,
  quote,
  strike,
  t,
  tbl,
  td,
  tr,
  ul,
  li,
} from "../test-helper/mdast-builders";
import {
  exportClipboardNodesToHtml,
  exportClipboardNodesToMarkdown,
  rewriteClipboardHtmlAssetUrls,
} from "./clipboard-formats";

function textNode(text: string): ClipboardSerializedNode {
  return {
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    text,
    type: "text",
    version: 1,
  };
}

function readClipboardNodesFromMarkdownFixture(): ClipboardSerializedNode[] {
  const editor = editorFromMdast(
    doc(
      h(3, t("Heading")),
      p(
        bold(t("bold")),
        t(" "),
        italic(t("italic")),
        t(" "),
        strike(t("strike")),
        t(" "),
        inlineCode("code"),
        t(" "),
        link("https://example.com", t("link")),
        t(" "),
        img("assets://block/photo.png", "Alt", "Caption"),
      ),
      ul(li([p(t("todo"))], { checked: false }), li([p(t("done"))], { checked: true })),
      ol(li([p(t("one"))]), li([p(t("two"))])),
      quote(p(t("quoted"))),
      code("const value = 1;", "ts"),
      tbl(["left", "center"], tr(td(t("Name")), td(t("Value"))), tr(td(t("alpha")), td(t("1")))),
      hr(),
    ),
  );
  let nodes: ClipboardSerializedNode[] = [];
  editor.getEditorState().read(() => {
    nodes = editor.getEditorState().toJSON().root.children as ClipboardSerializedNode[];
  });
  return nodes;
}

describe("clipboard formats", () => {
  it("exports inline clipboard nodes as markdown paragraphs", () => {
    const markdown = exportClipboardNodesToMarkdown([textNode("hello")]);

    expect(markdown.trim()).toBe("hello");
  });

  it("exports inline clipboard nodes as semantic html paragraphs", () => {
    const html = exportClipboardNodesToHtml([textNode("hello")]);

    expect(html).toBe("<p>hello</p>");
  });

  it("exports rich markdown structures to markdown and semantic html", () => {
    const nodes = readClipboardNodesFromMarkdownFixture();

    const markdown = exportClipboardNodesToMarkdown(nodes);
    const html = exportClipboardNodesToHtml(nodes);

    expect(markdown).toContain("### Heading");
    expect(markdown).toContain("**bold** *italic* ~~strike~~ `code`");
    expect(markdown).toContain("[link](https://example.com)");
    expect(markdown).toContain('![Alt](assets://block/photo.png "Caption")');
    expect(markdown).toContain("- [ ] todo");
    expect(markdown).toContain("- [x] done");
    expect(markdown).toContain("1. one");
    expect(markdown).toContain("> quoted");
    expect(markdown).toContain("```ts\nconst value = 1;\n```");
    expect(markdown).toContain("| Name  | Value |");
    expect(markdown).toContain("---");

    expect(html).toContain("<h3>Heading</h3>");
    expect(html).toContain(
      "<strong>bold</strong> <em>italic</em> <del>strike</del> <code>code</code>",
    );
    expect(html).toContain('<a href="https://example.com">link</a>');
    expect(html).toContain('<img src="assets://block/photo.png" alt="Alt" title="Caption">');
    expect(html).toContain('<ul class="contains-task-list">');
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).toContain('<input type="checkbox" checked disabled>');
    expect(html).toContain("<ol>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain('<pre><code class="language-ts">const value = 1;');
    expect(html).toContain('<th align="left">Name</th>');
    expect(html).toContain('<th align="center">Value</th>');
    expect(html).toContain("<hr>");
  });

  it("rewrites image src attributes without touching other html", () => {
    const html = [
      '<p><img src="assets://block/photo.png" alt="Photo"></p>',
      "<img src='assets://block/other.png'>",
      '<a href="assets://block/photo.png">asset link</a>',
    ].join("");

    const rewrittenHtml = rewriteClipboardHtmlAssetUrls(
      html,
      new Map([["assets://block/photo.png", "file:///tmp/photo.png"]]),
    );

    expect(rewrittenHtml).toContain('<img src="file:///tmp/photo.png" alt="Photo">');
    expect(rewrittenHtml).toContain("<img src='assets://block/other.png'>");
    expect(rewrittenHtml).toContain('<a href="assets://block/photo.png">asset link</a>');
  });
});
