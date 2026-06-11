import type { MacAccessibilityTextCapture } from "../index";

export type DevtoolsCaptureResult = MacAccessibilityTextCapture;

export interface DevtoolsErrorPayload {
  code?: string;
  details?: unknown;
  message: string;
  name: string;
}

export interface DevtoolsStatus {
  accessibilityTrusted: boolean;
  supported: boolean;
}

export type DevtoolsCaptureEvent =
  | {
      capturedAt: string;
      result: DevtoolsCaptureResult;
      type: "capture:success";
    }
  | {
      capturedAt: string;
      error: DevtoolsErrorPayload;
      type: "capture:error";
    };

export interface DevtoolsWriteBackRequest {
  content: string;
  textRef: string;
}
