import { describe, expect, it } from "vite-plus/test";

import { getSqliteChangedRows, isSqliteUniqueConstraint, nowIsoString } from "./utils";

describe("database utils", () => {
  it("returns ISO string", () => {
    const value = nowIsoString();

    expect(typeof value).toBe("string");
    expect(new Date(value).toString()).not.toBe("Invalid Date");
  });

  it("detects unique constraint error", () => {
    expect(isSqliteUniqueConstraint(new Error("UNIQUE constraint failed: tags.name"))).toBe(true);
    expect(isSqliteUniqueConstraint(new Error("other"))).toBe(false);
    expect(isSqliteUniqueConstraint("bad")).toBe(false);
  });

  it("reads changes from unknown result", () => {
    expect(getSqliteChangedRows({ changes: 3 })).toBe(3);
    expect(getSqliteChangedRows({ changes: "3" })).toBe(0);
    expect(getSqliteChangedRows({})).toBe(0);
  });
});
