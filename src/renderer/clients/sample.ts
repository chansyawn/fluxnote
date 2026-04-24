import { invokeCommand } from "@renderer/app/invoke";
import type { GreetRequest, GreetResponse } from "@shared/ipc/contracts";

export type { GreetRequest, GreetResponse } from "@shared/ipc/contracts";

export const greet = (req: GreetRequest): Promise<GreetResponse> =>
  invokeCommand("sampleGreet", req);
