import { describe, expect, it } from "vite-plus/test";

import { getShikiThemeName } from "./code-shiki-theme-decorator";

describe("code shiki theme decorator", () => {
  it("maps resolved app theme to shiki theme", () => {
    expect(getShikiThemeName("light")).toBe("vitesse-light");
    expect(getShikiThemeName("dark")).toBe("vitesse-dark");
  });
});
