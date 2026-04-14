import { $getClipboardDataFromSelection } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, COMMAND_PRIORITY_HIGH, COPY_COMMAND } from "lexical";
import { useEffect } from "react";

import { $getMarkdownFromCurrentState } from "./note-editor-clipboard-utils";

export function NoteEditorClipboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<ClipboardEvent | null>(
      COPY_COMMAND,
      (event) => {
        const clipboardData = event?.clipboardData;
        if (!clipboardData) {
          return false;
        }

        event.preventDefault();

        editor.read(() => {
          const selection = $getSelection();

          // 先让 Lexical 填充 text/html 和 application/x-lexical-editor
          const lexicalData = $getClipboardDataFromSelection(selection);
          if (lexicalData?.["text/html"]) {
            clipboardData.setData("text/html", lexicalData["text/html"]);
          }
          if (lexicalData?.["application/x-lexical-editor"]) {
            clipboardData.setData(
              "application/x-lexical-editor",
              lexicalData["application/x-lexical-editor"],
            );
          }

          // 覆盖 text/plain 为 Markdown
          clipboardData.setData("text/plain", $getMarkdownFromCurrentState(editor));
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
