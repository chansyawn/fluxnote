import type { ClipboardSerializedNode } from "@shared/features/block-editor/clipboard";
import type { Ref } from "react";

import type {
  BlockEditorTextFormatShortcuts,
  BlockEditorToolbarController,
  BlockEditorToolbarState,
} from "../toolbar/types";

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
  nodes: ClipboardSerializedNode[];
  text: string;
}

export interface BlockEditorRuntime {
  assets: {
    copy: (request: BlockEditorCopyAssetRequest) => Promise<BlockEditorCopyAssetResult>;
    create: (request: BlockEditorCreateAssetRequest) => Promise<BlockEditorCreateAssetResult>;
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

export interface BlockEditorMarkdownConfig {
  codeBlock: BlockEditorCodeBlockConfig;
}

export interface BlockEditorConfig {
  markdown: BlockEditorMarkdownConfig;
  shortcuts: BlockEditorShortcutConfig;
}

export interface BlockEditorCodeBlockConfigInput {
  showLineNumbers?: boolean;
}

export interface BlockEditorMarkdownConfigInput {
  codeBlock?: BlockEditorCodeBlockConfigInput;
}

export interface BlockEditorShortcutConfig {
  textFormats: BlockEditorTextFormatShortcuts;
}

export interface BlockEditorShortcutConfigInput {
  textFormats?: BlockEditorTextFormatShortcuts;
}

export interface BlockEditorConfigInput {
  markdown?: BlockEditorMarkdownConfigInput;
  shortcuts?: BlockEditorShortcutConfigInput;
}

export interface BlockEditorHandle extends BlockEditorToolbarController {
  copy: () => Promise<void>;
  focus: () => void;
  flush: () => Promise<string>;
}

export type { BlockEditorToolbarState };

export interface BlockEditorProps {
  ref?: Ref<BlockEditorHandle>;
  runtime: BlockEditorRuntime;
  initialMarkdown: string;
  config?: BlockEditorConfigInput;
  onMarkdownChange: (markdown: string) => void;
  onBlur?: () => void;
}
