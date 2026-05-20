import type { BaseUIEvent } from "@base-ui/react/types";
import { Trans } from "@lingui/react/macro";
import type { Tag } from "@renderer/clients";
import { Button, buttonVariants } from "@renderer/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@renderer/ui/components/combobox";
import { InputGroupAddon } from "@renderer/ui/components/input-group";
import type { VariantProps } from "class-variance-authority";
import { LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

import { TagAvatar } from "./tag-icon";

type TagOption = {
  tag: Tag;
  value: string;
  label: string;
};

interface TagComboboxPopoverProps {
  tags: Tag[];
  selectedTagIds: string[];
  trigger: ReactNode;
  triggerSize?: VariantProps<typeof buttonVariants>["size"];
  placeholder: string;
  disabled?: boolean;
  isCreatingTag: boolean;
  isDeletingTag?: (tagId: string) => boolean;
  isEditingTag?: (tagId: string) => boolean;
  onSelectedTagIdsChange: (tagIds: string[]) => void | Promise<void>;
  onCreateTag: (name: string) => Promise<void>;
  onDeleteTag?: (tagId: string) => Promise<void>;
  onEditTag?: (tag: Tag) => void;
}

function normalizeTagName(tagName: string): string {
  return tagName.trim().toLocaleLowerCase();
}

export function TagComboboxPopover({
  tags,
  selectedTagIds,
  trigger,
  triggerSize = "icon",
  placeholder,
  disabled = false,
  isCreatingTag,
  isDeletingTag,
  isEditingTag,
  onSelectedTagIdsChange,
  onCreateTag,
  onDeleteTag,
  onEditTag,
}: TagComboboxPopoverProps) {
  const [inputValue, setInputValue] = useState("");

  const tagOptions = useMemo<TagOption[]>(
    () =>
      tags.map((tag) => ({
        tag,
        value: tag.id,
        label: tag.name,
      })),
    [tags],
  );
  const normalizedInputValue = normalizeTagName(inputValue);
  const selectedOptions = useMemo(
    () => tagOptions.filter((tagOption) => selectedTagIds.includes(tagOption.value)),
    [selectedTagIds, tagOptions],
  );
  const filteredTagOptions = useMemo(() => {
    if (!normalizedInputValue) {
      return tagOptions;
    }

    return tagOptions.filter((tagOption) =>
      normalizeTagName(tagOption.label).includes(normalizedInputValue),
    );
  }, [normalizedInputValue, tagOptions]);
  const tagExists = tags.some((tag) => normalizeTagName(tag.name) === normalizedInputValue);
  const canCreateTag = !disabled && normalizedInputValue.length > 0 && !tagExists && !isCreatingTag;
  const createTagFromInput = async (): Promise<void> => {
    if (!canCreateTag) {
      return;
    }

    await onCreateTag(inputValue.trim());
    setInputValue("");
  };

  return (
    <Combobox<TagOption, true>
      multiple
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.value}
      isItemEqualToValue={(item, value) => item.value === value.value}
      value={selectedOptions}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={(nextValue) => {
        void onSelectedTagIdsChange(nextValue.map((item) => item.value));
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            className="[&>svg:last-child]:hidden"
            disabled={disabled}
            size={triggerSize}
            variant="ghost"
          />
        }
      >
        {trigger}
      </ComboboxTrigger>

      <ComboboxContent align="end" className="w-72 min-w-72 p-1">
        <ComboboxInput
          disabled={disabled}
          placeholder={placeholder}
          showClear={inputValue.length > 0}
          showTrigger={false}
          onKeyDown={(event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing || !canCreateTag) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.preventBaseUIHandler();
            void createTagFromInput();
          }}
        >
          <InputGroupAddon align="inline-end">
            <Button
              disabled={!canCreateTag}
              size="icon-xs"
              variant="ghost"
              onClick={() => {
                void createTagFromInput();
              }}
            >
              {isCreatingTag ? (
                <LoaderCircleIcon className="size-3 animate-spin" />
              ) : (
                <PlusIcon className="size-3" />
              )}
              <span className="sr-only">
                <Trans id="workspace.tags.create-inline">Create tag</Trans>
              </span>
            </Button>
          </InputGroupAddon>
        </ComboboxInput>

        <ComboboxList className="mt-2">
          {filteredTagOptions.length === 0 ? (
            <ComboboxEmpty className="flex">
              <Trans id="workspace.tags.search.empty">No matching tags</Trans>
            </ComboboxEmpty>
          ) : (
            filteredTagOptions.map((tagOption) => {
              const isDeleting = isDeletingTag?.(tagOption.value) ?? false;
              const isEditing = isEditingTag?.(tagOption.value) ?? false;
              const hasItemActions = Boolean(onDeleteTag || onEditTag);

              return (
                <ComboboxItem
                  key={tagOption.value}
                  className={hasItemActions ? "group/item pr-20" : undefined}
                  value={tagOption}
                >
                  <TagAvatar tag={tagOption.tag} />
                  <span className="min-w-0 truncate">{tagOption.label}</span>

                  {onEditTag ? (
                    <Button
                      className="text-muted-foreground hover:text-foreground absolute inset-e-12 opacity-0 transition-[opacity,color] group-hover/item:opacity-100 group-data-highlighted/item:opacity-100"
                      disabled={disabled || isEditing}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onEditTag(tagOption.tag);
                      }}
                    >
                      {isEditing ? (
                        <LoaderCircleIcon className="size-3 animate-spin" />
                      ) : (
                        <PencilIcon className="size-3" />
                      )}
                      <span className="sr-only">
                        <Trans id="workspace.tags.edit-inline">Edit tag</Trans>
                      </span>
                    </Button>
                  ) : null}

                  {onDeleteTag ? (
                    <Button
                      className="text-muted-foreground hover:text-foreground absolute inset-e-7 opacity-0 transition-[opacity,color] group-hover/item:opacity-100 group-data-highlighted/item:opacity-100"
                      disabled={disabled || isDeleting}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void onDeleteTag(tagOption.value);
                      }}
                    >
                      {isDeleting ? (
                        <LoaderCircleIcon className="size-3 animate-spin" />
                      ) : (
                        <Trash2Icon className="size-3" />
                      )}
                      <span className="sr-only">
                        <Trans id="workspace.tags.delete-inline">Delete tag</Trans>
                      </span>
                    </Button>
                  ) : null}
                </ComboboxItem>
              );
            })
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
