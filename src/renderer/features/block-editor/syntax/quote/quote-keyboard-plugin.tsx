import type { Transformer } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import { registerQuoteKeyboardCommands } from "./quote-commands";

interface QuoteKeyboardPluginProps {
  markdownShortcuts: ReadonlyArray<Transformer>;
}

export function QuoteKeyboardPlugin({ markdownShortcuts }: QuoteKeyboardPluginProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () => registerQuoteKeyboardCommands(editor, markdownShortcuts),
    [editor, markdownShortcuts],
  );

  return null;
}
