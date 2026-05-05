import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import type { ReactNode } from "react";

export const blockEditorPlugins: ReadonlyArray<ReactNode> = [
  <ListPlugin hasStrictIndent={false} key="list" shouldPreserveNumbering />,
  <LinkPlugin key="link" />,
];
