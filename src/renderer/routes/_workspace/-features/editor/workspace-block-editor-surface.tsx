import { type Block } from "@renderer/clients";
import {
  BlockEditor,
  type BlockEditorConfigInput,
  type BlockEditorHandle,
  type BlockEditorShortcuts,
  type BlockEditorRuntime,
} from "@renderer/features/block-editor";
import { DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE } from "@renderer/features/block-editor/toolbar";
import { useMarkdownCodeBlockPreference } from "@renderer/features/preferences/preferences-query";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import { cn } from "@renderer/ui/lib/utils";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from "react";

import { useBlockEditorPersistence } from "./block-editor-persistence";
import { createWorkspaceBlockEditorRuntime } from "./block-editor-runtime";

export type WorkspaceBlockEditorHandle = BlockEditorHandle;

interface BlockEditorFrameProps {
  blockId: string;
  adornments?: ReactNode;
  editorConfig?: BlockEditorConfigInput;
  initialMarkdown: string;
  isExternalEditPending?: boolean;
  isKept: boolean;
  isPinned: boolean;
  runtime: BlockEditorRuntime;
  isPendingAutoArchive: boolean;
  onMarkdownChange: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  ref?: Ref<BlockEditorHandle>;
}

function BlockEditorFrame({
  blockId,
  adornments,
  editorConfig,
  initialMarkdown,
  isExternalEditPending = false,
  isKept,
  isPinned,
  runtime,
  isPendingAutoArchive,
  onMarkdownChange,
  onBlur,
  onFocus,
  ref,
}: BlockEditorFrameProps) {
  return (
    <article
      className={cn(
        "group bg-card relative rounded-lg border transition-opacity border-transparent",
        {
          "border-ring": isKept,
          "border-muted": isPinned,
          "border-dashed": isExternalEditPending,
          "opacity-60": isPendingAutoArchive,
        },
      )}
      data-block-id={blockId}
      onFocusCapture={onFocus}
    >
      {adornments ? (
        <div className="absolute top-0 right-1 left-1 z-10 -translate-y-1/2">{adornments}</div>
      ) : null}

      <div className="px-3 pt-3 pb-2">
        <BlockEditor
          ref={ref}
          runtime={runtime}
          initialMarkdown={initialMarkdown}
          config={editorConfig}
          onBlur={onBlur}
          onMarkdownChange={onMarkdownChange}
        />
      </div>
    </article>
  );
}

interface WorkspaceBlockEditorSurfaceProps {
  block: Block;
  adornments?: ReactNode;
  isExternalEditPending?: boolean;
  shortcuts: ShortcutPreferences;
  onFocus: (blockId: string) => void;
  ref?: Ref<WorkspaceBlockEditorHandle>;
}

export function WorkspaceBlockEditorSurface({
  block,
  adornments,
  isExternalEditPending = false,
  shortcuts,
  onFocus,
  ref,
}: WorkspaceBlockEditorSurfaceProps) {
  const editorRef = useRef<BlockEditorHandle | null>(null);
  const runtime = useMemo(() => createWorkspaceBlockEditorRuntime(block.id), [block.id]);
  const { codeBlock } = useMarkdownCodeBlockPreference();
  const editorShortcuts = useMemo<BlockEditorShortcuts>(
    () => ({
      "editor.blockquote": shortcuts["editor.blockquote"],
      "editor.bulletList": shortcuts["editor.bulletList"],
      "editor.codeBlock": shortcuts["editor.codeBlock"],
      "editor.bold": shortcuts["editor.bold"],
      "editor.inlineCode": shortcuts["editor.inlineCode"],
      "editor.italic": shortcuts["editor.italic"],
      "editor.strikethrough": shortcuts["editor.strikethrough"],
      "editor.heading1": shortcuts["editor.heading1"],
      "editor.heading2": shortcuts["editor.heading2"],
      "editor.heading3": shortcuts["editor.heading3"],
      "editor.heading4": shortcuts["editor.heading4"],
      "editor.heading5": shortcuts["editor.heading5"],
      "editor.heading6": shortcuts["editor.heading6"],
      "editor.orderedList": shortcuts["editor.orderedList"],
      "editor.paragraph": shortcuts["editor.paragraph"],
    }),
    [shortcuts],
  );
  const editorConfig = useMemo<BlockEditorConfigInput>(
    () => ({
      markdown: {
        codeBlock,
      },
      shortcuts: {
        editor: editorShortcuts,
      },
    }),
    [codeBlock, editorShortcuts],
  );
  const { flushSave, getLatestContent, saveMarkdown } = useBlockEditorPersistence(block);

  useEffect(() => {
    return () => {
      void (async () => {
        await editorRef.current?.flush();
        await flushSave();
      })();
    };
  }, [flushSave]);

  const flush = useCallback(async () => {
    const markdown = (await editorRef.current?.flush()) ?? getLatestContent();
    await flushSave();
    return markdown;
  }, [flushSave, getLatestContent]);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        await editorRef.current?.copy();
      },
      focus: () => {
        editorRef.current?.focus();
      },
      flush,
      getToolbarState: () =>
        editorRef.current?.getToolbarState() ?? DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
      runToolbarCommand: (command) => {
        editorRef.current?.runToolbarCommand(command);
      },
      subscribeToolbarState: (listener) =>
        editorRef.current?.subscribeToolbarState(listener) ?? (() => undefined),
    }),
    [flush],
  );

  return (
    <BlockEditorFrame
      ref={editorRef}
      blockId={block.id}
      adornments={adornments}
      editorConfig={editorConfig}
      runtime={runtime}
      initialMarkdown={block.content}
      isExternalEditPending={isExternalEditPending}
      isKept={block.isKept}
      isPinned={block.isPinned}
      isPendingAutoArchive={block.isPendingAutoArchive}
      onBlur={() => {
        void flush();
      }}
      onMarkdownChange={saveMarkdown}
      onFocus={() => {
        onFocus(block.id);
      }}
    />
  );
}
