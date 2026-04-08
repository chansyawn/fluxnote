import { CodeNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/extension";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { Trans } from "@lingui/react/macro";

import { noteBlockLexicalTheme } from "@/features/note-block/note-block-lexical-theme";
import { NOTE_BLOCK_MARKDOWN_TRANSFORMERS } from "@/features/note-block/note-block-markdown";
import { NoteBlockTableShortcutPlugin } from "@/features/note-block/note-block-table-shortcut-plugin";

import "./note-block-editor.css";

interface NoteBlockCoreEditorProps {
  initialMarkdown: string;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

function NoteBlockPlaceholder() {
  return (
    <div className="note-block-editor__placeholder">
      <Trans id="home-note.block.placeholder">Write something...</Trans>
    </div>
  );
}

export function NoteBlockCoreEditor({
  initialMarkdown,
  onBlur,
  onMarkdownUpdated,
  autoFocus = false,
}: NoteBlockCoreEditorProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: "note-block-editor",
        theme: noteBlockLexicalTheme,
        nodes: [
          HeadingNode,
          QuoteNode,
          ListNode,
          ListItemNode,
          LinkNode,
          CodeNode,
          HorizontalRuleNode,
          TableNode,
          TableRowNode,
          TableCellNode,
        ],
        editorState: () => {
          $convertFromMarkdownString(initialMarkdown, NOTE_BLOCK_MARKDOWN_TRANSFORMERS);
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
              placeholder={<NoteBlockPlaceholder />}
            />
          }
          placeholder={<NoteBlockPlaceholder />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <TablePlugin hasCellBackgroundColor={false} hasCellMerge={false} />
        <NoteBlockTableShortcutPlugin />
        <MarkdownShortcutPlugin transformers={NOTE_BLOCK_MARKDOWN_TRANSFORMERS} />
        {autoFocus ? <AutoFocusPlugin /> : null}
        <OnChangePlugin
          ignoreHistoryMergeTagChange
          ignoreSelectionChange
          onChange={(editorState) => {
            editorState.read(() => {
              onMarkdownUpdated($convertToMarkdownString(NOTE_BLOCK_MARKDOWN_TRANSFORMERS));
            });
          }}
        />
      </div>
    </LexicalComposer>
  );
}
