import { registerMarkdownShortcuts, type Transformer } from "@lexical/markdown";
import { defineExtension, type LexicalEditor } from "lexical";

export type MarkdownShortcutTransformerPatch = (
  transformers: ReadonlyArray<Transformer>,
) => Transformer[];

export interface MarkdownShortcutExtensionConfig {
  transformers: ReadonlyArray<Transformer>;
  transformerPatches: ReadonlyArray<MarkdownShortcutTransformerPatch>;
}

export const MarkdownShortcutExtension = defineExtension({
  name: "fluxnotes/block-editor/markdown-shortcuts",
  config: {
    transformers: [] as Transformer[],
    transformerPatches: [] as MarkdownShortcutTransformerPatch[],
  } satisfies MarkdownShortcutExtensionConfig,
  mergeConfig(config, overrides) {
    return {
      transformers: [...config.transformers, ...(overrides.transformers ?? [])],
      transformerPatches: [...config.transformerPatches, ...(overrides.transformerPatches ?? [])],
    };
  },
  register(editor: LexicalEditor, config) {
    const transformers = config.transformerPatches.reduce(
      (currentTransformers, patchTransformers) => patchTransformers(currentTransformers),
      Array.from(config.transformers),
    );

    return registerMarkdownShortcuts(editor, transformers);
  },
});
