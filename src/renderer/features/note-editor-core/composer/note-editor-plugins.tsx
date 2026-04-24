import { $convertToMarkdownString } from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { NoteEditorClipboardPlugin } from "@renderer/features/note-editor-core/clipboard/note-editor-clipboard-plugin";
import { NoteEditorCodeHighlightPlugin } from "@renderer/features/note-editor-core/code-block/note-editor-code-highlight-plugin";
import { NoteEditorCodeLanguagePlugin } from "@renderer/features/note-editor-core/code-block/note-editor-code-language-plugin";
import { NoteEditorImageNavigationPlugin } from "@renderer/features/note-editor-core/image/note-editor-image-navigation-plugin";
import { NoteEditorImagePlugin } from "@renderer/features/note-editor-core/image/note-editor-image-plugin";
import { NoteEditorListRegistrationPlugin } from "@renderer/features/note-editor-core/list/note-editor-list-registration-plugin";
import { NoteEditorListTabPlugin } from "@renderer/features/note-editor-core/list/note-editor-list-tab-plugin";
import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "@renderer/features/note-editor-core/markdown/note-editor-markdown";
import { NoteEditorSelectionOverlayPlugin } from "@renderer/features/note-editor-core/selection/note-editor-selection-overlay-plugin";
import { NoteEditorTableShortcutPlugin } from "@renderer/features/note-editor-core/table/note-editor-table-shortcut-plugin";

interface NoteEditorPluginsProps {
  onMarkdownUpdated: (markdown: string) => void;
}

export function NoteEditorPlugins({ onMarkdownUpdated }: NoteEditorPluginsProps) {
  return (
    <>
      <NoteEditorClipboardPlugin />
      <NoteEditorImagePlugin />
      <NoteEditorImageNavigationPlugin />
      <NoteEditorSelectionOverlayPlugin />
      <ListPlugin />
      <CheckListPlugin disableTakeFocusOnClick />
      <NoteEditorListRegistrationPlugin />
      <NoteEditorListTabPlugin />
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
