import { $convertToMarkdownString } from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { BlockEditorClipboardPlugin } from "@renderer/features/block-editor/clipboard/block-editor-clipboard-plugin";
import { BlockEditorCodeHighlightPlugin } from "@renderer/features/block-editor/code-block/block-editor-code-highlight-plugin";
import { BlockEditorCodeLanguagePlugin } from "@renderer/features/block-editor/code-block/block-editor-code-language-plugin";
import { BlockEditorImageNavigationPlugin } from "@renderer/features/block-editor/image/block-editor-image-navigation-plugin";
import { BlockEditorImagePlugin } from "@renderer/features/block-editor/image/block-editor-image-plugin";
import { BlockEditorListRegistrationPlugin } from "@renderer/features/block-editor/list/block-editor-list-registration-plugin";
import { BlockEditorListTabPlugin } from "@renderer/features/block-editor/list/block-editor-list-tab-plugin";
import { BLOCK_EDITOR_MARKDOWN_TRANSFORMERS } from "@renderer/features/block-editor/markdown/block-editor-markdown";
import { BlockEditorSelectionOverlayPlugin } from "@renderer/features/block-editor/selection/block-editor-selection-overlay-plugin";
import { BlockEditorTableShortcutPlugin } from "@renderer/features/block-editor/table/block-editor-table-shortcut-plugin";

interface BlockEditorPluginsProps {
  onMarkdownUpdated: (markdown: string) => void;
}

export function BlockEditorPlugins({ onMarkdownUpdated }: BlockEditorPluginsProps) {
  return (
    <>
      <BlockEditorClipboardPlugin />
      <BlockEditorImagePlugin />
      <BlockEditorImageNavigationPlugin />
      <BlockEditorSelectionOverlayPlugin />
      <ListPlugin />
      <CheckListPlugin disableTakeFocusOnClick />
      <BlockEditorListRegistrationPlugin />
      <BlockEditorListTabPlugin />
      <LinkPlugin />
      <TablePlugin hasCellBackgroundColor={false} hasCellMerge={false} />
      <BlockEditorTableShortcutPlugin />
      <BlockEditorCodeHighlightPlugin />
      <BlockEditorCodeLanguagePlugin />
      <MarkdownShortcutPlugin transformers={BLOCK_EDITOR_MARKDOWN_TRANSFORMERS} />
      <OnChangePlugin
        ignoreHistoryMergeTagChange
        ignoreSelectionChange
        onChange={(editorState) => {
          editorState.read(() => {
            onMarkdownUpdated($convertToMarkdownString(BLOCK_EDITOR_MARKDOWN_TRANSFORMERS));
          });
        }}
      />
    </>
  );
}
