import { BlockEditor, type BlockEditorHandle } from "@renderer/features/block-editor";
import { cn } from "@renderer/ui/lib/utils";
import type { ReactNode, Ref } from "react";

interface BlockEditorViewProps {
  blockId: string;
  initialMarkdown: string;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  willArchive: boolean;
  actions?: ReactNode;
  onMarkdownChange: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  ref?: Ref<BlockEditorHandle>;
}

export function BlockEditorView({
  blockId,
  initialMarkdown,
  isExternalEditPending = false,
  leadingActions,
  willArchive,
  actions,
  onMarkdownChange,
  onBlur,
  onFocus,
  ref,
}: BlockEditorViewProps) {
  return (
    <article
      className={cn(
        "group border-border bg-card relative rounded-xl border transition-opacity",
        isExternalEditPending && "border-dashed",
        willArchive && "opacity-60",
      )}
      data-block-id={blockId}
      onFocusCapture={onFocus}
    >
      {actions ? (
        <div className="pointer-events-none absolute top-0 right-1 z-10 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
      {leadingActions ? (
        <div className="absolute top-0 left-1 z-10 -translate-y-1/2">{leadingActions}</div>
      ) : null}

      <div className="min-h-16 px-3 pt-3 pb-2">
        <BlockEditor
          blockId={blockId}
          ref={ref}
          initialMarkdown={initialMarkdown}
          onBlur={onBlur}
          onMarkdownChange={onMarkdownChange}
        />
      </div>
    </article>
  );
}
