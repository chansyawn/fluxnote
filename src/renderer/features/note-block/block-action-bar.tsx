import { ButtonGroup } from "@renderer/ui/components/button-group";
import { cn } from "@renderer/ui/lib/utils";
import type { ReactNode } from "react";

interface BlockActionBarProps {
  children: ReactNode;
  disabled?: boolean;
}

export function BlockActionBar({ children, disabled = false }: BlockActionBarProps) {
  return (
    <ButtonGroup
      aria-disabled={disabled}
      className={cn(
        "border-border/70 bg-card/95 rounded-lg border p-0.25",
        disabled && "pointer-events-none opacity-75",
      )}
    >
      {children}
    </ButtonGroup>
  );
}
