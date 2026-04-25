import path from "node:path";

import { app } from "electron";
import ElectronStore from "electron-store";

type StoreSnapshot = Record<string, unknown>;

const stores = new Map<string, ElectronStore<StoreSnapshot>>();

function toStoreSnapshot(value: unknown): StoreSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as StoreSnapshot;
}

function normalizeStoreConfig(name: string): { fileExtension: string; name: string } {
  const normalizedName = path.basename(name.trim() || "settings.json");
  const dotIndex = normalizedName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex >= normalizedName.length - 1) {
    return {
      fileExtension: "json",
      name: normalizedName,
    };
  }

  return {
    fileExtension: normalizedName.slice(dotIndex + 1),
    name: normalizedName.slice(0, dotIndex),
  };
}

export function getConfigStore(name: string, defaults: unknown): ElectronStore<StoreSnapshot> {
  const cacheKey = path.basename(name.trim() || "settings.json");
  const existingStore = stores.get(cacheKey);
  if (existingStore) {
    return existingStore;
  }

  const { fileExtension, name: storeName } = normalizeStoreConfig(cacheKey);
  const store = new ElectronStore<StoreSnapshot>({
    clearInvalidConfig: false,
    cwd: app.getPath("userData"),
    defaults: toStoreSnapshot(defaults) ?? {},
    fileExtension,
    name: storeName,
  });
  stores.set(cacheKey, store);
  return store;
}
