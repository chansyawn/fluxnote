/**
 * Lexical-based Markdown block editor feature.
 *
 * The editor is a WYSIWYG Markdown surface backed by semantic document data,
 * not a source-format-preserving Markdown editor.
 */
import "./index.css";

export { BlockEditor } from "./core/block-editor";
export type { BlockEditorHandle, BlockEditorProps } from "./core/types";
