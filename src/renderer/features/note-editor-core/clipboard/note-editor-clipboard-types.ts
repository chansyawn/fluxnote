import type { SerializedLexicalNode } from "lexical";

export type ClipboardCopyScope = "document" | "selection";

export interface ClipboardImageReference {
  altText: string;
  blockId: string;
  src: string;
}

export type SerializedClipboardNode = SerializedLexicalNode & {
  children?: SerializedClipboardNode[];
};

export interface ClipboardSnapshot {
  serializedNodes: SerializedClipboardNode[];
  singleSelectedImage: ClipboardImageReference | null;
}

export interface ClipboardPayload {
  html: string | undefined;
  hasUncachedInternalImages: boolean;
  imageRefs: ClipboardImageReference[];
  lexicalJson: string;
  markdown: string;
  singleSelectedImage: ClipboardImageReference | null;
}

export interface ClipboardItemBuildOptions {
  html?: string;
  imageBlob?: Blob;
  imageMimeType?: string;
  lexicalJson?: string;
  markdown: string;
}

export interface ResolvedSingleImageClipboardContent {
  html?: string;
  imageBlob: Blob;
  imageMimeType: string;
}
