import { getExtensionDependencyFromEditor, LexicalBuilder } from "@lexical/extension";
import { $convertFromMarkdownString } from "@lexical/markdown";
import type { LexicalEditor } from "lexical";
import type { Root } from "mdast";
import { expect, vi } from "vite-plus/test";

import { createBlockEditorCoreExtension } from "../core/block-editor-core-extension";
import { exportLexicalToMdast, importMdastToLexical } from "../core/lexical-mdast";
import { exportEditorStateToMarkdown, importMarkdownToEditor } from "../core/markdown-editor-io";
import type {
  BlockEditorCreateAssetRequest,
  BlockEditorCopyAssetRequest,
  BlockEditorImportFileAssetsRequest,
  BlockEditorResolveAssetRequest,
  BlockEditorRuntime,
} from "../core/types";
import { MarkdownShortcutExtension } from "../markdown/markdown-shortcut-extension";

type BlockEditorRuntimeOverrides = {
  assets?: Partial<BlockEditorRuntime["assets"]>;
  clipboard?: Partial<BlockEditorRuntime["clipboard"]>;
  links?: Partial<BlockEditorRuntime["links"]>;
};

export function createHeadlessEditor(): LexicalEditor {
  return LexicalBuilder.fromExtensions([createBlockEditorCoreExtension()]).buildEditor();
}

export function editorFromMarkdown(markdown: string): LexicalEditor {
  const editor = createHeadlessEditor();
  importMarkdownToEditor(editor, markdown);
  return editor;
}

export function editorFromMdast(mdast: Root): LexicalEditor {
  const editor = createHeadlessEditor();
  importMdastToLexical(mdast, editor);
  return editor;
}

export function readMarkdown(editor: LexicalEditor): string {
  return exportEditorStateToMarkdown(editor.getEditorState());
}

export function expectEditorMarkdown(editor: LexicalEditor, markdown: string): void {
  expect(readMarkdown(editor).trim()).toBe(markdown.trim());
}

export function readMdast(editor: LexicalEditor): Root {
  return exportLexicalToMdast(editor.getEditorState());
}

export function createBlockEditorRuntime(
  overrides: BlockEditorRuntimeOverrides = {},
): BlockEditorRuntime {
  return {
    assets: {
      copy: vi.fn(async ({ assetUrls }: BlockEditorCopyAssetRequest) => ({
        assets: assetUrls.map((assetUrl) => ({
          assetUrl,
          sourceAssetUrl: assetUrl,
        })),
      })),
      create: vi.fn(async ({ assets }: BlockEditorCreateAssetRequest) => ({
        assets: assets.map((asset, index) => ({
          altText: asset.fileName ?? `image-${index + 1}`,
          assetUrl: `assets://created/${asset.fileName ?? `image-${index + 1}`}`,
        })),
      })),
      importFiles: vi.fn(async ({ files }: BlockEditorImportFileAssetsRequest) => ({
        assets: files.map((file, index) => ({
          altText: file.fileUrl.split("/").at(-1) ?? `image-${index + 1}`,
          assetUrl: `assets://imported/${file.fileUrl.split("/").at(-1) ?? `image-${index + 1}`}`,
          fileUrl: file.fileUrl,
        })),
      })),
      resolve: vi.fn(async ({ assetUrls }: BlockEditorResolveAssetRequest) => ({
        assets: assetUrls.map((assetUrl) => ({
          assetUrl,
          fileUrl: assetUrl,
        })),
      })),
      ...overrides.assets,
    },
    clipboard: {
      write: vi.fn(async () => undefined),
      writeText: vi.fn(async () => undefined),
      ...overrides.clipboard,
    },
    links: {
      openExternal: vi.fn(async () => undefined),
      ...overrides.links,
    },
  };
}

/**
 * Drive markdown through Lexical's shortcut transformer pipeline (the same
 * code path that runs when a user types `# ` or `- [ ]` in the live editor).
 * Returns the resulting mdast so tests can assert structure.
 */
export function applyMarkdownShortcuts(markdown: string): Root {
  const editor = createHeadlessEditor();
  const { transformers } = getExtensionDependencyFromEditor(
    editor,
    MarkdownShortcutExtension,
  ).config;

  editor.update(
    () => {
      $convertFromMarkdownString(markdown, [...transformers]);
    },
    { discrete: true },
  );
  return readMdast(editor);
}
