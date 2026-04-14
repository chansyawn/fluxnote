import { useState, type ReactNode } from "react";

import { NoteEditorShell } from "@/features/note-editor-core";
import { cn } from "@/ui/lib/utils";

interface NoteBlockEditorActionsProps {
  popupContainer: HTMLElement | null;
}

interface NoteBlockEditorViewProps {
  blockId: string;
  initialMarkdown: string;
  focusRequestKey: number;
  willArchive: boolean;
  actions?: (props: NoteBlockEditorActionsProps) => ReactNode;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
}

export function NoteBlockEditorView({
  blockId,
  initialMarkdown,
  focusRequestKey,
  willArchive,
  actions,
  onMarkdownUpdated,
  onBlur,
  onFocus,
}: NoteBlockEditorViewProps) {
  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);

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
          {actions({ popupContainer })}
        </div>
      ) : null}

      <div className="min-h-28 px-4 pt-4 pb-4">
        <NoteEditorShell
          focusRequestKey={focusRequestKey}
          initialMarkdown={initialMarkdown}
          onBlur={onBlur}
          onMarkdownUpdated={onMarkdownUpdated}
        />
      </div>
    </article>
  );
}
