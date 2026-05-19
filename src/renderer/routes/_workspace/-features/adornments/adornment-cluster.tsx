import { cn } from "@renderer/ui/lib/utils";
import type { ComponentProps } from "react";

export function AdornmentCluster({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex min-w-0 items-center gap-1.5", className)} {...props} />;
}
