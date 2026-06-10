import { net } from "electron";

const FETCH_TIMEOUT_MS = 1_500;

export interface FetchFaviconDeps {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const defaultDeps: FetchFaviconDeps = {
  fetch: (input, init) => net.fetch(input, init),
};

async function fetchWithTimeout(resource: string, deps: FetchFaviconDeps): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await deps.fetch(resource, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(resource: string, deps: FetchFaviconDeps): Promise<string> {
  const response = await fetchWithTimeout(resource, deps);
  if (!response.ok) {
    throw new Error(`Unexpected status ${response.status}`);
  }
  return await response.text();
}

async function fetchAsDataUrl(resource: string, deps: FetchFaviconDeps): Promise<string | null> {
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

async function collectFaviconCandidates(origin: string, deps: FetchFaviconDeps): Promise<string[]> {
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

export async function fetchFavicon(
  url: string,
  deps: FetchFaviconDeps = defaultDeps,
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
