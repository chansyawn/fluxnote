import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { Block, Tag } from "@renderer/clients";
import { TagComboboxPopover } from "@renderer/features/tag/tag-combobox-popover";
import { TagAvatar } from "@renderer/features/tag/tag-icon";
import { AvatarGroup, AvatarGroupCount } from "@renderer/ui/components/avatar";
import { cn } from "@renderer/ui/lib/utils";
import { TagIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { AdornmentBar } from "./adornment-bar";
import { IconAction } from "./icon-action";

interface BlockTagActionsProps extends Pick<ComponentProps<"div">, "className"> {
  block: Block;
  state: {
    tags: Tag[];
    disabled?: boolean;
    pending?: boolean;
  };
  handlers: {
    onCreateTag: (name: string) => Promise<void>;
    onAssignTags: (tagIds: string[]) => Promise<void>;
  };
}

function BlockTagTrigger({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return (
      <IconAction
        icon={<TagIcon className="size-3" />}
        label={<Trans id="workspace.tags.assign.button">Assign tags</Trans>}
      />
    );
  }

  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = tags.length - visibleTags.length;

  return (
    <IconAction
      className="p-1"
      size="xs"
      icon={
        <AvatarGroup className="-space-x-1.5" aria-hidden="true">
          {visibleTags.map((tag) => (
            <TagAvatar key={tag.id} tag={tag} />
          ))}
          {hiddenTagCount > 0 ? (
            <AvatarGroupCount className="size-3 text-[0.625rem]">
              +{hiddenTagCount}
            </AvatarGroupCount>
          ) : null}
        </AvatarGroup>
      }
      label={<Trans id="workspace.tags.assign.button">Assign tags</Trans>}
    ></IconAction>
  );
}

export function BlockTagActions({ block, className, state, handlers }: BlockTagActionsProps) {
  const { i18n } = useLingui();
  const { tags, disabled, pending = false } = state;

  return (
    <div className={cn("shrink-0", className)}>
      <TagComboboxPopover
        disabled={disabled}
        isCreatingTag={pending}
        placeholder={i18n._({
          id: "workspace.tags.assign.placeholder",
          message: "Search or assign tags",
        })}
        selectedTagIds={block.tags.map((tag) => tag.id)}
        tags={tags}
        onCreateTag={handlers.onCreateTag}
        onSelectedTagIdsChange={handlers.onAssignTags}
        nativeButton={false}
      >
        <AdornmentBar>
          <BlockTagTrigger tags={block.tags} />
        </AdornmentBar>
      </TagComboboxPopover>
    </div>
  );
}
