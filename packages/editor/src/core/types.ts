import type { Ref } from "react";

import type {
  BlockEditorActionController,
  BlockEditorActionState,
  BlockEditorShortcutConfig as BlockEditorActionShortcutConfig,
} from "../actions/types";

export interface BlockEditorAssetInput {
  dataBase64: string;
  fileName?: string;
  mimeType: string;
}

export interface BlockEditorCreateAssetRequest {
  assets: BlockEditorAssetInput[];
}

export interface BlockEditorCreateAssetResult {
  assets: Array<{
    altText: string;
    assetUrl: string;
  }>;
}

export interface BlockEditorCopyAssetRequest {
  assetUrls: string[];
  sourceBlockId: string;
}

export interface BlockEditorCopyAssetResult {
  assets: Array<{
    assetUrl: string;
    sourceAssetUrl: string;
  }>;
}

export interface BlockEditorImportFileAssetsRequest {
  files: Array<{
    fileUrl: string;
  }>;
}

export interface BlockEditorImportFileAssetsResult {
  assets: Array<{
    altText?: string;
    assetUrl?: string;
    error?: string;
    fileUrl: string;
  }>;
}

export interface BlockEditorResolveAssetRequest {
  assetUrls: string[];
}

export interface BlockEditorResolveAssetResult {
  assets: Array<{
    assetUrl: string;
    fileUrl: string;
  }>;
}

export interface BlockEditorClipboardWriteData {
  html: string;
  imageFileUrl?: string;
  text: string;
}

export interface BlockEditorRuntime {
  assets: {
    copy: (request: BlockEditorCopyAssetRequest) => Promise<BlockEditorCopyAssetResult>;
    create: (request: BlockEditorCreateAssetRequest) => Promise<BlockEditorCreateAssetResult>;
    importFiles: (
      request: BlockEditorImportFileAssetsRequest,
    ) => Promise<BlockEditorImportFileAssetsResult>;
    resolve: (request: BlockEditorResolveAssetRequest) => Promise<BlockEditorResolveAssetResult>;
  };
  clipboard: {
    write: (data: BlockEditorClipboardWriteData) => Promise<void>;
    writeText: (text: string) => Promise<void>;
  };
  links: {
    openExternal: (url: string) => Promise<void>;
  };
}

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
