import { createRequire } from "node:module";

export type MacNativeErrorCode =
  | "ACCESSIBILITY.ACTIVATE_FAILED"
  | "ACCESSIBILITY.PERMISSION_REQUIRED"
  | "ACCESSIBILITY.SECURE_TEXT_FIELD"
  | "ACCESSIBILITY.WRITE_BACK_FAILED"
  | "NATIVE.ADDON_LOAD_FAILED"
  | "NATIVE.INTERNAL"
  | "NATIVE.INVALID_PAYLOAD"
  | "NATIVE.SESSION_LIMIT_EXCEEDED"
  | "NATIVE.SESSION_NOT_FOUND"
  | "NATIVE.UNSUPPORTED_PLATFORM";

export type MacAccessibilityCopyOnlyReason =
  | "NO_EDITABLE_ELEMENT"
  | "SEARCH_BUDGET_EXHAUSTED"
  | "UNSUPPORTED_ELEMENT";

export interface MacAccessibilityTargetMetadata {
  appBundleId: string | null;
  appIcon: string | null;
  appName: string | null;
  elementRole: string | null;
  processId: number;
}

export type MacAccessibilityCaptureResult =
  | {
      content: string;
      mode: "write_back";
      sessionId: string;
      target: MacAccessibilityTargetMetadata;
    }
  | {
      content: "";
      mode: "copy_only";
      reason: MacAccessibilityCopyOnlyReason;
      target: MacAccessibilityTargetMetadata;
    };

export interface MacAccessibilityNative {
  activate: (processId: number) => Promise<void>;
  capture: () => Promise<MacAccessibilityCaptureResult>;
  closeSession: (sessionId: string) => Promise<void>;
  isAccessibilityTrusted: (prompt: boolean) => boolean;
  isSupported: () => boolean;
  writeBack: (sessionId: string, content: string) => Promise<void>;
}

export interface MacNativeError extends Error {
  readonly code: MacNativeErrorCode;
  readonly details: unknown;
}

interface MacNativeRuntime {
  MacNativeError: {
    new (code: MacNativeErrorCode, message: string, details?: unknown): MacNativeError;
    readonly prototype: MacNativeError;
  };
  createMacAccessibilityNative: () => MacAccessibilityNative;
}

const require = createRequire(import.meta.url);
const runtime = require("./index.cjs") as MacNativeRuntime;

export const MacNativeError = runtime.MacNativeError;
export const createMacAccessibilityNative = runtime.createMacAccessibilityNative;
