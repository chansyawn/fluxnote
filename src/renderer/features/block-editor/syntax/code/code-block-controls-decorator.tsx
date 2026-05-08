import { $isCodeNode } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getRoot, $isElementNode, type LexicalNode, type NodeKey } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CodeCopyButton } from "./code-copy-button";
import { CodeLanguageCombobox } from "./code-language-combobox";
import {
  getCodeNodeLanguage,
  PLAIN_TEXT_LANGUAGE,
  type CodeLanguageOption,
} from "./code-language-options";

interface CodeBlockDocumentState {
  key: NodeKey;
  language: string | null;
  text: string;
}

interface CodeBlockOverlayRect {
  left: number;
  top: number;
  width: number;
}

interface CodeBlockViewState extends CodeBlockDocumentState {
  rect: CodeBlockOverlayRect;
}

interface ElementRect {
  left: number;
  top: number;
  width: number;
}

interface ScrollOffset {
  left: number;
  top: number;
}

export function calculateCodeToolbarRect(
  shellRect: ElementRect,
  codeRect: ElementRect,
  scrollOffset: ScrollOffset,
): CodeBlockOverlayRect {
  return {
    left: codeRect.left - shellRect.left + scrollOffset.left,
    top: codeRect.top - shellRect.top + scrollOffset.top,
    width: codeRect.width,
  };
}

function collectCodeBlocks(node: LexicalNode, codeBlocks: CodeBlockDocumentState[]): void {
  if ($isCodeNode(node)) {
    codeBlocks.push({
      key: node.getKey(),
      language: node.getLanguage() ?? null,
      text: node.getTextContent(),
    });
    return;
  }

  if (!$isElementNode(node)) {
    return;
  }

  for (const child of node.getChildren()) {
    collectCodeBlocks(child, codeBlocks);
  }
}

function readCodeBlocks(): CodeBlockDocumentState[] {
  const codeBlocks: CodeBlockDocumentState[] = [];
  collectCodeBlocks($getRoot(), codeBlocks);
  return codeBlocks;
}

function getEditorShellElement(editorRootElement: HTMLElement | null): HTMLElement | null {
  return editorRootElement?.closest<HTMLElement>(".block-editor__shell") ?? null;
}

function areCodeBlockViewsEqual(
  previousBlocks: ReadonlyArray<CodeBlockViewState>,
  nextBlocks: ReadonlyArray<CodeBlockViewState>,
): boolean {
  if (previousBlocks.length !== nextBlocks.length) {
    return false;
  }

  return previousBlocks.every((previousBlock, index) => {
    const nextBlock = nextBlocks[index];
    return (
      previousBlock.key === nextBlock.key &&
      previousBlock.language === nextBlock.language &&
      previousBlock.text === nextBlock.text &&
      previousBlock.rect.left === nextBlock.rect.left &&
      previousBlock.rect.top === nextBlock.rect.top &&
      previousBlock.rect.width === nextBlock.rect.width
    );
  });
}

export function CodeBlockControlsDecorator() {
  const [editor] = useLexicalComposerContext();
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockViewState[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const shellElement = getEditorShellElement(editor.getRootElement());

  const measureCodeBlocks = useCallback(() => {
    const shell = getEditorShellElement(editor.getRootElement());
    if (!shell) {
      setCodeBlocks([]);
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    editor.getEditorState().read(() => {
      const nextCodeBlocks = readCodeBlocks().flatMap((codeBlock): CodeBlockViewState[] => {
        const element = editor.getElementByKey(codeBlock.key);
        if (!element) {
          return [];
        }

        return [
          {
            ...codeBlock,
            rect: calculateCodeToolbarRect(shellRect, element.getBoundingClientRect(), {
              left: shell.scrollLeft,
              top: shell.scrollTop,
            }),
          },
        ];
      });

      setCodeBlocks((previousCodeBlocks) =>
        areCodeBlockViewsEqual(previousCodeBlocks, nextCodeBlocks)
          ? previousCodeBlocks
          : nextCodeBlocks,
      );
    });
  }, [editor]);

  const scheduleMeasureCodeBlocks = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      return;
    }

    animationFrameIdRef.current = window.requestAnimationFrame(() => {
      animationFrameIdRef.current = null;
      measureCodeBlocks();
    });
  }, [measureCodeBlocks]);

  useEffect(() => {
    scheduleMeasureCodeBlocks();
    return editor.registerUpdateListener(() => {
      scheduleMeasureCodeBlocks();
    });
  }, [editor, scheduleMeasureCodeBlocks]);

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", scheduleMeasureCodeBlocks);
    window.addEventListener("scroll", scheduleMeasureCodeBlocks, true);

    return () => {
      window.removeEventListener("resize", scheduleMeasureCodeBlocks);
      window.removeEventListener("scroll", scheduleMeasureCodeBlocks, true);
    };
  }, [scheduleMeasureCodeBlocks]);

  useEffect(() => {
    const shell = getEditorShellElement(editor.getRootElement());
    if (!shell || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasureCodeBlocks();
    });
    resizeObserver.observe(shell);

    for (const codeBlock of codeBlocks) {
      const element = editor.getElementByKey(codeBlock.key);
      if (element) {
        resizeObserver.observe(element);
      }
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [codeBlocks, editor, scheduleMeasureCodeBlocks]);

  const handleLanguageChange = useCallback(
    (key: NodeKey, option: CodeLanguageOption) => {
      const nextLanguage = getCodeNodeLanguage(option) ?? PLAIN_TEXT_LANGUAGE;

      editor.update(() => {
        const node = $getNodeByKey(key);
        if ($isCodeNode(node)) {
          node.setLanguage(nextLanguage);
        }
      });
    },
    [editor],
  );

  if (codeBlocks.length === 0) {
    return null;
  }

  if (!shellElement) {
    return null;
  }

  return createPortal(
    <>
      {codeBlocks.map((codeBlock) => (
        <div
          key={codeBlock.key}
          className="block-editor__code-toolbar"
          contentEditable={false}
          style={{
            inlineSize: codeBlock.rect.width,
            insetBlockStart: codeBlock.rect.top,
            insetInlineStart: codeBlock.rect.left,
          }}
        >
          <CodeLanguageCombobox
            language={codeBlock.language}
            onLanguageChange={(option) => handleLanguageChange(codeBlock.key, option)}
          />
          <CodeCopyButton code={codeBlock.text} />
        </div>
      ))}
    </>,
    shellElement,
  );
}
