import type { SVGProps } from "react";
import type { SimpleIcon } from "simple-icons";

interface BrandIconProps extends SVGProps<SVGSVGElement> {
  icon: SimpleIcon;
  label?: string;
  brandColor?: boolean;
}

function BrandIcon({ brandColor, icon, label, ...props }: BrandIconProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      data-slot="brand-icon"
      height="1em"
      role={label ? "img" : undefined}
      viewBox="0 0 24 24"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {label ? <title>{label}</title> : null}
      <path d={icon.path} fill={brandColor ? `#${icon.hex}` : "currentColor"} />
    </svg>
  );
}

export { BrandIcon, type BrandIconProps };
