import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { forwardRef, useImperativeHandle } from "react";

import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "@/features/note-editor-core/markdown/note-editor-markdown";
import { NoteEditorPlaceholder } from "@/features/note-editor-core/rich-text/note-editor-placeholder";
import { noteEditorLexicalTheme } from "@/features/note-editor-core/theme/note-editor-lexical-theme";

import { NOTE_EDITOR_NODES } from "./note-editor-nodes";
import { NoteEditorPlugins } from "./note-editor-plugins";

import "../theme/note-editor.css";

export interface NoteEditorShellHandle {
  copyContent: () => Promise<void>;
}

interface NoteEditorShellProps {
  blockId: string;
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  editable?: boolean;
  focusRequestKey?: number;
}

function NoteEditorShellContent(
  {
    blockId,
    onBlur,
    onMarkdownUpdated,
    autoFocus = false,
    focusRequestKey = 0,
  }: Pick<
    NoteEditorShellProps,
    "blockId" | "onBlur" | "onMarkdownUpdated" | "autoFocus" | "focusRequestKey"
  >,
  ref: React.Ref<NoteEditorShellHandle>,
) {
  const [editor] = useLexicalComposerContext();

  useImperativeHandle(ref, () => ({
    copyContent: async () => {
      try {
        const markdown = editor.read(() => {
          return $convertToMarkdownString(NOTE_EDITOR_MARKDOWN_TRANSFORMERS);
        });

        await navigator.clipboard.writeText(markdown);
      } catch (error) {
        console.error("Failed to copy content:", error);
        throw error;
      }
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
      <NoteEditorPlugins
        autoFocus={autoFocus}
        blockId={blockId}
        focusRequestKey={focusRequestKey}
        onMarkdownUpdated={onMarkdownUpdated}
      />
    </div>
  );
}

const NoteEditorShellContentWithRef = forwardRef(NoteEditorShellContent);

export const NoteEditorShell = forwardRef<NoteEditorShellHandle, NoteEditorShellProps>(
  function NoteEditorShell(
    {
      blockId,
      initialMarkdown,
      editable = true,
      onBlur,
      onMarkdownUpdated,
      autoFocus = false,
      focusRequestKey = 0,
    },
    ref,
  ) {
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
        <NoteEditorShellContentWithRef
          blockId={blockId}
          onBlur={onBlur}
          onMarkdownUpdated={onMarkdownUpdated}
          autoFocus={autoFocus}
          focusRequestKey={focusRequestKey}
          ref={ref}
        />
      </LexicalComposer>
    );
  },
);
