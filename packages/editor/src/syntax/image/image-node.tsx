import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { type JSX, useEffect, useState } from "react";

import type { ImagePayload } from "../../models/image";
import { useBlockEditorRuntime } from "../../runtime/runtime-extension";

interface ImageViewProps extends ImagePayload {
  nodeKey: NodeKey;
}

export type SerializedImageNode = Spread<ImagePayload, SerializedLexicalNode>;

function isAssetUrl(src: string): boolean {
  return src.startsWith("assets://");
}

function ImageView({ alt, src, title }: ImageViewProps): JSX.Element {
  const runtime = useBlockEditorRuntime();
  const [renderSrc, setRenderSrc] = useState(src);

  useEffect(() => {
    if (!isAssetUrl(src) || !runtime.assets.renderAssetUrls) {
      setRenderSrc(src);
      return;
    }

    let isActive = true;
    void runtime.assets
      .renderAssetUrls([src])
      .then((assets) => {
        if (!isActive) {
          return;
        }

        setRenderSrc(assets.find((asset) => asset.assetUrl === src)?.renderUrl ?? src);
      })
      .catch(() => {
        if (isActive) {
          setRenderSrc(src);
        }
      });

    return () => {
      isActive = false;
    };
  }, [runtime.assets, src]);

  return (
    <img
      alt={alt}
      className="block-editor__image"
      draggable={false}
      src={renderSrc}
      title={title ?? undefined}
    />
  );
}

function convertImageElement(element: HTMLElement): DOMConversionOutput | null {
  if (element.tagName.toLowerCase() !== "img") {
    return null;
  }

  return {
    node: $createImageNode({
      alt: element.getAttribute("alt") ?? "",
      src: element.getAttribute("src") ?? "",
      title: element.getAttribute("title"),
    }),
  };
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __alt: string;
  __src: string;
  __title: string | null;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__title, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    // Keep legacy importDOM until DOMImportExtension migration has Word, VS Code, and browser paste fixtures.
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 1,
      }),
    };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      alt: serializedNode.alt,
      src: serializedNode.src,
      title: serializedNode.title,
    });
  }

  constructor(src: string, alt: string, title: string | null, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__title = title;
  }

  createDOM(_: EditorConfig): HTMLElement {
    const element = document.createElement("span");
    element.className = "block-editor__image-shell";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <ImageView alt={this.__alt} nodeKey={this.getKey()} src={this.__src} title={this.__title} />
    );
  }

  exportDOM(_: LexicalEditor): DOMExportOutput {
    const element = document.createElement("img");
    element.alt = this.__alt;
    element.src = this.__src;
    if (this.__title) {
      element.title = this.__title;
    }

    return { element };
  }

  exportJSON(): SerializedImageNode {
    return {
      alt: this.__alt,
      src: this.__src,
      title: this.__title,
      type: "image",
      version: 1,
    };
  }

  getTextContent(): string {
    return this.__alt;
  }

  getAlt(): string {
    return this.__alt;
  }

  getSrc(): string {
    return this.__src;
  }

  getTitle(): string | null {
    return this.__title;
  }

  isInline(): true {
    return true;
  }
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  return new ImageNode(payload.src, payload.alt, payload.title);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
