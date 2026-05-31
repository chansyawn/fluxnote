/**
 * Milkdown-based Markdown block editor feature.
 *
 * The editor is a WYSIWYG Markdown surface backed by semantic document data,
 * not a source-format-preserving Markdown editor.
 */

export { BlockEditor } from "./core/block-editor";
export { normalizeExternalMarkdown } from "./markdown/external-markdown";
export { BlockEditorToolbar } from "./toolbar";
export type {
  BlockEditorCodeBlockConfig,
  BlockEditorConfig,
  BlockEditorConfigInput,
  BlockEditorClipboardWriteData,
  BlockEditorHandle,
  BlockEditorMarkdownConfig,
  BlockEditorProps,
  BlockEditorRuntime,
  BlockEditorShortcutAction,
  BlockEditorShortcuts,
  BlockEditorShortcutsInput,
  BlockEditorToolbarState,
} from "./core/types";
export type {
  BlockEditorShortcutBinding,
  BlockEditorTextFormat,
  BlockEditorTextFormatState,
  BlockEditorToolbarController,
  BlockEditorToolbarStateListener,
} from "./toolbar";
