import { invoke } from "@/app/invoke";

export interface GreetRequest {
  name: string;
}

export type GreetResponse = string;

export async function greet(req: GreetRequest): Promise<GreetResponse> {
  return await invoke<GreetResponse>("greet", { ...req });
}
