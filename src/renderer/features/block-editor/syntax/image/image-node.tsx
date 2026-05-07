import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { cn } from "@renderer/ui/lib/utils";
import {
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
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
import { useEffect, useRef, type JSX } from "react";

export interface ImagePayload {
  alt: string;
  src: string;
  title: string | null;
}

interface ImageViewProps extends ImagePayload {
  nodeKey: NodeKey;
}

export type SerializedImageNode = Spread<ImagePayload, SerializedLexicalNode>;

function ImageView({ alt, nodeKey, src, title }: ImageViewProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);

  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      (event) => {
        if (event.target !== imageRef.current) {
          return false;
        }

        event.preventDefault();
        if (!event.shiftKey) {
          clearSelected();
        }
        setSelected(true);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [clearSelected, editor, setSelected]);

  return (
    <img
      alt={alt}
      className={cn("block-editor__image", isSelected && "block-editor__image--selected")}
      draggable={false}
      ref={imageRef}
      src={src}
      title={title ?? undefined}
    />
  );
}

function convertImageElement(element: HTMLElement): DOMConversionOutput | null {
  if (!(element instanceof HTMLImageElement)) {
    return null;
  }

  return {
    node: $createImageNode({
      alt: element.alt,
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
    return document.createElement("span");
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
