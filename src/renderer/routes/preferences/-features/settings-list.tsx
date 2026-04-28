import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@renderer/ui/components/item";
import { Separator } from "@renderer/ui/components/separator";
import { cn } from "@renderer/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Children, Fragment, isValidElement, type ReactNode } from "react";

interface SettingsSectionProps {
  title: ReactNode;
  children: ReactNode;
}

interface SettingsGroupProps {
  children: ReactNode;
}

interface SettingsRowProps {
  icon: LucideIcon;
  label: ReactNode;
  control: ReactNode;
  description?: ReactNode;
  className?: string;
  controlClassName?: string;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="ps-1 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SettingsGroup({ children }: SettingsGroupProps) {
  const rows = Children.toArray(children);

  return (
    <ItemGroup className="bg-muted/90 gap-0 overflow-hidden rounded-lg">
      {rows.map((row, index) => {
        const rowKey = isValidElement(row) ? row.key : index;

        return (
          <Fragment key={rowKey}>
            {row}
            {index < rows.length - 1 ? <Separator className="bg-border/70" /> : null}
          </Fragment>
        );
      })}
    </ItemGroup>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  control,
  description,
  className,
  controlClassName,
}: SettingsRowProps) {
  return (
    <Item
      className={cn(
        "flex-nowrap rounded-none border-none",
        description ? "min-h-14 py-2" : "h-10",
        className,
      )}
    >
      <ItemMedia
        className="text-foreground group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center"
        variant="icon"
      >
        <Icon aria-hidden="true" className="size-3.5" />
      </ItemMedia>
      <ItemContent className="min-w-0 flex-1 gap-0">
        <ItemTitle className="w-full truncate font-medium">{label}</ItemTitle>
        {description ? (
          <ItemDescription className="w-full truncate">{description}</ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions className={cn("ms-auto shrink-0 justify-end", controlClassName)}>
        {control}
      </ItemActions>
    </Item>
  );
}

export { SettingsGroup, SettingsRow, SettingsSection };
