import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { GitRepositoryInfo } from "@shared/features/external-edit/models";

const execFileAsync = promisify(execFile);

export type RunGit = (args: readonly string[], cwd: string) => Promise<string>;

export interface GitInfoDeps {
  runGit: RunGit;
}

const defaultRunGit: RunGit = async (args, cwd) => {
  const { stdout } = await execFileAsync("git", [...args], { cwd });
  return stdout.trim();
};

const defaultDeps: GitInfoDeps = {
  runGit: defaultRunGit,
};

export async function resolveGitInfo(
  cwd: string,
  deps: GitInfoDeps = defaultDeps,
): Promise<GitRepositoryInfo | null> {
  let root: string;
  try {
    root = await deps.runGit(["rev-parse", "--show-toplevel"], cwd);
  } catch {
    return null;
  }
  if (!root) {
    return null;
  }

  const branch = await deps
    .runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd)
    .then((value) => (value && value !== "HEAD" ? value : null))
    .catch(() => null);

  return { branch, root };
}
