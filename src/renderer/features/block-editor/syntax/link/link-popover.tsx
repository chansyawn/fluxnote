import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLingui } from "@lingui/react";
import { Button } from "@renderer/ui/components/button";
import { Input } from "@renderer/ui/components/input";
import { $getNearestNodeFromDOMNode, type LexicalEditor } from "lexical";
import { CheckIcon, CopyIcon, ExternalLinkIcon, LinkIcon, UnlinkIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useBlockEditorRuntime } from "../../core/runtime-extension";
import {
  convertAutoLinkToMarkdownLink,
  findLinkAncestor,
  type LinkTarget,
  readLinkTarget,
  removeMarkdownLink,
  updateMarkdownLinkUrl,
} from "./link-operations";

const CLOSE_DELAY_MS = 120;
const COPY_FEEDBACK_DURATION_MS = 1600;

interface ActiveLink {
  rect: DOMRect;
  target: LinkTarget;
}

function readLinkFromDom(editor: LexicalEditor, domNode: Node): LinkTarget | null {
  let target: LinkTarget | null = null;
  editor.getEditorState().read(
    () => {
      const lexicalNode = $getNearestNodeFromDOMNode(domNode);
      const link = findLinkAncestor(lexicalNode);
      target = link ? readLinkTarget(link) : null;
    },
    { editor },
  );
  return target;
}

function getLinkElement(editor: LexicalEditor, target: LinkTarget): HTMLElement | null {
  const element = editor.getElementByKey(target.key);
  return element instanceof HTMLElement ? element : null;
}

function measureActiveLink(editor: LexicalEditor, domNode: Node): ActiveLink | null {
  const target = readLinkFromDom(editor, domNode);
  if (!target) return null;

  const element = getLinkElement(editor, target);
  if (!element) return null;

  return {
    rect: element.getBoundingClientRect(),
    target,
  };
}

function getEditorShellElement(editorRootElement: HTMLElement | null): HTMLElement | null {
  return editorRootElement?.closest<HTMLElement>(".block-editor__shell") ?? null;
}

export function LinkHoverControls() {
  const { i18n } = useLingui();
  const [editor] = useLexicalComposerContext();
  const runtime = useBlockEditorRuntime();
  const closeTimerRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const [activeLink, setActiveLink] = useState<ActiveLink | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearCloseTimer();
    setActiveLink(null);
    setCopied(false);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(close, CLOSE_DELAY_MS);
  }, [clearCloseTimer, close]);

  const showLink = useCallback(
    (domNode: Node) => {
      const next = measureActiveLink(editor, domNode);
      if (!next) {
        scheduleClose();
        return;
      }
      clearCloseTimer();
      setActiveLink(next);
      setDraftUrl(next.target.url);
      setCopied(false);
    },
    [clearCloseTimer, editor, scheduleClose],
  );

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      shellRef.current = getEditorShellElement(rootElement);
      if (!rootElement) return;

      const handlePointerOver = (event: PointerEvent) => {
        if (event.target instanceof Node) showLink(event.target);
      };
      const handleFocusIn = (event: FocusEvent) => {
        if (event.target instanceof Node) showLink(event.target);
      };
      const handlePointerOut = (event: PointerEvent) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && rootElement.contains(nextTarget)) return;
        scheduleClose();
      };

      rootElement.addEventListener("pointerover", handlePointerOver);
      rootElement.addEventListener("focusin", handleFocusIn);
      rootElement.addEventListener("pointerout", handlePointerOut);

      return () => {
        rootElement.removeEventListener("pointerover", handlePointerOver);
        rootElement.removeEventListener("focusin", handleFocusIn);
        rootElement.removeEventListener("pointerout", handlePointerOut);
      };
    });
  }, [editor, scheduleClose, showLink]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeLink || activeLink.target.kind !== "link") return;
    updateMarkdownLinkUrl(editor, activeLink.target.key, draftUrl);
    close();
  };

  if (!activeLink || !shellRef.current) return null;

  const shellRect = shellRef.current.getBoundingClientRect();
  const position = {
    left: activeLink.rect.left - shellRect.left + activeLink.rect.width / 2,
    top: activeLink.rect.bottom - shellRect.top + 6,
  };
  const isMarkdownLink = activeLink.target.kind === "link";

  const openLabel = i18n._({ id: "block-editor.link.open", message: "Open" });
  const copyLabel = i18n._({ id: "block-editor.link.copy", message: "Copy" });
  const copiedLabel = i18n._({ id: "block-editor.link.copied", message: "Copied" });
  const removeLabel = i18n._({ id: "block-editor.link.remove", message: "Remove link" });
  const convertLabel = i18n._({ id: "block-editor.link.convert", message: "Convert to link" });
  const urlLabel = i18n._({ id: "block-editor.link.url", message: "Link URL" });

  return createPortal(
    <div
      className="block-editor__link-popover"
      style={position}
      onPointerEnter={clearCloseTimer}
      onPointerLeave={scheduleClose}
    >
      {isMarkdownLink ? (
        <form className="block-editor__link-popover-form" onSubmit={handleSubmit}>
          <Input
            aria-label={urlLabel}
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.currentTarget.value)}
          />
          <div className="block-editor__link-popover-actions">
            <Button size="sm" type="button" variant="ghost" onClick={() => void handleOpen()}>
              <ExternalLinkIcon data-icon="inline-start" />
              {openLabel}
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => void handleCopy()}>
              {copied ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <CopyIcon data-icon="inline-start" />
              )}
              {copied ? copiedLabel : copyLabel}
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={handleRemove}>
              <UnlinkIcon data-icon="inline-start" />
              {removeLabel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="block-editor__link-popover-actions">
          <Button size="sm" type="button" variant="ghost" onClick={() => void handleOpen()}>
            <ExternalLinkIcon data-icon="inline-start" />
            {openLabel}
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => void handleCopy()}>
            {copied ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <CopyIcon data-icon="inline-start" />
            )}
            {copied ? copiedLabel : copyLabel}
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={handleConvert}>
            <LinkIcon data-icon="inline-start" />
            {convertLabel}
          </Button>
        </div>
      )}
    </div>,
    shellRef.current,
  );
}
