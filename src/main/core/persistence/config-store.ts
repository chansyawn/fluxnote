import path from "node:path";

import { APP_SETTINGS_STORE_FILE } from "@shared/app/app-config";
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
  const normalizedName = path.basename(name.trim() || APP_SETTINGS_STORE_FILE);
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

export function getConfigStore(
  userDataPath: string,
  name: string,
  defaults: unknown,
): ElectronStore<StoreSnapshot> {
  const storeName = path.basename(name.trim() || APP_SETTINGS_STORE_FILE);
  const cacheKey = `${userDataPath}:${storeName}`;
  const existingStore = stores.get(cacheKey);
  if (existingStore) {
    return existingStore;
  }

  const { fileExtension, name: normalizedStoreName } = normalizeStoreConfig(storeName);
  const store = new ElectronStore<StoreSnapshot>({
    clearInvalidConfig: false,
    cwd: userDataPath,
    defaults: toStoreSnapshot(defaults) ?? {},
    fileExtension,
    name: normalizedStoreName,
  });
  stores.set(cacheKey, store);
  return store;
}
