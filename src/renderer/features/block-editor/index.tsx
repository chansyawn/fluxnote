/**
 * Lexical-based Markdown block editor feature.
 *
 * The editor is a WYSIWYG Markdown surface backed by semantic document data,
 * not a source-format-preserving Markdown editor.
 */

export { BlockEditor } from "./core/block-editor";
export { normalizeExternalMarkdown } from "./markdown/external-markdown";
export { BlockEditorToolbar } from "./toolbar";
export {
  BLOCK_EDITOR_ACTION_DEFINITIONS,
  BLOCK_EDITOR_ACTION_IDS,
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  isBlockEditorActionId,
  type BlockEditorActionController,
  type BlockEditorActionDefinition,
  type BlockEditorActionId,
  type BlockEditorActionResult,
  type BlockEditorActionState,
  type BlockEditorActionStateListener,
  type BlockEditorShortcutConfig,
} from "./actions";
export type {
  BlockEditorCodeBlockConfig,
  BlockEditorConfig,
  BlockEditorConfigInput,
  BlockEditorClipboardWriteData,
  BlockEditorHandle,
  BlockEditorMarkdownConfig,
  BlockEditorProps,
  BlockEditorRuntime,
  BlockEditorActionState as BlockEditorSelectionActionState,
} from "./core/types";
export type {
  BlockEditorBlockFormat,
  BlockEditorFormat,
  BlockEditorInlineFormat,
  BlockEditorInlineFormatState,
} from "./toolbar";
