import { cn } from "@fluxnotes/ui/lib/utils";
import { cloneElement, isValidElement, type ComponentProps, type ReactElement } from "react";

interface AdornmentBarProps {
  disabled?: boolean;
  render?: ReactElement<ComponentProps<"div"> & Record<string, unknown>>;
}

export function AdornmentBar({
  children,
  className,
  disabled,
  render,
  ...props
}: ComponentProps<"div"> & AdornmentBarProps) {
  const barProps = {
    "aria-disabled": disabled,
    className: cn(
      "bg-card rounded-lg border h-5.5",
      disabled && "pointer-events-none opacity-75",
      className,
    ),
    ...props,
  };

  if (isValidElement<ComponentProps<"div"> & Record<string, unknown>>(render)) {
    return cloneElement(render, {
      ...barProps,
      className: cn(barProps.className, render.props.className),
      children,
    });
  }

  return <div {...barProps}>{children}</div>;
}
