import { describe, expect, it } from "vite-plus/test";

import { helloEditor } from "../src/index.ts";

describe("helloEditor", () => {
  it("returns the editor greeting", () => {
    expect(helloEditor()).toBe("Hello editor");
  });
});
