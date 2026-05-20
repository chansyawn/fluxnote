import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { Tag, UpdateTagRequest } from "@renderer/clients";
import { Button } from "@renderer/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderer/ui/components/dialog";
import { Input } from "@renderer/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/ui/components/select";
import { LoaderCircleIcon, PaletteIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { getTagDisplayColor } from "./tag-color";
import { TagAvatar } from "./tag-icon";
import {
  TAG_LUCIDE_ICON_COMPONENTS,
  TAG_LUCIDE_ICON_OPTIONS,
  TAG_SIMPLE_ICON_COMPONENTS,
  TAG_SIMPLE_ICON_OPTIONS,
  type TagIconOption,
} from "./tag-icon-options";

type IconMode = "rgb" | "lucide" | "simpleicon";

interface TagEditDialogProps {
  tag: Tag | null;
  open: boolean;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (req: UpdateTagRequest) => Promise<void>;
}

function getIconMode(icon: string | null): IconMode {
  if (!icon) {
    return "rgb";
  }

  return icon.startsWith("simpleicon:") ? "simpleicon" : "lucide";
}

function getIconId(icon: string | null, mode: IconMode): string {
  if (!icon || mode === "rgb") {
    return mode === "simpleicon" ? TAG_SIMPLE_ICON_OPTIONS[0].id : TAG_LUCIDE_ICON_OPTIONS[0].id;
  }

  return icon.split(":")[1] ?? "";
}

function getIconValue(mode: IconMode, iconId: string): UpdateTagRequest["icon"] {
  if (mode === "rgb") {
    return null;
  }

  return `${mode}:${iconId}` as UpdateTagRequest["icon"];
}

function IconOptionPreview({ option }: { option: TagIconOption }) {
  if (option.value.startsWith("lucide:")) {
    const Icon = TAG_LUCIDE_ICON_COMPONENTS[option.id as keyof typeof TAG_LUCIDE_ICON_COMPONENTS];
    return <Icon aria-hidden="true" />;
  }

  const simpleIcon =
    TAG_SIMPLE_ICON_COMPONENTS[option.id as keyof typeof TAG_SIMPLE_ICON_COMPONENTS];
  return (
    <svg aria-hidden="true" role="img" viewBox="0 0 24 24">
      <path d={simpleIcon.path} />
    </svg>
  );
}

export function TagEditDialog({
  tag,
  open,
  pending = false,
  onOpenChange,
  onSubmit,
}: TagEditDialogProps) {
  const { i18n } = useLingui();
  const nameInputId = useId();
  const colorInputId = useId();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748B");
  const [iconMode, setIconMode] = useState<IconMode>("rgb");
  const [iconId, setIconId] = useState(TAG_LUCIDE_ICON_OPTIONS[0].id);

  useEffect(() => {
    if (!tag || !open) {
      return;
    }

    const nextIconMode = getIconMode(tag.icon);
    setName(tag.name);
    setColor(getTagDisplayColor(tag));
    setIconMode(nextIconMode);
    setIconId(getIconId(tag.icon, nextIconMode));
  }, [open, tag]);

  const iconOptions = iconMode === "simpleicon" ? TAG_SIMPLE_ICON_OPTIONS : TAG_LUCIDE_ICON_OPTIONS;
  const previewTag = useMemo(
    () =>
      ({
        color,
        icon: getIconValue(iconMode, iconId),
        name,
      }) satisfies Pick<Tag, "color" | "icon" | "name">,
    [color, iconId, iconMode, name],
  );
  const normalizedName = name.trim();
  const colorValid = /^#[0-9A-Fa-f]{6}$/.test(color);
  const colorPickerValue = colorValid ? color : "#000000";
  const canSubmit = Boolean(tag) && normalizedName.length > 0 && colorValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans id="workspace.tags.edit.title">Edit tag</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="workspace.tags.edit.description">Change the tag name, color, or icon.</Trans>
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!tag || !canSubmit || pending) {
              return;
            }

            void onSubmit({
              tagId: tag.id,
              name: normalizedName,
              color,
              icon: getIconValue(iconMode, iconId),
            });
          }}
        >
          <div className="flex items-center gap-3">
            <TagAvatar tag={previewTag} size="default" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label className="text-xs font-medium" htmlFor={nameInputId}>
                <Trans id="workspace.tags.edit.name">Name</Trans>
              </label>
              <Input
                id={nameInputId}
                value={name}
                aria-invalid={normalizedName.length === 0}
                disabled={pending}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor={colorInputId}>
              <Trans id="workspace.tags.edit.color">Color</Trans>
            </label>
            <div className="flex items-center gap-2">
              <Input
                id={colorInputId}
                className="w-28"
                value={color}
                aria-invalid={!colorValid}
                disabled={pending}
                onChange={(event) => {
                  setColor(event.target.value);
                }}
              />
              <input
                aria-label={i18n._({
                  id: "workspace.tags.edit.color-picker",
                  message: "Tag color",
                })}
                className="border-input bg-input/20 size-7 rounded-md border p-0.5"
                disabled={pending}
                type="color"
                value={colorPickerValue}
                onChange={(event) => {
                  setColor(event.target.value.toLocaleUpperCase());
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">
              <Trans id="workspace.tags.edit.icon-mode">Icon</Trans>
            </span>
            <div className="flex items-center gap-2">
              <Select
                items={[
                  { value: "rgb", label: "RGB" },
                  { value: "lucide", label: "Lucide" },
                  { value: "simpleicon", label: "Simple Icons" },
                ]}
                value={iconMode}
                onValueChange={(value) => {
                  if (value === "rgb" || value === "lucide" || value === "simpleicon") {
                    setIconMode(value);
                    setIconId(getIconId(null, value));
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem value="rgb">
                      <PaletteIcon aria-hidden="true" />
                      <Trans id="workspace.tags.edit.icon-mode.rgb">RGB</Trans>
                    </SelectItem>
                    <SelectItem value="lucide">
                      <PaletteIcon aria-hidden="true" />
                      <Trans id="workspace.tags.edit.icon-mode.lucide">Lucide</Trans>
                    </SelectItem>
                    <SelectItem value="simpleicon">
                      <PaletteIcon aria-hidden="true" />
                      <Trans id="workspace.tags.edit.icon-mode.simpleicon">Simple Icons</Trans>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {iconMode === "rgb" ? null : (
                <Select
                  items={iconOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  value={iconId}
                  onValueChange={(value) => {
                    if (value) {
                      setIconId(value);
                    }
                  }}
                >
                  <SelectTrigger className="min-w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    <SelectGroup>
                      {iconOptions.map((option) => (
                        <SelectItem key={option.value} value={option.id}>
                          <IconOptionPreview option={option} />
                          <span>{option.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter className="pt-1">
            <Button disabled={!canSubmit || pending} size="sm" type="submit">
              {pending ? (
                <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
              ) : null}
              <Trans id="workspace.tags.edit.save">Save</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
