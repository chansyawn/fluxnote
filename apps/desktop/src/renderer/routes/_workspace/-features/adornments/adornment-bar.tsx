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
          "bg-card rounded-lg border h-5.5",
          disabled && "pointer-events-none opacity-75",
          className,
        ),
      },
      props,
    ),
    render,
  });
}
