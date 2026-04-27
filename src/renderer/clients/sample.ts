import { invokeCommand } from "@renderer/app/invoke";
import type { GreetRequest, GreetResponse } from "@shared/features/sample";

export type { GreetRequest, GreetResponse } from "@shared/features/sample";

export const greet = (req: GreetRequest): Promise<GreetResponse> =>
  invokeCommand("sampleGreet", req);
