import { Trans } from "@lingui/react/macro";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";

import { NoteEditorShell } from "@/features/note-editor-core";
import { Button } from "@/ui/components/button";
import { ButtonGroup } from "@/ui/components/button-group";

interface NoteBlockEditorViewProps {
  blockId: string;
  initialMarkdown: string;
  focusRequestKey: number;
  isDeleting: boolean;
  isOnlyBlock: boolean;
  onMarkdownUpdated: (markdown: string) => void;
  onBlur: () => void;
  onDelete: () => void;
  onFocus: () => void;
}

export function NoteBlockEditorView({
  blockId,
  initialMarkdown,
  focusRequestKey,
  isDeleting,
  isOnlyBlock,
  onMarkdownUpdated,
  onBlur,
  onDelete,
  onFocus,
}: NoteBlockEditorViewProps) {
  return (
    <article
      className="group border-border bg-card relative rounded-xl border"
      data-note-block-id={blockId}
      onFocusCapture={onFocus}
    >
      <div className="pointer-events-none absolute top-2 right-2 z-10 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
        <ButtonGroup>
          <Button
            size="icon"
            variant="ghost"
            disabled={isOnlyBlock || isDeleting}
            onClick={onDelete}
          >
            {isDeleting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <Trash2Icon className="size-4" />
            )}
            <span className="sr-only">
              <Trans id="home-note.block.delete">Delete block</Trans>
            </span>
          </Button>
        </ButtonGroup>
      </div>

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
