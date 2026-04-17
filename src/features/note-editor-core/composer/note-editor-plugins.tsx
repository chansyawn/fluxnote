import { $convertToMarkdownString } from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

import { NoteEditorClipboardPlugin } from "@/features/note-editor-core/clipboard/note-editor-clipboard-plugin";
import { NoteEditorCodeHighlightPlugin } from "@/features/note-editor-core/code-block/note-editor-code-highlight-plugin";
import { NoteEditorCodeLanguagePlugin } from "@/features/note-editor-core/code-block/note-editor-code-language-plugin";
import { NoteEditorImagePlugin } from "@/features/note-editor-core/image/note-editor-image-plugin";
import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "@/features/note-editor-core/markdown/note-editor-markdown";
import { NoteEditorSelectionOverlayPlugin } from "@/features/note-editor-core/selection/note-editor-selection-overlay-plugin";
import { NoteEditorTableShortcutPlugin } from "@/features/note-editor-core/table/note-editor-table-shortcut-plugin";

interface NoteEditorPluginsProps {
  onMarkdownUpdated: (markdown: string) => void;
}

export function NoteEditorPlugins({ onMarkdownUpdated }: NoteEditorPluginsProps) {
  return (
    <>
      <NoteEditorClipboardPlugin />
      <NoteEditorImagePlugin />
      <NoteEditorSelectionOverlayPlugin />
      <ListPlugin />
      <CheckListPlugin disableTakeFocusOnClick />
      <LinkPlugin />
      <TablePlugin hasCellBackgroundColor={false} hasCellMerge={false} />
      <NoteEditorTableShortcutPlugin />
      <NoteEditorCodeHighlightPlugin />
      <NoteEditorCodeLanguagePlugin />
      <MarkdownShortcutPlugin transformers={NOTE_EDITOR_MARKDOWN_TRANSFORMERS} />
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
