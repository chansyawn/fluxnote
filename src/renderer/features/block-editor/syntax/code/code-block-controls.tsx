import { useLingui } from "@lingui/react";
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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

import type { BlockEditorRuntime } from "../../core/types";
import type {
  CodeBlockControlTarget,
  CodeBlockControlsStateStore,
} from "./code-block-controls-plugin";
import {
  CODE_LANGUAGE_OPTIONS,
  getCodeLanguageOption,
  getCodeLanguageValue,
  type CodeLanguageOption,
} from "./code-language-options";

const COPY_FEEDBACK_DURATION_MS = 1600;

interface MeasuredCodeBlockControl extends CodeBlockControlTarget {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface CodeBlockControlsProps {
  rootRef: RefObject<HTMLElement | null>;
  runtime: BlockEditorRuntime;
  store: CodeBlockControlsStateStore;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function measureTargets(
  root: HTMLElement | null,
  targets: ReadonlyArray<CodeBlockControlTarget>,
): MeasuredCodeBlockControl[] {
  if (!root) return [];

  const rootRect = root.getBoundingClientRect();
  return targets.flatMap((target): MeasuredCodeBlockControl[] => {
    if (!target.element.isConnected) return [];

    const rect = target.element.getBoundingClientRect();
    return [
      {
        ...target,
        height: rect.height,
        left: rect.left - rootRect.left + root.scrollLeft,
        top: rect.top - rootRect.top + root.scrollTop,
        width: rect.width,
      },
    ];
  });
}

function updateCodeBlockLanguage(target: CodeBlockControlTarget, option: CodeLanguageOption): void {
  const language = getCodeLanguageValue(option);
  target.view.dispatch(target.view.state.tr.setNodeAttribute(target.pos, "language", language));
  target.view.focus();
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
  getCode: () => string;
  runtime: BlockEditorRuntime;
}

function CodeCopyButton({ getCode, runtime }: CodeCopyButtonProps) {
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
              void runtime.clipboard.writeText(getCode()).then(() => setCopied(true));
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

export function CodeBlockControls({ rootRef, runtime, store }: CodeBlockControlsProps) {
  const targets = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [measuredTargets, setMeasuredTargets] = useState<MeasuredCodeBlockControl[]>([]);

  const measure = useCallback(() => {
    setMeasuredTargets(measureTargets(rootRef.current, targets));
  }, [rootRef, targets]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(measure);
    if (rootRef.current) resizeObserver.observe(rootRef.current);

    for (const target of targets) {
      resizeObserver.observe(target.element);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [measure, rootRef, targets]);

  if (measuredTargets.length === 0) return null;

  return (
    <>
      {measuredTargets.map((target) => (
        <div
          key={target.id}
          className="block-editor__code-toolbar"
          contentEditable={false}
          style={{
            inlineSize: target.width,
            insetBlockStart: target.top,
            insetInlineStart: target.left,
          }}
        >
          <CodeLanguageCombobox
            language={target.language}
            onLanguageChange={(option) => updateCodeBlockLanguage(target, option)}
          />
          <CodeCopyButton
            runtime={runtime}
            getCode={() => {
              return target.text;
            }}
          />
        </div>
      ))}
    </>
  );
}
