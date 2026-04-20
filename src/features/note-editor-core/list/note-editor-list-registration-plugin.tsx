import { registerList } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

export function NoteEditorListRegistrationPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerList(editor, { restoreNumbering: true });
  }, [editor]);

  return null;
}
