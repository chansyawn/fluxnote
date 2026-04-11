import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isTableCellNode, $isTableSelection } from "@lexical/table";
import { $getSelection } from "lexical";
import { useEffect, useState } from "react";

import {
  areSelectionRectsEqual,
  collectSelectionRects,
  collectTextRectsFromElement,
  mergeSelectionRects,
  type SelectionRect,
} from "./note-editor-selection-rect";

export function NoteEditorSelectionOverlayPlugin() {
  const [editor] = useLexicalComposerContext();
  const [selectionRects, setSelectionRects] = useState<SelectionRect[]>([]);

  useEffect(() => {
    let frameId: number | null = null;

    const scheduleSelectionOverlayUpdate = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;

        const rootElement = editor.getRootElement();
        const containerElement = rootElement?.closest(".note-block-editor");

        if (!(rootElement instanceof HTMLElement) || !(containerElement instanceof HTMLElement)) {
          setSelectionRects((currentRects) => (currentRects.length > 0 ? [] : currentRects));
          return;
        }

        const nextRects = editor.getEditorState().read(() => {
          const lexicalSelection = $getSelection();

          if ($isTableSelection(lexicalSelection)) {
            const tableCellRects = lexicalSelection
              .getNodes()
              .filter($isTableCellNode)
              .flatMap((tableCellNode) => {
                const tableCellElement = editor.getElementByKey(tableCellNode.getKey());

                if (!(tableCellElement instanceof HTMLElement)) {
                  return [];
                }

                return collectTextRectsFromElement(tableCellElement, containerElement);
              });

            return mergeSelectionRects(tableCellRects);
          }

          return collectSelectionRects(rootElement, containerElement);
        });

        setSelectionRects((currentRects) => {
          return areSelectionRectsEqual(currentRects, nextRects) ? currentRects : nextRects;
        });
      });
    };

    scheduleSelectionOverlayUpdate();

    const removeUpdateListener = editor.registerUpdateListener(() => {
      scheduleSelectionOverlayUpdate();
    });
    const handleSelectionChange = () => {
      scheduleSelectionOverlayUpdate();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("resize", handleSelectionChange);
    window.addEventListener("scroll", handleSelectionChange, true);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      removeUpdateListener();
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("resize", handleSelectionChange);
      window.removeEventListener("scroll", handleSelectionChange, true);
    };
  }, [editor]);

  return (
    <div aria-hidden className="note-block-editor__selection-overlay">
      {selectionRects.map((rect, index) => {
        return (
          <div
            key={`${rect.top}-${rect.left}-${rect.width}-${rect.height}-${index}`}
            className="note-block-editor__selection-rect"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        );
      })}
    </div>
  );
}
