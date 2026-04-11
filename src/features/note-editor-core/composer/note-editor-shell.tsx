import { $convertFromMarkdownString } from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "@/features/note-editor-core/markdown/note-editor-markdown";
import { NoteEditorPlaceholder } from "@/features/note-editor-core/rich-text/note-editor-placeholder";
import { noteEditorLexicalTheme } from "@/features/note-editor-core/theme/note-editor-lexical-theme";

import { NOTE_EDITOR_NODES } from "./note-editor-nodes";
import { NoteEditorPlugins } from "./note-editor-plugins";

import "../theme/note-editor.css";

interface NoteEditorShellProps {
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  editable?: boolean;
  focusRequestKey?: number;
}

export function NoteEditorShell({
  initialMarkdown,
  onBlur,
  onMarkdownUpdated,
  autoFocus = false,
  editable = true,
  focusRequestKey = 0,
}: NoteEditorShellProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: "note-block-editor",
        theme: noteEditorLexicalTheme,
        editable,
        nodes: NOTE_EDITOR_NODES,
        editorState: () => {
          $convertFromMarkdownString(initialMarkdown, NOTE_EDITOR_MARKDOWN_TRANSFORMERS);
        },
        onError: (error) => {
          throw error;
        },
      }}
    >
      <div className="note-block-editor">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-placeholder="Write something..."
              className="note-block-editor__input"
              onBlur={() => {
                onBlur?.();
              }}
              placeholder={<NoteEditorPlaceholder />}
            />
          }
          placeholder={<NoteEditorPlaceholder />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <NoteEditorPlugins
          autoFocus={autoFocus}
          focusRequestKey={focusRequestKey}
          onMarkdownUpdated={onMarkdownUpdated}
        />
      </div>
    </LexicalComposer>
  );
}
