import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLingui } from "@lingui/react";
import { Button } from "@renderer/ui/components/button";
import { Input } from "@renderer/ui/components/input";
import { Popover, PopoverContent } from "@renderer/ui/components/popover";
import { CheckIcon, CopyIcon, ExternalLinkIcon, LinkIcon, UnlinkIcon } from "lucide-react";
import { type SubmitEventHandler, useCallback, useEffect, useState } from "react";

import { useBlockEditorRuntime } from "../../core/runtime-extension";
import {
  convertAutoLinkToMarkdownLink,
  removeMarkdownLink,
  setMarkdownLinkUrl,
} from "./link-model";
import { useActiveLinkTarget } from "./use-active-link-target";

const COPY_FEEDBACK_DURATION_MS = 1600;

export function LinkHoverControls() {
  const { i18n } = useLingui();
  const [editor] = useLexicalComposerContext();
  const runtime = useBlockEditorRuntime();
  const {
    activeLink,
    closeActiveLink,
    holdActiveLinkOpen,
    scheduleActiveLinkClose,
    setPopoverElement,
    shouldIgnorePopoverClose,
  } = useActiveLinkTarget(editor);
  const [draftUrl, setDraftUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => {
    closeActiveLink();
    setDraftUrl("");
    setCopied(false);
  }, [closeActiveLink]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    setDraftUrl(activeLink?.link.kind === "markdown" ? activeLink.link.url : "");
    setCopied(false);
  }, [activeLink]);

  const handleOpen = async () => {
    if (!activeLink) return;
    await runtime.links.openExternal(activeLink.link.url);
    close();
  };

  const handleCopy = async () => {
    if (!activeLink) return;
    await runtime.clipboard.writeText(activeLink.link.url);
    setCopied(true);
  };

  const handleRemove = () => {
    if (!activeLink || activeLink.link.kind !== "markdown") return;
    removeMarkdownLink(editor, activeLink.link.key);
    close();
  };

  const handleConvert = () => {
    if (!activeLink || activeLink.link.kind !== "auto") return;
    convertAutoLinkToMarkdownLink(editor, activeLink.link.key);
    close();
  };

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!activeLink || activeLink.link.kind !== "markdown") return;
    setMarkdownLinkUrl(editor, activeLink.link.key, draftUrl);
    close();
  };

  if (!activeLink) return null;

  const isMarkdownLink = activeLink.link.kind === "markdown";

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
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && !shouldIgnorePopoverClose(eventDetails.event)) close();
      }}
    >
      <PopoverContent
        ref={setPopoverElement}
        anchor={activeLink.element}
        className="p-2"
        align="center"
        finalFocus={false}
        initialFocus={false}
        side="bottom"
        sideOffset={6}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
          scheduleActiveLinkClose();
        }}
        onFocusCapture={holdActiveLinkOpen}
        onPointerEnter={holdActiveLinkOpen}
        onPointerLeave={scheduleActiveLinkClose}
      >
        {isMarkdownLink ? (
          <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <Input
              aria-label={urlLabel}
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.currentTarget.value)}
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
