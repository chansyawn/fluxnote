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

import { exportEditorStateToMarkdown } from "./core/editor-state";
import { blockEditorPlugins } from "./core/runtime";
import { markdownShortcutTransformers } from "./core/shortcuts";
import type { BlockEditorHandle } from "./index";

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
  const latestMarkdownRef = useRef(initialMarkdown);

  const handleMarkdownUpdated = useEffectEvent(onMarkdownUpdated);

  useImperativeHandle(ref, () => ({
    copy: async () => {},
    focus: () => {},
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
      {blockEditorPlugins}
      <MarkdownShortcutPlugin transformers={markdownShortcutTransformers} />
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
