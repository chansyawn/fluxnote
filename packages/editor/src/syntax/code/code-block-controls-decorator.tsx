import { $isCodeNode } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getRoot, $isElementNode, type LexicalNode, type NodeKey } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useBlockEditorConfig } from "../../core/config";
import { useEditorOverlayContainer } from "../../core/editor-overlay-container";
import { CodeCopyButton } from "./code-copy-button";
import {
  applyCodeBlockDisplayConfig,
  calculateCodeToolbarRect,
  type CodeBlockOverlayRect,
} from "./code-display";
import { CodeLanguageCombobox } from "./code-language-combobox";
import {
  getCodeNodeLanguage,
  PLAIN_TEXT_LANGUAGE,
  type CodeLanguageOption,
} from "./code-language-options";

export { calculateCodeToolbarRect } from "./code-display";

interface CodeBlockDocumentState {
  key: NodeKey;
  language: string | null;
}

interface CodeBlockViewState extends CodeBlockDocumentState {
  rect: CodeBlockOverlayRect;
}

function collectCodeBlocks(node: LexicalNode, codeBlocks: CodeBlockDocumentState[]): void {
  if ($isCodeNode(node)) {
    codeBlocks.push({
      key: node.getKey(),
      language: node.getLanguage() ?? null,
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
      previousBlock.rect.height === nextBlock.rect.height &&
      previousBlock.rect.left === nextBlock.rect.left &&
      previousBlock.rect.top === nextBlock.rect.top &&
      previousBlock.rect.width === nextBlock.rect.width
    );
  });
}

export function CodeBlockControlsDecorator() {
  const [editor] = useLexicalComposerContext();
  const {
    markdown: { codeBlock: codeBlockConfig },
  } = useBlockEditorConfig();
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockViewState[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const overlayContainer = useEditorOverlayContainer();

  const measureCodeBlocks = useCallback(() => {
    if (!overlayContainer) {
      setCodeBlocks([]);
      return;
    }

    const shellRect = overlayContainer.getBoundingClientRect();
    editor.getEditorState().read(() => {
      const nextCodeBlocks = readCodeBlocks().flatMap((codeBlock): CodeBlockViewState[] => {
        const element = editor.getElementByKey(codeBlock.key);
        if (!element) {
          return [];
        }

        applyCodeBlockDisplayConfig(element, codeBlockConfig);
        const codeRect = element.getBoundingClientRect();

        return [
          {
            ...codeBlock,
            rect: calculateCodeToolbarRect(shellRect, codeRect, {
              left: overlayContainer.scrollLeft,
              top: overlayContainer.scrollTop,
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
  }, [codeBlockConfig, editor, overlayContainer]);

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
    const unregisterRootListener = editor.registerRootListener(() => {
      scheduleMeasureCodeBlocks();
    });
    const unregisterUpdateListener = editor.registerUpdateListener(() => {
      scheduleMeasureCodeBlocks();
    });

    return () => {
      unregisterRootListener();
      unregisterUpdateListener();
    };
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
    if (!overlayContainer || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasureCodeBlocks();
    });
    resizeObserver.observe(overlayContainer);

    for (const codeBlock of codeBlocks) {
      const element = editor.getElementByKey(codeBlock.key);
      if (element) {
        resizeObserver.observe(element);
      }
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [codeBlocks, editor, overlayContainer, scheduleMeasureCodeBlocks]);

  useEffect(() => {
    const scrollableCodeBlocks = codeBlocks.flatMap((codeBlock): HTMLElement[] => {
      const element = editor.getElementByKey(codeBlock.key);
      return element ? [element] : [];
    });

    for (const element of scrollableCodeBlocks) {
      element.addEventListener("scroll", scheduleMeasureCodeBlocks, { passive: true });
    }

    return () => {
      for (const element of scrollableCodeBlocks) {
        element.removeEventListener("scroll", scheduleMeasureCodeBlocks);
      }
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

  const readCodeBlockText = useCallback(
    (key: NodeKey): string => {
      let code = "";
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(key);
        if ($isCodeNode(node)) {
          code = node.getTextContent();
        }
      });
      return code;
    },
    [editor],
  );

  if (codeBlocks.length === 0) {
    return null;
  }

  if (!overlayContainer) {
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
          <CodeCopyButton getCode={() => readCodeBlockText(codeBlock.key)} />
        </div>
      ))}
    </>,
    overlayContainer,
  );
}
