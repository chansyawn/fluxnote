import { Button } from "@fluxnotes/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@fluxnotes/ui/components/combobox";
import { Code2Icon } from "@fluxnotes/ui/icons/lucide";
import { useLingui } from "@lingui/react";
import { useMemo, useState } from "react";

import {
  CODE_LANGUAGE_OPTIONS,
  getCodeLanguageOption,
  type CodeLanguageOption,
} from "./code-language-options";

interface CodeLanguageComboboxProps {
  language: string | null;
  onLanguageChange: (option: CodeLanguageOption) => void;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function CodeLanguageCombobox({ language, onLanguageChange }: CodeLanguageComboboxProps) {
  const { i18n } = useLingui();
  const [inputValue, setInputValue] = useState("");
  const emptyLabel = i18n._({
    id: "block-editor.code.language.empty",
    message: "No matching languages",
  });
  const selectedOption = getCodeLanguageOption(language);
  const normalizedInputValue = normalizeSearchValue(inputValue);
  const filteredOptions = useMemo(() => {
    if (!normalizedInputValue) {
      return CODE_LANGUAGE_OPTIONS;
    }

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
        if (!nextValue) {
          return;
        }

        onLanguageChange(nextValue);
        setInputValue("");
      }}
    >
      <ComboboxTrigger
        render={<Button className="opacity-70" size="sm" type="button" variant="ghost" />}
      >
        <Code2Icon data-icon="inline-start" />
        <span>{selectedOption.label}</span>
      </ComboboxTrigger>

      <ComboboxContent align="start" className="min-w-36 p-1">
        <ComboboxInput
          className=""
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
