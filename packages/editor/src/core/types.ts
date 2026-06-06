import type { Ref } from "react";

import type {
  BlockEditorActionController,
  BlockEditorActionState,
  BlockEditorShortcutConfig as BlockEditorActionShortcutConfig,
} from "../actions/types";
import type { BlockEditorRuntime } from "../runtime/types";

export type BlockEditorPreviewKind =
  | "html-document-export"
  | "html-selected-export"
  | "markdown-document-export"
  | "markdown-selected-export"
  | "markdown-source";

export interface BlockEditorPreviewDataRequest {
  kind: BlockEditorPreviewKind;
}

export type BlockEditorPreviewChangeListener = () => void;

export interface BlockEditorCodeBlockConfig {
  showLineNumbers: boolean;
}

export type BlockEditorResolvedTheme = "dark" | "light";

export interface BlockEditorMarkdownConfig {
  codeBlock: BlockEditorCodeBlockConfig;
}

export interface BlockEditorConfig {
  appearance: {
    resolvedTheme: BlockEditorResolvedTheme;
  };
  markdown: BlockEditorMarkdownConfig;
  shortcuts: BlockEditorShortcutsConfig;
}

export interface BlockEditorAppearanceConfigInput {
  resolvedTheme?: BlockEditorResolvedTheme;
}

export interface BlockEditorCodeBlockConfigInput {
  showLineNumbers?: boolean;
}

export interface BlockEditorMarkdownConfigInput {
  codeBlock?: BlockEditorCodeBlockConfigInput;
}

export interface BlockEditorShortcutsConfig {
  actions: BlockEditorActionShortcutConfig;
}

export interface BlockEditorShortcutsConfigInput {
  actions?: BlockEditorActionShortcutConfig;
}

export interface BlockEditorConfigInput {
  appearance?: BlockEditorAppearanceConfigInput;
  markdown?: BlockEditorMarkdownConfigInput;
  shortcuts?: BlockEditorShortcutsConfigInput;
}

export interface BlockEditorHandle extends BlockEditorActionController {
  copy: () => Promise<void>;
  flush: () => Promise<string>;
  getPreviewData: (request: BlockEditorPreviewDataRequest) => Promise<string>;
  subscribePreviewChange: (listener: BlockEditorPreviewChangeListener) => () => void;
}

export type { BlockEditorActionState };

export interface BlockEditorProps {
  ref?: Ref<BlockEditorHandle>;
  runtime: BlockEditorRuntime;
  initialMarkdown: string;
  config?: BlockEditorConfigInput;
  onMarkdownChange: (markdown: string) => void;
  onBlur?: () => void;
}
