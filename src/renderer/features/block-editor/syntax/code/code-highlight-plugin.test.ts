import { describe, expect, it } from "vite-plus/test";

import { getShikiThemeName } from "./code-highlight-plugin";

describe("code highlight plugin", () => {
  it("maps resolved app theme to shiki theme", () => {
    expect(getShikiThemeName("light")).toBe("vitesse-light");
    expect(getShikiThemeName("dark")).toBe("vitesse-dark");
  });
});
