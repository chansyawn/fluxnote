import { useLingui } from "@lingui/react";
import { codeBlockSchema } from "@milkdown/kit/preset/commonmark";
import { $view } from "@milkdown/kit/utils";
import {
  useNodeViewContext,
  type ReactNodeViewComponent,
  type ReactNodeViewUserOptions,
} from "@prosemirror-adapter/react";
import { Button } from "@renderer/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@renderer/ui/components/combobox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@renderer/ui/components/tooltip";
import { CheckIcon, Code2Icon, CopyIcon } from "lucide-react";
import type { NodeViewConstructor } from "prosemirror-view";
import { useEffect, useMemo, useState } from "react";

import type { BlockEditorRuntime } from "../../core/types";
import {
  CODE_LANGUAGE_OPTIONS,
  getCodeLanguageOption,
  getCodeLanguageValue,
  type CodeLanguageOption,
} from "./code-language-options";

const COPY_FEEDBACK_DURATION_MS = 1600;
const CODE_BLOCK_CLASS_NAME = "block-editor__code-block";
const CODE_BLOCK_TOOLBAR_SELECTOR = ".block-editor__code-toolbar";

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

interface CodeLanguageComboboxProps {
  language: string | null;
  onLanguageChange: (option: CodeLanguageOption) => void;
}

function CodeLanguageCombobox({ language, onLanguageChange }: CodeLanguageComboboxProps) {
  const { i18n } = useLingui();
  const [inputValue, setInputValue] = useState("");
  const selectedOption = getCodeLanguageOption(language);
  const normalizedInputValue = normalizeSearchValue(inputValue);
  const emptyLabel = i18n._({
    id: "block-editor.code.language.empty",
    message: "No matching languages",
  });
  const languageLabel = i18n._({
    id: "block-editor.code.language.label",
    message: "Code language",
  });
  const filteredOptions = useMemo(() => {
    if (!normalizedInputValue) return CODE_LANGUAGE_OPTIONS;

    return CODE_LANGUAGE_OPTIONS.filter((option) =>
      normalizeSearchValue(`${option.label} ${option.value}`).includes(normalizedInputValue),
    );
  }, [normalizedInputValue]);

  return (
    <Combobox<CodeLanguageOption>
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.value}
      isItemEqualToValue={(item, value) => item.value === value.value}
      value={selectedOption}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={(nextValue) => {
        if (!nextValue) return;

        onLanguageChange(nextValue);
        setInputValue("");
      }}
    >
      <ComboboxTrigger
        aria-label={languageLabel}
        render={<Button className="opacity-80" size="sm" type="button" variant="ghost" />}
      >
        <Code2Icon data-icon="inline-start" />
        <span>{selectedOption.label}</span>
      </ComboboxTrigger>

      <ComboboxContent align="start" className="min-w-36 p-1">
        <ComboboxInput
          placeholder={i18n._({
            id: "block-editor.code.language.search",
            message: "Search language",
          })}
          showClear={inputValue.length > 0}
          showTrigger={false}
        />
        <ComboboxList className="mt-1.5">
          {filteredOptions.length === 0 ? (
            <ComboboxEmpty className="flex">{emptyLabel}</ComboboxEmpty>
          ) : (
            filteredOptions.map((option) => (
              <ComboboxItem key={option.value} value={option}>
                <span className="truncate">{option.label}</span>
              </ComboboxItem>
            ))
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

interface CodeCopyButtonProps {
  code: string;
  runtime: BlockEditorRuntime;
}

function CodeCopyButton({ code, runtime }: CodeCopyButtonProps) {
  const { i18n } = useLingui();
  const [copied, setCopied] = useState(false);
  const copyLabel = i18n._({ id: "block-editor.code.copy", message: "Copy code" });
  const copiedLabel = i18n._({ id: "block-editor.code.copied", message: "Copied" });

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-xs"
            type="button"
            variant="ghost"
            onClick={() => {
              void runtime.clipboard.writeText(code).then(() => setCopied(true));
            }}
          />
        }
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span className="sr-only">{copyLabel}</span>
      </TooltipTrigger>
      <TooltipContent>{copied ? copiedLabel : copyLabel}</TooltipContent>
    </Tooltip>
  );
}

function getNodeLanguage(language: unknown): string | null {
  return typeof language === "string" ? language : null;
}

function createCodeBlockNodeViewComponent(runtime: BlockEditorRuntime): ReactNodeViewComponent {
  function CodeBlockNodeView() {
    const { contentRef, node, setAttrs, view } = useNodeViewContext();
    const language = getNodeLanguage(node.attrs.language);

    return (
      <>
        <div className="block-editor__code-toolbar" contentEditable={false}>
          <CodeLanguageCombobox
            language={language}
            onLanguageChange={(option) => {
              setAttrs({ language: getCodeLanguageValue(option) });
              view.focus();
            }}
          />
          <CodeCopyButton code={node.textContent} runtime={runtime} />
        </div>
        <pre ref={contentRef} />
      </>
    );
  }

  return CodeBlockNodeView;
}

export interface CodeBlockViewPluginInput {
  nodeViewFactory: (options: ReactNodeViewUserOptions) => NodeViewConstructor;
  runtime: BlockEditorRuntime;
}

export function createCodeBlockViewPlugin({ nodeViewFactory, runtime }: CodeBlockViewPluginInput) {
  return $view(codeBlockSchema.node, (ctx) =>
    nodeViewFactory({
      as: () => {
        const element = document.createElement("div");
        element.className = CODE_BLOCK_CLASS_NAME;
        return element;
      },
      component: createCodeBlockNodeViewComponent(runtime),
      contentAs: "code",
      update: (node) => node.type === codeBlockSchema.type(ctx),
      stopEvent: (event) => {
        const target = event.target;
        return target instanceof Element && Boolean(target.closest(CODE_BLOCK_TOOLBAR_SELECTOR));
      },
    }),
  );
}
