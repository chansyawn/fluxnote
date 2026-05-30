import "./list/list.css";
import { createLinkPopoverPlugin, type LinkPopoverStateStore } from "./link";
import { listSyntaxPlugins } from "./list";

export const syntaxPlugins = [...listSyntaxPlugins];

export function createSyntaxPlugins(linkPopoverStateStore: LinkPopoverStateStore) {
  return [...syntaxPlugins, createLinkPopoverPlugin(linkPopoverStateStore)];
}
