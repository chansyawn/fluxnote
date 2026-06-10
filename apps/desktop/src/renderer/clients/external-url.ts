import type {
  ExternalUrlFaviconResponse,
  externalUrlContract,
} from "@shared/features/external-url/contract";
import type { z } from "zod";

import { invokeCommand } from "./ipc/invoke";

export type ExternalUrlOpenRequest = z.infer<
  (typeof externalUrlContract)["commands"]["external-url.open"]["input"]
>;

export const openExternalUrl = (request: ExternalUrlOpenRequest): Promise<void> =>
  invokeCommand("external-url.open", request);

export const fetchUrlFavicon = (url: string): Promise<ExternalUrlFaviconResponse> =>
  invokeCommand("external-url.fetch-favicon", { url });
