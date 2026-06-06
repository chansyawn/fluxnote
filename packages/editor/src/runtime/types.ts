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

export interface BlockEditorRenderAssetUrlResult {
  assetUrl: string;
  renderUrl: string;
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
    renderAssetUrls?: (
      assetUrls: string[],
    ) => Promise<ReadonlyArray<BlockEditorRenderAssetUrlResult>>;
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
