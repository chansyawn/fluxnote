import type { Tag } from "@renderer/clients";
import { Avatar, AvatarFallback } from "@renderer/ui/components/avatar";
import { cn } from "@renderer/ui/lib/utils";
import { TagIcon as DefaultTagIcon } from "lucide-react";

import { getTagDisplayColor } from "./tag-color";
import { TAG_LUCIDE_ICON_COMPONENTS, TAG_SIMPLE_ICON_COMPONENTS } from "./tag-icon-options";

interface TagAvatarProps {
  tag: Pick<Tag, "icon" | "name"> & Partial<Pick<Tag, "color">>;
  className?: string;
  size?: "default" | "sm" | "lg";
}

function getTagIconParts(icon: string | null): [string, string] | null {
  if (!icon) {
    return null;
  }

  const [kind, id, ...rest] = icon.split(":");
  if (rest.length > 0 || !id) {
    return null;
  }

  return [kind, id];
}

function TagIconGlyph({ icon, color }: { icon: string | null; color: string }) {
  const iconParts = getTagIconParts(icon);
  if (!iconParts) {
    return null;
  }

  const [kind, id] = iconParts;
  if (kind === "lucide" && id in TAG_LUCIDE_ICON_COMPONENTS) {
    const Icon = TAG_LUCIDE_ICON_COMPONENTS[id as keyof typeof TAG_LUCIDE_ICON_COMPONENTS];
    return <Icon aria-hidden="true" className="size-3" />;
  }

  if (kind === "simpleicon" && id in TAG_SIMPLE_ICON_COMPONENTS) {
    const simpleIcon = TAG_SIMPLE_ICON_COMPONENTS[id as keyof typeof TAG_SIMPLE_ICON_COMPONENTS];
    return (
      <svg aria-hidden="true" className="size-3" role="img" viewBox="0 0 24 24" fill={color}>
        <path d={simpleIcon.path} />
      </svg>
    );
  }

  return <DefaultTagIcon aria-hidden="true" className="size-3" />;
}

export function TagAvatar({ tag, className }: TagAvatarProps) {
  const hasIcon = tag.icon !== null;
  const color = getTagDisplayColor(tag);

  return (
    <Avatar className={cn("bg-background size-3", className)} title={tag.name}>
      <AvatarFallback
        className={cn("font-medium", hasIcon ? "bg-background" : "text-primary-foreground")}
        style={{
          backgroundColor: hasIcon ? undefined : color,
          color: hasIcon ? color : undefined,
        }}
      >
        {hasIcon ? <TagIconGlyph icon={tag.icon} color={color} /> : null}
      </AvatarFallback>
    </Avatar>
  );
}
