import { HoverCard, HoverCardContent, HoverCardTrigger } from "@renderer/ui/components/hover-card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@renderer/ui/components/item";
import { Separator } from "@renderer/ui/components/separator";
import { cn } from "@renderer/ui/lib/utils";
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type SVGProps,
} from "react";

interface PreferencesSectionProps {
  title: ReactNode;
  children: ReactNode;
}

interface PreferencesGroupProps {
  children: ReactNode;
}

type PreferencesRowIcon = ReactElement<SVGProps<SVGSVGElement>>;

interface PreferencesRowProps {
  icon: PreferencesRowIcon;
  label: ReactNode;
  control: ReactNode;
  description?: ReactNode;
  className?: string;
  controlClassName?: string;
}

function PreferencesSection({ title, children }: PreferencesSectionProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="ps-1 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function PreferencesGroup({ children }: PreferencesGroupProps) {
  const rows = Children.toArray(children);

  return (
    <ItemGroup className="bg-secondary/90 gap-0 overflow-hidden rounded-lg border">
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

function PreferencesRow({
  icon,
  label,
  control,
  description,
  className,
  controlClassName,
}: PreferencesRowProps) {
  return (
    <Item className={cn("h-10 flex-nowrap rounded-none border-none", className)}>
      <ItemMedia className="text-foreground" variant="icon">
        {cloneElement(icon, {
          "aria-hidden": true,
          className: cn("size-3.5", icon.props.className),
        })}
      </ItemMedia>
      <ItemContent className="min-w-0 flex-1 gap-0">
        <HoverCard>
          <ItemTitle className="w-full">
            <HoverCardTrigger
              delay={100}
              closeDelay={200}
              className={cn(
                "truncate text-start outline-hidden",
                description
                  ? "decoration-ring decoration-dashed underline underline-offset-3"
                  : undefined,
              )}
            >
              {label}
            </HoverCardTrigger>
          </ItemTitle>
          {description ? (
            <HoverCardContent side="top">
              <p className="font-semibold">{label}</p>
              <p>{description}</p>
            </HoverCardContent>
          ) : null}
        </HoverCard>
      </ItemContent>
      <ItemActions className={cn("ms-auto shrink-0 justify-end", controlClassName)}>
        {control}
      </ItemActions>
    </Item>
  );
}

export { PreferencesGroup, PreferencesRow, PreferencesSection };
