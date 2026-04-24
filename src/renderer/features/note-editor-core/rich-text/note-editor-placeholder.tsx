import { Trans } from "@lingui/react/macro";

export function NoteEditorPlaceholder() {
  return (
    <div className="text-muted-foreground pointer-events-none absolute top-0 left-0 z-40 text-sm">
      <Trans id="home-note.block.placeholder">Write something...</Trans>
    </div>
  );
}
