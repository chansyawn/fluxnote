import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { MacAccessibilityTargetMetadata } from "@fluxnotes/mac-native";

const execFileAsync = promisify(execFile);

const RECORD_SEPARATOR = "";

type BrowserFlavor = "chromium" | "safari";

const KNOWN_BROWSERS = new Map<string, BrowserFlavor>([
  ["com.apple.Safari", "safari"],
  ["com.apple.SafariTechnologyPreview", "safari"],
  ["com.google.Chrome", "chromium"],
  ["com.google.Chrome.canary", "chromium"],
  ["com.microsoft.edgemac", "chromium"],
  ["com.brave.Browser", "chromium"],
  ["company.thebrowser.Browser", "chromium"],
  ["com.vivaldi.Vivaldi", "chromium"],
  ["org.mozilla.firefox", "chromium"],
]);

export interface BrowserMetadata {
  title: string | null;
  url: string | null;
}

export interface BrowserMetadataDeps {
  runAppleScript: (script: string) => Promise<string>;
}

const defaultRunAppleScript = async (script: string): Promise<string> => {
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return stdout;
};

const defaultDeps: BrowserMetadataDeps = {
  runAppleScript: defaultRunAppleScript,
};

function activeTabScript(appName: string, flavor: BrowserFlavor): string {
  const tabExpression =
    flavor === "safari"
      ? "{URL of current tab of front window, name of current tab of front window}"
      : "{URL of active tab of front window, title of active tab of front window}";
  return [
    `tell application "${appName}"`,
    `set tabInfo to ${tabExpression}`,
    `return (item 1 of tabInfo) & "${RECORD_SEPARATOR}" & (item 2 of tabInfo)`,
    "end tell",
  ].join("\n");
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function resolveBrowserMetadata(
  target: MacAccessibilityTargetMetadata,
  deps: BrowserMetadataDeps = defaultDeps,
): Promise<BrowserMetadata | null> {
  const flavor = target.appBundleId ? KNOWN_BROWSERS.get(target.appBundleId) : undefined;
  if (!flavor || !target.appName) {
    return null;
  }

  let url: string | null;
  let title: string | null;
  try {
    const output = await deps.runAppleScript(activeTabScript(target.appName, flavor));
    const [rawUrl, rawTitle] = output.split(RECORD_SEPARATOR);
    url = nonEmpty(rawUrl);
    title = nonEmpty(rawTitle);
  } catch {
    return null;
  }

  if (!url) {
    return null;
  }

  return { title, url };
}
