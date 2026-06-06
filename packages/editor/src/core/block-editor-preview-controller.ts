import { $getSelection, $isNodeSelection, $isRangeSelection, type LexicalEditor } from "lexical";
import { useCallback, useRef } from "react";

import {
  createClipboardDataFromCurrentSelection,
  createClipboardDataFromDocument,
} from "../clipboard/copy";
import type { BlockEditorRuntime } from "../runtime/types";
import type {
  BlockEditorPreviewChangeListener,
  BlockEditorPreviewDataRequest,
  BlockEditorPreviewKind,
} from "./types";

type BlockEditorPreviewExportKind = Exclude<BlockEditorPreviewKind, "markdown-source">;

interface BlockEditorPreviewExportConfig {
  format: "html" | "markdown";
  scope: "document" | "selection";
}

interface BlockEditorPreviewControllerParams {
  editor: LexicalEditor;
  flushMarkdown: () => Promise<string>;
  runtime: BlockEditorRuntime;
}

const PREVIEW_EXPORT_KIND_CONFIG = {
  "html-document-export": {
    format: "html",
    scope: "document",
  },
  "html-selected-export": {
    format: "html",
    scope: "selection",
  },
  "markdown-document-export": {
    format: "markdown",
    scope: "document",
  },
  "markdown-selected-export": {
    format: "markdown",
    scope: "selection",
  },
} as const satisfies Record<BlockEditorPreviewExportKind, BlockEditorPreviewExportConfig>;

function readPreviewSelectionSignature(): string {
  const selection = $getSelection();
  if (selection === null || selection.isCollapsed()) {
    return "none";
  }

  if ($isRangeSelection(selection)) {
    return [
      "range",
      selection.anchor.key,
      selection.anchor.offset,
      selection.focus.key,
      selection.focus.offset,
    ].join(":");
  }

  if ($isNodeSelection(selection)) {
    return `node:${selection
      .getNodes()
      .map((node) => node.getKey())
      .sort()
      .join(":")}`;
  }

  return `nodes:${selection
    .getNodes()
    .map((node) => node.getKey())
    .sort()
    .join(":")}`;
}

function isPreviewExportKind(kind: BlockEditorPreviewKind): kind is BlockEditorPreviewExportKind {
  return kind !== "markdown-source";
}

export function useBlockEditorPreviewController({
  editor,
  flushMarkdown,
  runtime,
}: BlockEditorPreviewControllerParams) {
  const previewChangeListenersRef = useRef(new Set<BlockEditorPreviewChangeListener>());
  const previewSelectionSignatureRef = useRef(editor.read(readPreviewSelectionSignature));

  const publishPreviewChange = useCallback(() => {
    for (const listener of previewChangeListenersRef.current) {
      listener();
    }
  }, []);

  const syncPreviewSelection = useCallback(() => {
    const nextSignature = editor.read(readPreviewSelectionSignature);
    if (nextSignature === previewSelectionSignatureRef.current) {
      return;
    }

    previewSelectionSignatureRef.current = nextSignature;
    publishPreviewChange();
  }, [editor, publishPreviewChange]);

  const getPreviewData = useCallback(
    async ({ kind }: BlockEditorPreviewDataRequest): Promise<string> => {
      if (!isPreviewExportKind(kind)) {
        return await flushMarkdown();
      }

      const config = PREVIEW_EXPORT_KIND_CONFIG[kind];
      const data =
        config.scope === "selection"
          ? await createClipboardDataFromCurrentSelection(editor, runtime.assets.resolve)
          : await createClipboardDataFromDocument(editor, runtime.assets.resolve);

      if (data === null) {
        return "";
      }

      return config.format === "html" ? data.html : data.text;
    },
    [editor, flushMarkdown, runtime.assets.resolve],
  );

  const subscribePreviewChange = useCallback((listener: BlockEditorPreviewChangeListener) => {
    previewChangeListenersRef.current.add(listener);
    return () => {
      previewChangeListenersRef.current.delete(listener);
    };
  }, []);

  return {
    getPreviewData,
    publishPreviewChange,
    subscribePreviewChange,
    syncPreviewSelection,
  };
}
