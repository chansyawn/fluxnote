import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { net, protocol } from "electron";

import type { BackendStore } from "../backend-store";

export function registerAssetProtocol(store: BackendStore): void {
  protocol.handle("assets", async (request) => {
    try {
      const requestUrl = new URL(request.url);
      const blockId = decodeURIComponent(requestUrl.hostname);
      const rawPath = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, ""));
      if (!blockId || !rawPath) {
        return new Response("Invalid asset url", { status: 400 });
      }

      const normalizedPath = path.normalize(rawPath);
      if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
        return new Response("Invalid asset path", { status: 400 });
      }

      const blockDir = path.resolve(store.getAssetPathForBlock(blockId));
      const assetPath = path.resolve(path.join(blockDir, normalizedPath));
      if (!assetPath.startsWith(`${blockDir}${path.sep}`) && assetPath !== blockDir) {
        return new Response("Invalid asset path", { status: 400 });
      }

      await fs.stat(assetPath);
      return await net.fetch(pathToFileURL(assetPath).toString());
    } catch (error) {
      return new Response("Asset not found", {
        status: (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500,
      });
    }
  });
}
