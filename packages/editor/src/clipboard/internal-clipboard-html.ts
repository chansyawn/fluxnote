const INTERNAL_CLIPBOARD_ATTRIBUTE = 'data-fluxnotes-clipboard="v1"';

export function markInternalClipboardHtml(html: string): string {
  return `<div ${INTERNAL_CLIPBOARD_ATTRIBUTE}>${html}</div>`;
}

export function isInternalClipboardHtml(html: string): boolean {
  return html.includes(INTERNAL_CLIPBOARD_ATTRIBUTE);
}
