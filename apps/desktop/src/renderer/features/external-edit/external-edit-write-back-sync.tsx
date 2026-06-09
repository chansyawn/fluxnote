import { toast } from "@fluxnotes/ui/components/sonner";
import { useLingui } from "@lingui/react";
import { onExternalEditWriteBackFailed } from "@renderer/clients";
import { useEffect } from "react";

export function ExternalEditWriteBackSync() {
  const { i18n } = useLingui();

  useEffect(() => {
    return onExternalEditWriteBackFailed(() => {
      toast.info(
        i18n._({
          id: "external-edit.write-back.failed",
          message:
            "Edited text was copied to the clipboard because the Mac App could not be updated.",
        }),
      );
    });
  }, [i18n]);

  return null;
}
