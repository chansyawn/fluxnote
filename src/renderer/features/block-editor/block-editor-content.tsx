import { copyToClipboard } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { EditorState } from "lexical";
import { useEffectEvent, useImperativeHandle, useRef, type Ref } from "react";

import { createClipboardDataFromDocument } from "./clipboard/clipboard-data";
import { ClipboardPlugin } from "./clipboard/clipboard-plugin";
import { exportEditorStateToMarkdown } from "./editor-state";
import { MARKDOWN_SHORTCUT_TRANSFORMERS, SYNTAX_RUNTIME_PLUGINS } from "./syntax/registry";
import type { BlockEditorHandle } from "./types";

interface BlockEditorContentProps {
  initialMarkdown: string;
  onBlur?: () => void;
  onMarkdownUpdated: (markdown: string) => void;
  ref?: Ref<BlockEditorHandle>;
}

function Placeholder() {
  return (
    <div className="block-editor__placeholder">
      <Trans id="block-editor.placeholder">Write a note...</Trans>
    </div>
  );
}

function exportMarkdownFromState(editorState: EditorState): string {
  return exportEditorStateToMarkdown(editorState);
}

export function BlockEditorContent({
  initialMarkdown,
  onBlur,
  onMarkdownUpdated,
  ref,
}: BlockEditorContentProps) {
  const { i18n } = useLingui();
  const [editor] = useLexicalComposerContext();
  const latestMarkdownRef = useRef(initialMarkdown);

  const handleMarkdownUpdated = useEffectEvent(onMarkdownUpdated);

  useImperativeHandle(ref, () => ({
    copy: async () => {
      const data = createClipboardDataFromDocument(editor);
      if (data === null) {
        return;
      }

      await copyToClipboard(editor, null, data);
    },
    focus: () => {
      editor.focus();
    },
  }));

  return (
    <div className="block-editor__shell">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            aria-label={i18n._({
              id: "block-editor.content.label",
              message: "Markdown block editor",
            })}
            className="block-editor__content"
            onBlur={onBlur}
            spellCheck
          />
        }
        placeholder={<Placeholder />}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      {SYNTAX_RUNTIME_PLUGINS}
      <ClipboardPlugin />
      <MarkdownShortcutPlugin transformers={MARKDOWN_SHORTCUT_TRANSFORMERS} />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) => {
          const markdown = exportMarkdownFromState(editorState);
          if (markdown === latestMarkdownRef.current) {
            return;
          }

          latestMarkdownRef.current = markdown;
          handleMarkdownUpdated(markdown);
        }}
      />
    </div>
  );
}
