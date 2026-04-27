import { $convertFromMarkdownString } from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { copyEditorContentToClipboard } from "@renderer/features/note-editor-core/clipboard/note-editor-clipboard-utils";
import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "@renderer/features/note-editor-core/markdown/note-editor-markdown";
import { NoteEditorPlaceholder } from "@renderer/features/note-editor-core/rich-text/note-editor-placeholder";
import { noteEditorLexicalTheme } from "@renderer/features/note-editor-core/theme/note-editor-lexical-theme";
import { useImperativeHandle } from "react";

import { NoteEditorBlockContext } from "./note-editor-block-context";
import { NOTE_EDITOR_NODES } from "./note-editor-nodes";
import { NoteEditorPlugins } from "./note-editor-plugins";

import "../theme/note-editor.css";

export interface NoteEditorShellHandle {
  copy: () => Promise<void>;
  focus: () => void;
}

interface NoteEditorShellProps {
  blockId: string;
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
  editable?: boolean;
  ref?: React.Ref<NoteEditorShellHandle>;
}

function NoteEditorShellContent({
  onBlur,
  onMarkdownUpdated,
  ref,
}: {
  onBlur?: () => void;
  onMarkdownUpdated: (markdown: string) => void;
  ref?: React.Ref<NoteEditorShellHandle>;
}) {
  const [editor] = useLexicalComposerContext();

  useImperativeHandle(ref, () => ({
    copy: async () => {
      try {
        await copyEditorContentToClipboard(editor, "document");
      } catch (error) {
        console.error("Failed to copy content:", error);
        throw error;
      }
    },
    focus: () => {
      editor.focus();
    },
  }));

  return (
    <div className="note-block-editor relative isolate">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            aria-placeholder="Write something..."
            className="text-foreground relative z-20 min-h-16 resize-none text-sm outline-none"
            data-note-editor-input
            onBlur={onBlur}
            placeholder={<NoteEditorPlaceholder />}
          />
        }
        placeholder={<NoteEditorPlaceholder />}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <NoteEditorPlugins onMarkdownUpdated={onMarkdownUpdated} />
    </div>
  );
}

export function NoteEditorShell({
  blockId,
  initialMarkdown,
  editable = true,
  onBlur,
  onMarkdownUpdated,
  ref,
}: NoteEditorShellProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: `note-block-editor-${blockId}`,
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
      <NoteEditorBlockContext.Provider value={blockId}>
        <NoteEditorShellContent onBlur={onBlur} onMarkdownUpdated={onMarkdownUpdated} ref={ref} />
      </NoteEditorBlockContext.Provider>
    </LexicalComposer>
  );
}
