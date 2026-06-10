import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { MacAccessibilityTargetMetadata } from "@fluxnotes/mac-native";
import { net } from "electron";

const execFileAsync = promisify(execFile);

const FETCH_TIMEOUT_MS = 1_500;
const RECORD_SEPARATOR = "\u001f";

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
  faviconDataUrl: string | null;
  title: string | null;
  url: string | null;
}

export interface BrowserMetadataDeps {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  runAppleScript: (script: string) => Promise<string>;
}

const defaultRunAppleScript = async (script: string): Promise<string> => {
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return stdout;
};

const defaultDeps: BrowserMetadataDeps = {
  fetch: (input, init) => net.fetch(input, init),
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

async function resolveFaviconDataUrl(
  url: string,
  deps: BrowserMetadataDeps,
): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return null;
  }

  const candidates = await collectFaviconCandidates(origin, deps);
  for (const candidate of candidates) {
    const dataUrl = await fetchAsDataUrl(candidate, deps);
    if (dataUrl) {
      return dataUrl;
    }
  }
  return null;
}

async function collectFaviconCandidates(
  origin: string,
  deps: BrowserMetadataDeps,
): Promise<string[]> {
  const fallback = `${origin}/favicon.ico`;
  try {
    const html = await fetchText(origin, deps);
    const match = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i);
    const href = match?.[1];
    if (href) {
      return [new URL(href, origin).toString(), fallback];
    }
  } catch {
    // Best-effort: fall back to the conventional location.
  }
  return [fallback];
}

async function fetchWithTimeout(resource: string, deps: BrowserMetadataDeps): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await deps.fetch(resource, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(resource: string, deps: BrowserMetadataDeps): Promise<string> {
  const response = await fetchWithTimeout(resource, deps);
  if (!response.ok) {
    throw new Error(`Unexpected status ${response.status}`);
  }
  return await response.text();
}

async function fetchAsDataUrl(resource: string, deps: BrowserMetadataDeps): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(resource, deps);
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "image/x-icon";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) {
      return null;
    }
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
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

  const faviconDataUrl = await resolveFaviconDataUrl(url, deps);
  return { faviconDataUrl, title, url };
}
