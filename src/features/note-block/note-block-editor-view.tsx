import { forwardRef, useState, type ReactNode } from "react";

import { NoteEditorShell, type NoteEditorShellHandle } from "@/features/note-editor-core";
import { cn } from "@/ui/lib/utils";

export interface NoteBlockEditorActionsProps {
  popupContainer: HTMLElement | null;
  onCopy: () => void;
}

interface NoteBlockEditorViewProps {
  blockId: string;
  initialMarkdown: string;
  willArchive: boolean;
  actions?: (props: NoteBlockEditorActionsProps) => ReactNode;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
}

export const NoteBlockEditorView = forwardRef<NoteEditorShellHandle, NoteBlockEditorViewProps>(
  function NoteBlockEditorView(
    { blockId, initialMarkdown, willArchive, actions, onMarkdownUpdated, onBlur, onFocus },
    ref,
  ) {
    const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);

    const handleCopy = () => {
      if (ref && typeof ref !== "function" && ref.current) {
        void ref.current.copyContent();
      }
    };

    return (
      <article
        className={cn(
          "group border-border bg-card relative rounded-xl border transition-opacity",
          willArchive && "opacity-60",
        )}
        data-note-block-id={blockId}
        ref={setPopupContainer}
        onFocusCapture={onFocus}
      >
        {actions ? (
          <div className="pointer-events-none absolute top-0 right-1 z-10 -translate-y-1/3 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
            {actions({ popupContainer, onCopy: handleCopy })}
          </div>
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
