/**
 * Lexical-based Markdown block editor feature.
 *
 * The editor is a WYSIWYG Markdown surface backed by semantic document data,
 * not a source-format-preserving Markdown editor.
 */

export { BlockEditor } from "./core/block-editor";
export { normalizeExternalMarkdown } from "./markdown/external-markdown";
export { BLOCK_EDITOR_SHORTCUT_DEFAULTS } from "./actions";
export { BlockEditorToolbar } from "./toolbar";
export {
  BLOCK_EDITOR_ACTION_CATALOG,
  BLOCK_EDITOR_ACTION_DEFINITIONS,
  BLOCK_EDITOR_SHORTCUT_RESOLUTION_ORDER,
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  getBlockEditorActionDefinition,
  type BlockEditorActionCatalogItem,
  type BlockEditorActionController,
  type BlockEditorActionId,
  type BlockEditorActionResult,
  type BlockEditorActionState,
  type BlockEditorActionStateListener,
  type BlockEditorShortcutConfig,
} from "./actions";
export type {
  BlockEditorConfigInput,
  BlockEditorClipboardWriteData,
  BlockEditorHandle,
  BlockEditorPreviewDataRequest,
  BlockEditorPreviewKind,
  BlockEditorRuntime,
} from "./core/types";
