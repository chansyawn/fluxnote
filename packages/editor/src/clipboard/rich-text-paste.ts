import { $insertDataTransferForRichText } from "@lexical/clipboard";
import { withDOM } from "@lexical/headless/dom";
import {
  $getRoot,
  $getSelection,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
} from "lexical";

import {
  getListItemKeys,
  mergeGeneratedNestedListItemsIntoPreviousSiblings,
  type GeneratedNestedListItemMergePlan,
} from "../syntax/list/list-structure";

interface RichTextClipboardData {
  getData(type: string): string;
}

const ELEMENT_NODE_TYPE = 1;
const TEXT_NODE_TYPE = 3;

const CONTENT_ONLY_ELEMENT_TAGS = new Set([
  "AUDIO",
  "CANVAS",
  "EMBED",
  "HR",
  "IFRAME",
  "IMG",
  "INPUT",
  "MATH",
  "OBJECT",
  "SELECT",
  "SVG",
  "TEXTAREA",
  "VIDEO",
]);

function emptyGeneratedNestedListItemMergePlan(): GeneratedNestedListItemMergePlan {
  return { generatedListItemIndexes: new Set() };
}

function isElementNode(node: ChildNode): node is Element {
  return node.nodeType === ELEMENT_NODE_TYPE;
}

function isTextNode(node: ChildNode): boolean {
  return node.nodeType === TEXT_NODE_TYPE;
}

function isHtmlListElement(element: Element): boolean {
  return element.tagName === "OL" || element.tagName === "UL";
}

function isHtmlListItemElement(element: Element): boolean {
  return element.tagName === "LI";
}

function hasMeaningfulNonListContent(node: ChildNode): boolean {
  if (isTextNode(node)) {
    return (node.textContent ?? "").trim().length > 0;
  }

  if (!isElementNode(node) || isHtmlListElement(node) || node.tagName === "BR") {
    return false;
  }

  if (CONTENT_ONLY_ELEMENT_TAGS.has(node.tagName)) {
    return true;
  }

  return Array.from(node.childNodes).some(hasMeaningfulNonListContent);
}

function hasDirectNonListContent(listItem: Element): boolean {
  return Array.from(listItem.childNodes).some(hasMeaningfulNonListContent);
}

function getDirectNestedLists(listItem: Element): Element[] {
  return Array.from(listItem.children).filter(isHtmlListElement);
}

interface GeneratedNestedListItemMergePlanBuilder {
  generatedListItemIndexes: Set<number>;
  nextImportedListItemIndex: number;
}

function collectListMergePlanFromHtmlList(
  list: Element,
  builder: GeneratedNestedListItemMergePlanBuilder,
): void {
  for (const child of Array.from(list.children)) {
    if (!isHtmlListItemElement(child)) {
      continue;
    }

    builder.nextImportedListItemIndex += 1;

    const nestedLists = getDirectNestedLists(child);
    if (nestedLists.length > 0 && hasDirectNonListContent(child)) {
      builder.generatedListItemIndexes.add(builder.nextImportedListItemIndex);
      builder.nextImportedListItemIndex += 1;
    }

    for (const nestedList of nestedLists) {
      collectListMergePlanFromHtmlList(nestedList, builder);
    }
  }
}

function collectListMergePlanFromHtmlContainer(
  container: ParentNode,
  builder: GeneratedNestedListItemMergePlanBuilder,
): void {
  for (const child of Array.from(container.children)) {
    if (isHtmlListElement(child)) {
      collectListMergePlanFromHtmlList(child, builder);
      continue;
    }

    collectListMergePlanFromHtmlContainer(child, builder);
  }
}

function createGeneratedNestedListItemMergePlanFromHtml(
  html: string,
): GeneratedNestedListItemMergePlan {
  if (!html.trim()) {
    return emptyGeneratedNestedListItemMergePlan();
  }

  try {
    const document = globalThis.document.implementation.createHTMLDocument("");
    document.body.innerHTML = html;

    const builder: GeneratedNestedListItemMergePlanBuilder = {
      generatedListItemIndexes: new Set(),
      nextImportedListItemIndex: 0,
    };
    collectListMergePlanFromHtmlContainer(document.body, builder);

    return { generatedListItemIndexes: builder.generatedListItemIndexes };
  } catch {
    return emptyGeneratedNestedListItemMergePlan();
  }
}

export function cloneCurrentSelection(): BaseSelection | null {
  return $getSelection()?.clone() ?? null;
}

function restoreSelection(selection: BaseSelection | null): void {
  if (selection) {
    $setSelection(selection.clone());
  }
}

export function insertRichTextDataAtSelection(
  editor: LexicalEditor,
  dataTransfer: RichTextClipboardData,
  selection: BaseSelection | null,
): void {
  withDOM(() => {
    const listItemMergePlan = createGeneratedNestedListItemMergePlanFromHtml(
      dataTransfer.getData("text/html"),
    );

    editor.update(
      () => {
        restoreSelection(selection);

        let currentSelection = $getSelection();
        if (!currentSelection) {
          $getRoot().selectEnd();
          currentSelection = $getSelection();
        }

        if (currentSelection) {
          const root = $getRoot();
          const existingListItemKeys = getListItemKeys(root);

          // Lexical's rich text insertion path only reads getData(), so paste snapshots can survive async boundaries.
          $insertDataTransferForRichText(dataTransfer as DataTransfer, currentSelection, editor);
          mergeGeneratedNestedListItemsIntoPreviousSiblings(
            root,
            existingListItemKeys,
            listItemMergePlan,
          );
        }
      },
      { discrete: true },
    );
  });
}
