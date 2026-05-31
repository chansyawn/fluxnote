import type { Ctx, MilkdownPlugin } from "@milkdown/kit/ctx";
import { highlight, highlightPluginConfig } from "@milkdown/plugin-highlight";
import { createParser } from "@milkdown/plugin-highlight/shiki";
import { withLineNumbers } from "prosemirror-highlight";
import { createHighlighter } from "shiki";

import { getShikiLanguage, SHIKI_CODE_LANGUAGES } from "./code-language-options";

export type CodeHighlightThemeMode = "light" | "dark";

const SHIKI_THEMES = {
  dark: "vitesse-dark",
  light: "vitesse-light",
} as const satisfies Record<CodeHighlightThemeMode, string>;

let shikiHighlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getShikiHighlighter() {
  shikiHighlighterPromise ??= createHighlighter({
    langs: SHIKI_CODE_LANGUAGES,
    themes: Object.values(SHIKI_THEMES),
  });

  return shikiHighlighterPromise;
}

export interface CodeHighlightPluginInput {
  theme: CodeHighlightThemeMode;
}

export async function configureCodeHighlight(
  ctx: Ctx,
  { theme }: CodeHighlightPluginInput,
): Promise<void> {
  ctx.set(highlightPluginConfig.key, {
    languageExtractor: (node) => getShikiLanguage(node.attrs.language),
    parser: withLineNumbers(
      createParser(await getShikiHighlighter(), {
        theme: SHIKI_THEMES[theme],
      }),
    ),
  });
}

export const codeHighlightPlugins: MilkdownPlugin[] = [...highlight];
