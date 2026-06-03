import { queryClient } from "@renderer/app/query";

export const BLOCKS_QUERY_KEY = ["blocks"] as const;

export function refreshBlocks(): void {
  void queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
}
