"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type ToasterTheme = NonNullable<ToasterProps["theme"]>;
type ToasterStyle = CSSProperties & Record<`--${string}`, string>;

type FluxnotesToasterProps = Omit<ToasterProps, "theme"> & {
  theme: ToasterTheme;
};

const toasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} satisfies ToasterStyle;

const Toaster = ({ style, toastOptions, theme, ...props }: FluxnotesToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={{ ...toasterStyle, ...style }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, type FluxnotesToasterProps, type ToasterTheme };
