import { $convertFromMarkdownString } from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLingui } from "@lingui/react";
import { copyEditorContentToClipboard } from "@renderer/features/block-editor/clipboard/block-editor-clipboard-utils";
import { BLOCK_EDITOR_MARKDOWN_TRANSFORMERS } from "@renderer/features/block-editor/markdown/block-editor-markdown";
import { BlockEditorPlaceholder } from "@renderer/features/block-editor/rich-text/block-editor-placeholder";
import { blockEditorLexicalTheme } from "@renderer/features/block-editor/theme/block-editor-lexical-theme";
import { useImperativeHandle } from "react";

import { BlockEditorContext } from "./block-editor-context";
import { BLOCK_EDITOR_NODES } from "./block-editor-nodes";
import { BlockEditorPlugins } from "./block-editor-plugins";

import "../theme/block-editor.css";

export interface BlockEditorShellHandle {
  copy: () => Promise<void>;
  focus: () => void;
}

interface BlockEditorShellProps {
  blockId: string;
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
  editable?: boolean;
  ref?: React.Ref<BlockEditorShellHandle>;
}

function BlockEditorShellContent({
  onBlur,
  onMarkdownUpdated,
  ref,
}: {
  onBlur?: () => void;
  onMarkdownUpdated: (markdown: string) => void;
  ref?: React.Ref<BlockEditorShellHandle>;
}) {
  const { i18n } = useLingui();
  const placeholderText = i18n._({
    id: "home-note.block.placeholder",
    message: "Write something...",
  });
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
    <div className="block-editor relative isolate">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            aria-placeholder={placeholderText}
            className="text-foreground relative z-20 min-h-16 resize-none text-sm outline-none"
            data-block-editor-input
            onBlur={onBlur}
            placeholder={<BlockEditorPlaceholder />}
          />
        }
        placeholder={<BlockEditorPlaceholder />}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <BlockEditorPlugins onMarkdownUpdated={onMarkdownUpdated} />
    </div>
  );
}

export function BlockEditorShell({
  blockId,
  initialMarkdown,
  editable = true,
  onBlur,
  onMarkdownUpdated,
  ref,
}: BlockEditorShellProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: `block-editor-${blockId}`,
        theme: blockEditorLexicalTheme,
        editable,
        nodes: BLOCK_EDITOR_NODES,
        editorState: () => {
          $convertFromMarkdownString(initialMarkdown, BLOCK_EDITOR_MARKDOWN_TRANSFORMERS);
        },
        onError: (error) => {
          throw error;
        },
      }}
    >
      <BlockEditorContext.Provider value={blockId}>
        <BlockEditorShellContent onBlur={onBlur} onMarkdownUpdated={onMarkdownUpdated} ref={ref} />
      </BlockEditorContext.Provider>
    </LexicalComposer>
  );
}
