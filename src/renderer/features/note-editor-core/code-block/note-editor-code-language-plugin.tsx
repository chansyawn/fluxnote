import { $isCodeNode, type CodeNode } from "@lexical/code-core";
import { normalizeCodeLanguage } from "@lexical/code-shiki";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLingui } from "@lingui/react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@renderer/ui/components/combobox";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCodeLanguageSearchTokens,
  getCommonCodeLanguageOptions,
  resolveCodeLanguageVariant,
  type CodeLanguageOption,
} from "./note-editor-code-language-options";

type CodeLanguageControlState = {
  codeNodeKey: NodeKey;
  language: string;
  top: number;
  inlineEnd: number;
  popupContainer: HTMLElement | null;
};

function findCodeNode(node: LexicalNode | null): CodeNode | null {
  let currentNode: LexicalNode | null = node;

  while (currentNode) {
    if ($isCodeNode(currentNode)) {
      return currentNode;
    }

    currentNode = currentNode.getParent();
  }

  return null;
}

function getActiveCodeNode(editor: LexicalEditor) {
  return editor.read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return null;
    }

    const anchorCodeNode = findCodeNode(selection.anchor.getNode());

    if (anchorCodeNode) {
      return {
        key: anchorCodeNode.getKey(),
        language: anchorCodeNode.getLanguage() ?? "text",
      };
    }

    const focusCodeNode = findCodeNode(selection.focus.getNode());

    if (focusCodeNode) {
      return {
        key: focusCodeNode.getKey(),
        language: focusCodeNode.getLanguage() ?? "text",
      };
    }

    return null;
  });
}

function getControlPosition(editor: LexicalEditor, nodeKey: NodeKey) {
  const rootElement = editor.getRootElement();
  const containerElement = rootElement?.closest(".note-block-editor") as HTMLElement | null;
  const codeElement = editor.getElementByKey(nodeKey);

  if (!containerElement || !codeElement) {
    return null;
  }

  const containerRect = containerElement.getBoundingClientRect();
  const codeRect = codeElement.getBoundingClientRect();

  return {
    top: Math.round(codeRect.top - containerRect.top + containerElement.scrollTop + 6),
    inlineEnd: Math.round(containerRect.right - codeRect.right + containerElement.scrollLeft + 6),
    popupContainer: containerElement,
  };
}

function isControlStateEqual(
  currentState: CodeLanguageControlState | null,
  nextState: CodeLanguageControlState | null,
): boolean {
  if (!currentState || !nextState) {
    return currentState === nextState;
  }

  return (
    currentState.codeNodeKey === nextState.codeNodeKey &&
    currentState.language === nextState.language &&
    currentState.top === nextState.top &&
    currentState.inlineEnd === nextState.inlineEnd &&
    currentState.popupContainer === nextState.popupContainer
  );
}

export function NoteEditorCodeLanguagePlugin() {
  const [editor] = useLexicalComposerContext();
  const { i18n } = useLingui();
  const [controlState, setControlState] = useState<CodeLanguageControlState | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const frameRef = useRef<number | null>(null);

  const plainTextLabel = i18n._({
    id: "editor.code-block.language.option.plain-text",
    message: "Plain text",
  });

  const languageOptions = useMemo<CodeLanguageOption[]>(() => {
    return getCommonCodeLanguageOptions(plainTextLabel);
  }, [plainTextLabel]);

  const refreshControlState = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const activeCodeNode = getActiveCodeNode(editor);

    if (!activeCodeNode) {
      setControlState((currentState) => (currentState ? null : currentState));
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;

      const position = getControlPosition(editor, activeCodeNode.key);

      if (!position) {
        setControlState((currentState) => (currentState ? null : currentState));
        return;
      }

      const nextState: CodeLanguageControlState = {
        codeNodeKey: activeCodeNode.key,
        language:
          resolveCodeLanguageVariant(activeCodeNode.language) ??
          normalizeCodeLanguage(activeCodeNode.language),
        top: position.top,
        inlineEnd: position.inlineEnd,
        popupContainer: position.popupContainer,
      };

      setControlState((currentState) =>
        isControlStateEqual(currentState, nextState) ? currentState : nextState,
      );
    });
  }, [editor]);

  useEffect(() => {
    queueMicrotask(refreshControlState);

    const removeUpdateListener = editor.registerUpdateListener(() => {
      refreshControlState();
    });

    const handleSelectionOrLayoutChange = () => {
      refreshControlState();
    };

    document.addEventListener("selectionchange", handleSelectionOrLayoutChange);
    window.addEventListener("resize", handleSelectionOrLayoutChange);
    window.addEventListener("scroll", handleSelectionOrLayoutChange, true);

    return () => {
      removeUpdateListener();
      document.removeEventListener("selectionchange", handleSelectionOrLayoutChange);
      window.removeEventListener("resize", handleSelectionOrLayoutChange);
      window.removeEventListener("scroll", handleSelectionOrLayoutChange, true);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [editor, refreshControlState]);

  if (!controlState) {
    return null;
  }

  const hasCurrentLanguageOption = languageOptions.some(
    (option) => option.value === controlState.language,
  );
  const effectiveOptions = hasCurrentLanguageOption
    ? languageOptions
    : [
        ...languageOptions,
        {
          value: controlState.language,
          label: controlState.language,
          aliases: [],
        },
      ];
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase();
  const filteredOptions =
    normalizedSearchValue.length === 0
      ? effectiveOptions
      : effectiveOptions.filter((option) =>
          getCodeLanguageSearchTokens(option).some((token) =>
            token.includes(normalizedSearchValue),
          ),
        );
  const selectedOption =
    effectiveOptions.find((option) => option.value === controlState.language) ??
    effectiveOptions[0];

  if (!selectedOption) {
    return null;
  }

  return (
    <div
      aria-label={i18n._({
        id: "editor.code-block.language.label",
        message: "Code language",
      })}
      className="absolute z-40"
      style={{
        insetInlineEnd: `${controlState.inlineEnd}px`,
        top: `${controlState.top}px`,
      }}
    >
      <Combobox<CodeLanguageOption>
        items={effectiveOptions}
        inputValue={searchValue}
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.value}
        isItemEqualToValue={(item, value) => item.value === value.value}
        onInputValueChange={setSearchValue}
        value={selectedOption}
        onValueChange={(option) => {
          if (!option) {
            return;
          }

          const normalizedLanguage =
            resolveCodeLanguageVariant(option.value) ?? normalizeCodeLanguage(option.value);
          setSearchValue("");

          editor.update(() => {
            const node = $getNodeByKey(controlState.codeNodeKey);

            if ($isCodeNode(node)) {
              node.setLanguage(normalizedLanguage);
            }
          });

          setControlState((currentState) =>
            currentState
              ? {
                  ...currentState,
                  language: normalizedLanguage,
                }
              : currentState,
          );
        }}
      >
        <ComboboxInput
          className="text-muted-foreground h-5 w-20 [&>input]:text-[0.625rem]"
          placeholder={i18n._({
            id: "editor.code-block.language.search.placeholder",
            message: "Search language",
          })}
          showTrigger={false}
        />
        <ComboboxContent align="center" container={controlState.popupContainer ?? undefined}>
          <ComboboxEmpty>
            {i18n._({
              id: "editor.code-block.language.search.empty",
              message: "No matching language",
            })}
          </ComboboxEmpty>
          <ComboboxList>
            {filteredOptions.map((option) => (
              <ComboboxItem key={option.value} value={option} className="h-5 min-h-5 px-1.5 py-1">
                <span className="text-[0.625rem]">{option.label}</span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
