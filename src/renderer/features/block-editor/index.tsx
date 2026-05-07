import "./index.css";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { LexicalEditor } from "lexical";
import { useMemo, useRef } from "react";

import { BlockEditorContent } from "./block-editor-content";
import { BLOCK_EDITOR_CLIPBOARD_NAMESPACE } from "./clipboard/clipboard-data";
import { importMarkdownToEditor } from "./editor-state";
import { SYNTAX_NODES, SYNTAX_THEME } from "./syntax/registry";
import type { BlockEditorProps } from "./types";
export type { BlockEditorHandle, BlockEditorProps } from "./types";

export function BlockEditor({
  ref,
  blockId,
  initialMarkdown,
  onBlur,
  onMarkdownUpdated,
}: BlockEditorProps) {
  // initialMarkdown is initial-only; prop changes do not re-import editor state.
  const initialMarkdownRef = useRef(initialMarkdown);

  const initialConfig = useMemo(
    () => ({
      editorState: (editor: LexicalEditor) => {
        importMarkdownToEditor(editor, initialMarkdownRef.current);
      },
      namespace: BLOCK_EDITOR_CLIPBOARD_NAMESPACE,
      nodes: [...SYNTAX_NODES],
      onError(error: Error) {
        throw error;
      },
      theme: SYNTAX_THEME,
    }),
    [],
  );

  return (
    <div className="block-editor">
      <LexicalComposer initialConfig={initialConfig}>
        <BlockEditorContent
          ref={ref}
          blockId={blockId}
          initialMarkdown={initialMarkdown}
          onBlur={onBlur}
          onMarkdownUpdated={onMarkdownUpdated}
        />
      </LexicalComposer>
    </div>
  );
}
