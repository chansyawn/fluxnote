import { describe, it } from "vitest";

import { expectMarkdownRoundTripStable } from "../../test-helper/assertions";

describe("table", () => {
  it("round-trips a simple table", () => {
    const markdown = ["| h1 | h2 |", "| -- | -- |", "| a  | b  |", ""].join("\n");
    expectMarkdownRoundTripStable(markdown);
  });

  it("round-trips a table with column alignment", () => {
    const markdown = [
      "| left | center | right |",
      "| :--- | :----: | ----: |",
      "| a    | b      | c     |",
      "",
    ].join("\n");
    expectMarkdownRoundTripStable(markdown);
  });
});
