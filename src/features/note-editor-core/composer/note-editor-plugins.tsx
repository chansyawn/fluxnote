import { $convertToMarkdownString } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

import { NoteEditorClipboardPlugin } from "@/features/note-editor-core/clipboard/note-editor-clipboard-plugin";
import { NoteEditorCodeHighlightPlugin } from "@/features/note-editor-core/code-block/note-editor-code-highlight-plugin";
import { NoteEditorCodeLanguagePlugin } from "@/features/note-editor-core/code-block/note-editor-code-language-plugin";
import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "@/features/note-editor-core/markdown/note-editor-markdown";
import { NoteEditorSelectionOverlayPlugin } from "@/features/note-editor-core/selection/note-editor-selection-overlay-plugin";
import { NoteEditorTableShortcutPlugin } from "@/features/note-editor-core/table/note-editor-table-shortcut-plugin";

import { NoteEditorFocusPlugin } from "./note-editor-focus-plugin";

interface NoteEditorPluginsProps {
  autoFocus: boolean;
  focusRequestKey: number;
  onMarkdownUpdated: (markdown: string) => void;
}

export function NoteEditorPlugins({
  autoFocus,
  focusRequestKey,
  onMarkdownUpdated,
}: NoteEditorPluginsProps) {
  return (
    <>
      <NoteEditorClipboardPlugin />
      <NoteEditorSelectionOverlayPlugin />
      <ListPlugin />
      <CheckListPlugin disableTakeFocusOnClick />
      <LinkPlugin />
      <TablePlugin hasCellBackgroundColor={false} hasCellMerge={false} />
      <NoteEditorTableShortcutPlugin />
      <NoteEditorCodeHighlightPlugin />
      <NoteEditorCodeLanguagePlugin />
      <MarkdownShortcutPlugin transformers={NOTE_EDITOR_MARKDOWN_TRANSFORMERS} />
      {autoFocus ? <AutoFocusPlugin /> : null}
      <NoteEditorFocusPlugin focusRequestKey={focusRequestKey} />
      <OnChangePlugin
        ignoreHistoryMergeTagChange
        ignoreSelectionChange
        onChange={(editorState) => {
          editorState.read(() => {
            onMarkdownUpdated($convertToMarkdownString(NOTE_EDITOR_MARKDOWN_TRANSFORMERS));
          });
        }}
      />
    </>
  );
}
