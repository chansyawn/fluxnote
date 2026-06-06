import { Button } from "@fluxnotes/ui/components/button";
import { Popover, PopoverContent } from "@fluxnotes/ui/components/popover";
import { Textarea } from "@fluxnotes/ui/components/textarea";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  UnlinkIcon,
} from "@fluxnotes/ui/icons/lucide";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLingui } from "@lingui/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useBlockEditorRuntime } from "../../runtime/runtime-extension";
import {
  convertAutoLinkToMarkdownLink,
  removeMarkdownLink,
  sanitizeLinkUrlInput,
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
    pinActiveLink,
    scheduleActiveLinkClose,
    setPopoverElement,
    shouldIgnorePopoverClose,
    urlInputFocusRequest,
  } = useActiveLinkTarget(editor);
  const [draftUrl, setDraftUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLTextAreaElement>(null);
  const activeMarkdownLinkKey = activeLink?.link.kind === "markdown" ? activeLink.link.key : null;
  const shouldFocusUrlInput =
    urlInputFocusRequest !== null && urlInputFocusRequest.key === activeMarkdownLinkKey;

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

  useLayoutEffect(() => {
    if (!shouldFocusUrlInput) return;
    const timer = window.setTimeout(() => {
      urlInputRef.current?.focus();
      urlInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [shouldFocusUrlInput, urlInputFocusRequest]);

  const handleOpen = async () => {
    if (!activeLink) return;
    const url = activeLink.link.kind === "markdown" ? draftUrl : activeLink.link.url;
    await runtime.links.openExternal(url);
    close();
  };

  const handleCopy = async () => {
    if (!activeLink) return;
    const url = activeLink.link.kind === "markdown" ? draftUrl : activeLink.link.url;
    await runtime.clipboard.writeText(url);
    setCopied(true);
  };

  const handleRemove = () => {
    if (!activeLink || activeLink.link.kind !== "markdown") return;
    const convertedLink = removeMarkdownLink(editor, activeLink.link.key);
    if (convertedLink) {
      pinActiveLink(convertedLink);
      return;
    }

    close();
  };

  const handleConvert = () => {
    if (!activeLink || activeLink.link.kind !== "auto") return;
    const convertedLink = convertAutoLinkToMarkdownLink(editor, activeLink.link.key);
    if (convertedLink) pinActiveLink(convertedLink);
  };

  const handleDraftUrlChange = (url: string) => {
    if (!activeLink || activeLink.link.kind !== "markdown") return;
    const nextUrl = sanitizeLinkUrlInput(url);
    setDraftUrl(nextUrl);
    setMarkdownLinkUrl(editor, activeLink.link.key, nextUrl);
  };

  if (!activeLink) return null;

  const isMarkdownLink = activeLink.link.kind === "markdown";
  const actionUrl = isMarkdownLink ? draftUrl : activeLink.link.url;
  const hasActionUrl = actionUrl.length > 0;

  const openLabel = i18n._({ id: "block-editor.link.open", message: "Open" });
  const copyLabel = i18n._({ id: "block-editor.link.copy", message: "Copy" });
  const copiedLabel = i18n._({ id: "block-editor.link.copied", message: "Copied" });
  const removeLabel = i18n._({ id: "block-editor.link.remove", message: "Remove link" });
  const convertLabel = i18n._({ id: "block-editor.link.convert", message: "Convert to link" });
  const urlLabel = i18n._({ id: "block-editor.link.url", message: "Link URL" });

  const sharedActions = (
    <>
      <Button
        disabled={!hasActionUrl}
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => void handleOpen()}
      >
        <ExternalLinkIcon data-icon="inline-start" />
        {openLabel}
      </Button>
      <Button
        disabled={!hasActionUrl}
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => void handleCopy()}
      >
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
        className="w-fit max-w-xs p-2"
        align="center"
        finalFocus={false}
        initialFocus={shouldFocusUrlInput ? () => urlInputRef.current : false}
        side="top"
        sideOffset={2}
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
          <div className="flex flex-col gap-2">
            <Textarea
              ref={urlInputRef}
              aria-label={urlLabel}
              className="max-h-28 min-h-7 resize-none overflow-auto py-1"
              rows={1}
              value={draftUrl}
              onChange={(event) => handleDraftUrlChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
            />
            <div className="flex flex-wrap items-center gap-1">
              {sharedActions}
              <Button size="sm" type="button" variant="ghost" onClick={handleRemove}>
                <UnlinkIcon data-icon="inline-start" />
                {removeLabel}
              </Button>
            </div>
          </div>
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
