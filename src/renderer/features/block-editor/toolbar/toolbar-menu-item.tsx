import { formatShortcutTokens } from "@renderer/features/shortcut/shortcut-utils";
import { DropdownMenuItem, DropdownMenuRadioItem } from "@renderer/ui/components/dropdown-menu";
import { Kbd, KbdGroup } from "@renderer/ui/components/kbd";
import { cn } from "@renderer/ui/lib/utils";

import type { BlockEditorShortcutBinding } from "./types";

interface ToolbarMenuItemContentProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  shortcut?: BlockEditorShortcutBinding;
}

function ToolbarMenuItemContent({ icon: Icon, label, shortcut }: ToolbarMenuItemContentProps) {
  const shortcutTokens = formatShortcutTokens(shortcut ?? null);

  return (
    <>
      <Icon />
      <span className="min-w-0 flex-1">{label}</span>
      {shortcutTokens.length > 0 ? (
        <KbdGroup className="ms-auto ps-3">
          {shortcutTokens.map((token, index) => (
            <Kbd key={`${label}-${token}-${index}`}>{token}</Kbd>
          ))}
        </KbdGroup>
      ) : null}
    </>
  );
}

interface ToolbarMenuItemProps extends ToolbarMenuItemContentProps {
  active?: boolean;
  onSelect: () => void;
}

export function ToolbarMenuItem({
  active = false,
  icon,
  label,
  shortcut,
  onSelect,
}: ToolbarMenuItemProps) {
  return (
    <DropdownMenuItem
      className={cn("min-w-44", active ? "text-foreground" : "text-muted-foreground")}
      onClick={onSelect}
    >
      <ToolbarMenuItemContent icon={icon} label={label} shortcut={shortcut} />
    </DropdownMenuItem>
  );
}

interface ToolbarRadioMenuItemProps extends ToolbarMenuItemContentProps {
  value: string;
}

export function ToolbarRadioMenuItem({ icon, label, shortcut, value }: ToolbarRadioMenuItemProps) {
  return (
    <DropdownMenuRadioItem className="min-w-44" value={value}>
      <ToolbarMenuItemContent icon={icon} label={label} shortcut={shortcut} />
    </DropdownMenuRadioItem>
  );
}
