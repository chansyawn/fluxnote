import "./index.css";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { LexicalEditor } from "lexical";
import { useMemo } from "react";

import { BlockEditorContent } from "./block-editor-content";
import { importMarkdownToEditor } from "./core/editor-state";
import { blockEditorTheme, lexicalNodes } from "./core/syntax-registry";

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
  const initialConfig = useMemo(
    () => ({
      editorState: (editor: LexicalEditor) => {
        importMarkdownToEditor(editor, initialMarkdown);
      },
      namespace: `BlockEditor:${blockId}`,
      nodes: [...lexicalNodes],
      onError(error: Error) {
        throw error;
      },
      theme: blockEditorTheme,
    }),
    [blockId, initialMarkdown],
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
