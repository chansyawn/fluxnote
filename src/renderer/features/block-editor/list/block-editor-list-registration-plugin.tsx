import { registerList } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

export function BlockEditorListRegistrationPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerList(editor, { restoreNumbering: true });
  }, [editor]);

  return null;
}
