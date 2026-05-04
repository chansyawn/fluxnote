import { $createParagraphNode } from "lexical";
import { $getRoot, type LexicalEditor, type LexicalNode, type TextFormatType } from "lexical";
import type { Parent, Root } from "mdast";

import { stringifyMdastToMarkdown } from "./markdown-processor";
import { getRawMarkdownFromSource } from "./raw-markdown";
import type { ImportContext, MdastNode } from "./syntax-module";
import { mdastImporters } from "./syntax-registry";

function createImportContext(sourceMarkdown: string): ImportContext {
  const ctx: ImportContext = {
    sourceMarkdown,
    getRawMarkdown: (node) => {
      const raw = getRawMarkdownFromSource(sourceMarkdown, node);
      if (raw !== null) {
        return raw;
      }

      return stringifyMdastToMarkdown({
        children: [node as Root["children"][number]],
        type: "root",
      }).trimEnd();
    },
    importChildren: (node, formats = []) => importChildren(node, ctx, formats),
    importNode: (node, formats = []) => importNode(node, ctx, formats),
    importPhrasing: (children, formats = []) =>
      children.flatMap((child) => importNode(child, ctx, formats)),
  };

  return ctx;
}

function importChildren(
  node: Parent,
  ctx: ImportContext,
  formats: ReadonlyArray<TextFormatType>,
): LexicalNode[] {
  return node.children.flatMap((child) => importNode(child as MdastNode, ctx, formats));
}

function importNode(
  node: MdastNode,
  ctx: ImportContext,
  formats: ReadonlyArray<TextFormatType>,
): LexicalNode[] {
  const importer = mdastImporters.get(node.type);
  if (!importer) {
    return mdastImporters.get("unknown")?.(node, ctx, formats) ?? [];
  }

  return importer(node, ctx, formats);
}

export function importMdastToLexical(
  root: Root,
  editor: LexicalEditor,
  sourceMarkdown: string,
): void {
  const ctx = createImportContext(sourceMarkdown);

  editor.update(
    () => {
      const lexicalRoot = $getRoot();
      lexicalRoot.clear();

      const children = root.children.flatMap((child) => ctx.importNode(child));
      if (children.length === 0) {
        lexicalRoot.append($createParagraphNode());
        return;
      }

      lexicalRoot.append(...children);
    },
    { discrete: true },
  );
}
