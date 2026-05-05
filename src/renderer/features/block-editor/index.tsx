import "./index.css";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { LexicalEditor } from "lexical";
import { useMemo, useRef } from "react";

import { BlockEditorContent } from "./block-editor-content";
import { importMarkdownToEditor } from "./core/editor-state";
import { blockEditorNodes, blockEditorTheme } from "./core/runtime";

export interface BlockEditorHandle {
  copy: () => Promise<void>;
  focus: () => void;
}

interface BlockEditorProps {
  ref?: React.Ref<BlockEditorHandle>;
  blockId: string;
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
}

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
      namespace: `BlockEditor:${blockId}`,
      nodes: [...blockEditorNodes],
      onError(error: Error) {
        throw error;
      },
      theme: blockEditorTheme,
    }),
    [blockId],
  );

  return (
    <div className="block-editor">
      <LexicalComposer initialConfig={initialConfig}>
        <BlockEditorContent
          ref={ref}
          initialMarkdown={initialMarkdown}
          onBlur={onBlur}
          onMarkdownUpdated={onMarkdownUpdated}
        />
      </LexicalComposer>
    </div>
  );
}
