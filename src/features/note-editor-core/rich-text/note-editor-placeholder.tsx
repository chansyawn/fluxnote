import { Trans } from "@lingui/react/macro";

export function NoteEditorPlaceholder() {
  return (
    <div className="note-block-editor__placeholder">
      <Trans id="home-note.block.placeholder">Write something...</Trans>
    </div>
  );
}
