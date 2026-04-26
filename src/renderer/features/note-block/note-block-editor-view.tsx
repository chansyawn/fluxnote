import { NoteEditorShell, type NoteEditorShellHandle } from "@renderer/features/note-editor-core";
import { cn } from "@renderer/ui/lib/utils";
import { forwardRef, type ReactNode } from "react";

interface NoteBlockEditorViewProps {
  blockId: string;
  initialMarkdown: string;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  willArchive: boolean;
  actions?: ReactNode;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
}

export const NoteBlockEditorView = forwardRef<NoteEditorShellHandle, NoteBlockEditorViewProps>(
  function NoteBlockEditorView(
    {
      blockId,
      initialMarkdown,
      isExternalEditPending = false,
      leadingActions,
      willArchive,
      actions,
      onMarkdownUpdated,
      onBlur,
      onFocus,
    },
    ref,
  ) {
    return (
      <article
        className={cn(
          "group border-border bg-card relative rounded-xl border transition-opacity",
          isExternalEditPending && "border-dashed",
          willArchive && "opacity-60",
        )}
        data-note-block-id={blockId}
        onFocusCapture={onFocus}
      >
        {actions ? (
          <div className="pointer-events-none absolute top-0 right-1 z-10 -translate-y-1/3 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
            {actions}
          </div>
        ) : null}
        {leadingActions ? (
          <div className="absolute top-0 left-1 z-10 -translate-y-1/3">{leadingActions}</div>
        ) : null}

        <div className="min-h-16 px-3 pt-3 pb-2">
          <NoteEditorShell
            blockId={blockId}
            ref={ref}
            initialMarkdown={initialMarkdown}
            onBlur={onBlur}
            onMarkdownUpdated={onMarkdownUpdated}
          />
        </div>
      </article>
    );
  },
);
