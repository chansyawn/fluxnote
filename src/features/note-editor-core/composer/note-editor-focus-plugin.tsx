import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

interface NoteEditorFocusPluginProps {
  focusRequestKey: number;
}

export function NoteEditorFocusPlugin({ focusRequestKey }: NoteEditorFocusPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (focusRequestKey === 0) {
      return;
    }

    editor.focus();
  }, [editor, focusRequestKey]);

  return null;
}
