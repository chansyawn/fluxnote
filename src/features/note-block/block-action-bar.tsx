import type { ReactNode } from "react";

import { ButtonGroup } from "@/ui/components/button-group";

interface BlockActionBarProps {
  children: ReactNode;
}

export function BlockActionBar({ children }: BlockActionBarProps) {
  return (
    <ButtonGroup className="border-border/70 bg-card/95 rounded-lg border p-0.25">
      {children}
    </ButtonGroup>
  );
}
