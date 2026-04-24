import { invokeCommand } from "@renderer/app/invoke";

interface LazyStoreOptions {
  defaults?: Record<string, unknown>;
}

interface ReloadOptions {
  ignoreDefaults?: boolean;
}

export class LazyStore {
  private readonly defaults: Record<string, unknown>;
  private snapshot: Record<string, unknown> | null = null;

  constructor(_name: string, options: LazyStoreOptions = {}) {
    this.defaults = options.defaults ?? {};
  }

  async init(): Promise<void> {
    if (this.snapshot) {
      return;
    }

    this.snapshot = await this.readCurrentState();
  }

  async reload(_options?: ReloadOptions): Promise<void> {
    this.snapshot = await this.readCurrentState();
  }

  async get<TValue>(key: string): Promise<TValue | undefined> {
    await this.init();
    return this.snapshot?.[key] as TValue | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.init();
    this.snapshot = {
      ...(this.snapshot ?? this.defaults),
      [key]: value,
    };
  }

  async save(): Promise<void> {
    await this.init();
    const nextValue = this.snapshot ?? this.defaults;
    await invokeCommand("preferencesWrite", nextValue);
  }

  private async readCurrentState(): Promise<Record<string, unknown>> {
    return await invokeCommand("preferencesRead", undefined);
  }
}
