import { useLingui } from "@lingui/react";
import { Button } from "@renderer/ui/components/button";
import { Popover, PopoverContent } from "@renderer/ui/components/popover";
import { Textarea } from "@renderer/ui/components/textarea";
import { CheckIcon, CopyIcon, ExternalLinkIcon, UnlinkIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { BlockEditorRuntime } from "../../core/types";
import {
  type ActiveMilkdownLink,
  getActiveLinkAnchor,
  isSameActiveMilkdownLink,
  removeLink,
  sanitizeLinkUrlInput,
  updateLinkHref,
} from "./link-model";

const COPY_FEEDBACK_DURATION_MS = 1600;

interface LinkPopoverProps {
  activeLink: ActiveMilkdownLink | null;
  focusRequestId: number | null;
  runtime: BlockEditorRuntime;
  onClose: () => void;
  onHoldOpen: () => void;
  onPinActiveLink: (link: ActiveMilkdownLink) => void;
  onScheduleClose: () => void;
  setPopoverElement: (element: HTMLElement | null) => void;
  shouldIgnoreClose: (event: Event | undefined) => boolean;
}

export function LinkPopover({
  activeLink,
  focusRequestId,
  runtime,
  onClose,
  onHoldOpen,
  onPinActiveLink,
  onScheduleClose,
  setPopoverElement,
  shouldIgnoreClose,
}: LinkPopoverProps) {
  const { i18n } = useLingui();
  const [copied, setCopied] = useState(false);
  const [draftUrl, setDraftUrl] = useState("");
  const previousActiveLinkRef = useRef<ActiveMilkdownLink | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusedRequestIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSameActiveMilkdownLink(previousActiveLinkRef.current, activeLink)) return;

    previousActiveLinkRef.current = activeLink;
    setCopied(false);
    setDraftUrl(activeLink?.href ?? "");
  }, [activeLink]);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (focusRequestId === null || focusedRequestIdRef.current === focusRequestId) return;

    focusedRequestIdRef.current = focusRequestId;
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
  }, [focusRequestId]);

  if (!activeLink) return null;

  const close = () => {
    setCopied(false);
    setDraftUrl("");
    onClose();
  };

  const updateDraftUrl = (url: string) => {
    const nextUrl = sanitizeLinkUrlInput(url);
    setDraftUrl(nextUrl);
    const updatedLink = updateLinkHref(
      activeLink,
      nextUrl,
      activeLink.view.state.schema.marks.link,
    );
    if (updatedLink) onPinActiveLink(updatedLink);
  };

  const currentUrl = draftUrl.trim();
  const hasUrl = currentUrl.length > 0;
  const openLabel = i18n._({ id: "block-editor.link.open", message: "Open" });
  const copyLabel = i18n._({ id: "block-editor.link.copy", message: "Copy" });
  const copiedLabel = i18n._({ id: "block-editor.link.copied", message: "Copied" });
  const removeLabel = i18n._({ id: "block-editor.link.remove", message: "Remove" });
  const urlLabel = i18n._({ id: "block-editor.link.url", message: "Link URL" });

  return (
    <Popover
      open
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && !shouldIgnoreClose(eventDetails.event)) close();
      }}
    >
      <PopoverContent
        ref={setPopoverElement}
        anchor={getActiveLinkAnchor(activeLink)}
        className="w-fit max-w-xs p-2"
        align="center"
        finalFocus={false}
        initialFocus={false}
        side="top"
        sideOffset={2}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
          onScheduleClose();
        }}
        onFocusCapture={onHoldOpen}
        onPointerEnter={onHoldOpen}
        onPointerLeave={onScheduleClose}
      >
        <div className="flex w-72 max-w-[min(18rem,calc(100vw-2rem))] flex-col gap-2">
          <Textarea
            ref={textareaRef}
            aria-label={urlLabel}
            className="max-h-28 min-h-7 resize-none overflow-auto py-1"
            rows={1}
            value={draftUrl}
            onChange={(event) => updateDraftUrl(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-1">
            <Button
              disabled={!hasUrl}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                void runtime.links.openExternal(currentUrl);
                close();
              }}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              {openLabel}
            </Button>
            <Button
              disabled={!hasUrl}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                void runtime.clipboard.writeText(currentUrl);
                setCopied(true);
              }}
            >
              {copied ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <CopyIcon data-icon="inline-start" />
              )}
              {copied ? copiedLabel : copyLabel}
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                removeLink(activeLink, activeLink.view.state.schema.marks.link);
                close();
              }}
            >
              <UnlinkIcon data-icon="inline-start" />
              {removeLabel}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
