import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLingui } from "@lingui/react";
import { Button } from "@renderer/ui/components/button";
import { Input } from "@renderer/ui/components/input";
import { Popover, PopoverContent } from "@renderer/ui/components/popover";
import { CheckIcon, CopyIcon, ExternalLinkIcon, LinkIcon, UnlinkIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { useBlockEditorRuntime } from "../../core/runtime-extension";
import {
  convertAutoLinkToMarkdownLink,
  removeMarkdownLink,
  updateMarkdownLinkUrl,
} from "./link-operations";
import { useActiveLinkTarget } from "./use-active-link-target";

const COPY_FEEDBACK_DURATION_MS = 1600;

interface LinkUrlDraft {
  key: string;
  url: string;
}

export function LinkHoverControls() {
  const { i18n } = useLingui();
  const [editor] = useLexicalComposerContext();
  const runtime = useBlockEditorRuntime();
  const { activeLink, closeActiveLink, keepActiveLinkOpen, scheduleActiveLinkClose } =
    useActiveLinkTarget(editor);
  const [draftUrl, setDraftUrl] = useState<LinkUrlDraft | null>(null);
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => {
    closeActiveLink();
    setDraftUrl(null);
    setCopied(false);
  }, [closeActiveLink]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    setDraftUrl(null);
    setCopied(false);
  }, [activeLink]);

  const handleOpen = async () => {
    if (!activeLink) return;
    await runtime.links.openExternal(activeLink.target.url);
    close();
  };

  const handleCopy = async () => {
    if (!activeLink) return;
    await runtime.clipboard.writeText(activeLink.target.url);
    setCopied(true);
  };

  const handleRemove = () => {
    if (!activeLink || activeLink.target.kind !== "link") return;
    removeMarkdownLink(editor, activeLink.target.key);
    close();
  };

  const handleConvert = () => {
    if (!activeLink || activeLink.target.kind !== "autolink") return;
    convertAutoLinkToMarkdownLink(editor, activeLink.target.key);
    close();
  };

  const currentDraftUrl =
    activeLink && draftUrl?.key === activeLink.target.key
      ? draftUrl.url
      : (activeLink?.target.url ?? "");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeLink || activeLink.target.kind !== "link") return;
    updateMarkdownLinkUrl(editor, activeLink.target.key, currentDraftUrl);
    close();
  };

  if (!activeLink) return null;

  const isMarkdownLink = activeLink.target.kind === "link";

  const openLabel = i18n._({ id: "block-editor.link.open", message: "Open" });
  const copyLabel = i18n._({ id: "block-editor.link.copy", message: "Copy" });
  const copiedLabel = i18n._({ id: "block-editor.link.copied", message: "Copied" });
  const removeLabel = i18n._({ id: "block-editor.link.remove", message: "Remove link" });
  const convertLabel = i18n._({ id: "block-editor.link.convert", message: "Convert to link" });
  const urlLabel = i18n._({ id: "block-editor.link.url", message: "Link URL" });

  const sharedActions = (
    <>
      <Button size="sm" type="button" variant="ghost" onClick={() => void handleOpen()}>
        <ExternalLinkIcon data-icon="inline-start" />
        {openLabel}
      </Button>
      <Button size="sm" type="button" variant="ghost" onClick={() => void handleCopy()}>
        {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
        {copied ? copiedLabel : copyLabel}
      </Button>
    </>
  );

  return (
    <Popover
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <PopoverContent
        anchor={activeLink.element}
        className="p-2"
        align="center"
        finalFocus={false}
        initialFocus={false}
        side="bottom"
        sideOffset={6}
        onPointerEnter={keepActiveLinkOpen}
        onPointerLeave={scheduleActiveLinkClose}
      >
        {isMarkdownLink ? (
          <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <Input
              aria-label={urlLabel}
              value={currentDraftUrl}
              onChange={(event) =>
                setDraftUrl({
                  key: activeLink.target.key,
                  url: event.currentTarget.value,
                })
              }
            />
            <div className="flex flex-wrap items-center gap-1">
              {sharedActions}
              <Button size="sm" type="button" variant="ghost" onClick={handleRemove}>
                <UnlinkIcon data-icon="inline-start" />
                {removeLabel}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {sharedActions}
            <Button size="sm" type="button" variant="ghost" onClick={handleConvert}>
              <LinkIcon data-icon="inline-start" />
              {convertLabel}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
