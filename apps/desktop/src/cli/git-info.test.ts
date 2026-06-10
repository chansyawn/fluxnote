import { describe, expect, it, vi } from "vite-plus/test";

import { resolveGitInfo } from "./git-info";

describe("resolveGitInfo", () => {
  it("returns the repository root and branch", async () => {
    const runGit = vi.fn(async (args: readonly string[]) =>
      args.includes("--show-toplevel") ? "/repo" : "feature/x",
    );

    await expect(resolveGitInfo("/repo/sub", { runGit })).resolves.toEqual({
      branch: "feature/x",
      root: "/repo",
    });
  });

  it("returns null when the directory is not a git repository", async () => {
    const runGit = vi.fn(async () => {
      throw new Error("not a git repository");
    });

    await expect(resolveGitInfo("/tmp", { runGit })).resolves.toBeNull();
  });

  it("returns a null branch for a detached HEAD", async () => {
    const runGit = vi.fn(async (args: readonly string[]) =>
      args.includes("--show-toplevel") ? "/repo" : "HEAD",
    );

    await expect(resolveGitInfo("/repo", { runGit })).resolves.toEqual({
      branch: null,
      root: "/repo",
    });
  });

  it("returns a null branch when branch resolution fails", async () => {
    const runGit = vi.fn(async (args: readonly string[]) => {
      if (args.includes("--show-toplevel")) {
        return "/repo";
      }
      throw new Error("no HEAD yet");
    });

    await expect(resolveGitInfo("/repo", { runGit })).resolves.toEqual({
      branch: null,
      root: "/repo",
    });
  });
});
