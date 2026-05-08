import { registerMarkdownShortcuts, type Transformer } from "@lexical/markdown";
import { defineExtension, type LexicalEditor } from "lexical";

export interface MarkdownShortcutExtensionConfig {
  transformers: ReadonlyArray<Transformer>;
}

export const MarkdownShortcutExtension = defineExtension({
  name: "fluxnotes/block-editor/markdown-shortcuts",
  config: {
    transformers: [] as Transformer[],
  } satisfies MarkdownShortcutExtensionConfig,
  mergeConfig(config, overrides) {
    return {
      transformers: [...config.transformers, ...(overrides.transformers ?? [])],
    };
  },
  register(editor: LexicalEditor, config) {
    return registerMarkdownShortcuts(editor, [...config.transformers]);
  },
});
