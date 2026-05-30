import { useLingui } from "@lingui/react";
import { Button } from "@renderer/ui/components/button";
import { Popover, PopoverContent } from "@renderer/ui/components/popover";
import { Textarea } from "@renderer/ui/components/textarea";
import { CheckIcon, CopyIcon, ExternalLinkIcon, PencilIcon, UnlinkIcon } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import type { BlockEditorRuntime } from "../../core/types";
import {
  getActiveLinkAnchor,
  removeLink,
  sanitizeLinkUrlInput,
  updateLinkHref,
} from "./link-model";
import type { LinkPopoverStateStore } from "./link-plugin";

const COPY_FEEDBACK_DURATION_MS = 1600;

interface LinkPopoverProps {
  runtime: BlockEditorRuntime;
  store: LinkPopoverStateStore;
}

export function LinkPopover({ runtime, store }: LinkPopoverProps) {
  const { i18n } = useLingui();
  const activeLink = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [copied, setCopied] = useState(false);
  const [draftUrl, setDraftUrl] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setCopied(false);
    setDraftUrl(activeLink?.href ?? "");
    setEditing(false);
  }, [activeLink]);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!activeLink) return null;

  const close = () => {
    setCopied(false);
    setDraftUrl("");
    setEditing(false);
    store.clear();
  };

  const submitDraftUrl = () => {
    const nextUrl = sanitizeLinkUrlInput(draftUrl).trim();
    if (!nextUrl) return;

    const updatedLink = updateLinkHref(
      activeLink,
      nextUrl,
      activeLink.view.state.schema.marks.link,
    );
    if (updatedLink) store.pinActiveLink(updatedLink);
    setEditing(false);
  };

  const openLabel = i18n._({ id: "block-editor.link.open", message: "Open" });
  const copyLabel = i18n._({ id: "block-editor.link.copy", message: "Copy" });
  const copiedLabel = i18n._({ id: "block-editor.link.copied", message: "Copied" });
  const confirmLabel = i18n._({ id: "block-editor.link.confirm", message: "Confirm" });
  const editLabel = i18n._({ id: "block-editor.link.edit", message: "Edit" });
  const removeLabel = i18n._({ id: "block-editor.link.remove", message: "Remove" });
  const urlLabel = i18n._({ id: "block-editor.link.url", message: "Link URL" });

  return (
    <Popover
      open
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && !store.shouldIgnorePopoverClose(eventDetails.event)) close();
      }}
    >
      <PopoverContent
        ref={store.setPopoverElement}
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
          store.schedulePinnedClose();
        }}
        onFocusCapture={store.holdActiveLinkOpen}
        onPointerEnter={store.holdActiveLinkOpen}
        onPointerLeave={store.schedulePinnedClose}
      >
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              aria-label={urlLabel}
              className="max-h-28 min-h-7 resize-none overflow-auto py-1"
              rows={1}
              value={draftUrl}
              onChange={(event) => setDraftUrl(sanitizeLinkUrlInput(event.currentTarget.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitDraftUrl();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraftUrl(activeLink.href);
                  setEditing(false);
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-1">
              <Button size="sm" type="button" variant="ghost" onClick={submitDraftUrl}>
                <CheckIcon data-icon="inline-start" />
                {confirmLabel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                void runtime.links.openExternal(activeLink.href);
                close();
              }}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              {openLabel}
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => {
                void runtime.clipboard.writeText(activeLink.href);
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
                setDraftUrl(activeLink.href);
                setEditing(true);
                store.holdActiveLinkOpen();
              }}
            >
              <PencilIcon data-icon="inline-start" />
              {editLabel}
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
        )}
      </PopoverContent>
    </Popover>
  );
}
