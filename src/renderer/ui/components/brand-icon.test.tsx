// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { siGithub } from "simple-icons";
import { describe, expect, it } from "vite-plus/test";

import { BrandIcon } from "./brand-icon";

describe("BrandIcon", () => {
  it("renders a decorative Simple Icon with the current text color", () => {
    const { container } = render(<BrandIcon data-testid="brand-icon" icon={siGithub} />);

    expect(screen.getByTestId("brand-icon")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("path")).toHaveAttribute("d", siGithub.path);
    expect(container.querySelector("path")).toHaveAttribute("fill", "currentColor");
  });

  it("uses the Simple Icon brand color when requested", () => {
    const { container } = render(<BrandIcon brandColor icon={siGithub} />);

    expect(container.querySelector("path")).toHaveAttribute("fill", `#${siGithub.hex}`);
  });

  it("exposes an accessible name when the icon is not decorative", () => {
    render(<BrandIcon icon={siGithub} label="GitHub" />);

    expect(screen.getByRole("img", { name: "GitHub" })).toBeVisible();
  });

  it("passes through SVG props", () => {
    render(
      <BrandIcon
        className="text-muted-foreground size-4"
        data-testid="brand-icon"
        icon={siGithub}
      />,
    );

    expect(screen.getByTestId("brand-icon")).toHaveClass("size-4");
    expect(screen.getByTestId("brand-icon")).toHaveAttribute("data-slot", "brand-icon");
  });
});
