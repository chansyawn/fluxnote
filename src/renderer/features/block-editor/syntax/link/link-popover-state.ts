import { PluginKey } from "@milkdown/kit/prose/state";

export interface LinkPopoverRequest {
  focusInput: boolean;
  from: number;
  id: number;
  to: number;
}

export interface LinkPopoverPluginState {
  request: LinkPopoverRequest | null;
}

let nextLinkPopoverRequestId = 1;

export const linkPopoverPluginKey = new PluginKey<LinkPopoverPluginState>("FLUXNOTES_LINK_POPOVER");

export function createLinkPopoverRequest(from: number, to: number): LinkPopoverRequest {
  const id = nextLinkPopoverRequestId;
  nextLinkPopoverRequestId += 1;

  return {
    focusInput: true,
    from,
    id,
    to,
  };
}
