import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@renderer/ui/lib/utils";

interface AdornmentBarProps {
  disabled?: boolean;
}

export function AdornmentBar({
  className,
  disabled,
  render,
  ...props
}: useRender.ComponentProps<"div"> & AdornmentBarProps) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        "aria-disabled": disabled,
        className: cn(
          "border-border/70 bg-card/95 rounded-lg border p-0.25",
          disabled && "pointer-events-none opacity-75",
          className,
        ),
      },
      props,
    ),
    render,
  });
}
