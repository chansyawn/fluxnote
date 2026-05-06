import type { Transformer } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import { registerListKeyboardCommands } from "./list-commands";

interface ListKeyboardPluginProps {
  markdownShortcuts: ReadonlyArray<Transformer>;
}

export function ListKeyboardPlugin({ markdownShortcuts }: ListKeyboardPluginProps): null {
  const [editor] = useLexicalComposerContext();

  /*
   * List items are semantic block containers in this editor. The plugin receives
   * the same Markdown shortcut transformer set as the root editor so list item
   * children can reuse the normal block shortcut pipeline instead of maintaining
   * a second list-specific Markdown parser.
   */
  useEffect(
    () => registerListKeyboardCommands(editor, markdownShortcuts),
    [editor, markdownShortcuts],
  );

  return null;
}
