import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { DirectionProvider } from "../components/direction";

type RenderWithDirectionOptions = RenderOptions & {
  direction?: "ltr" | "rtl";
};

const renderWithDirection = (
  ui: ReactElement,
  { direction = "ltr", ...options }: RenderWithDirectionOptions = {},
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <DirectionProvider direction={direction}>{children}</DirectionProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

export { renderWithDirection, type RenderWithDirectionOptions };
