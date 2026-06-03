import { queryClient } from "@renderer/app/query";
import {
  listBlocks,
  type Block,
  type BlockVisibility,
  type ListBlocksRequest,
  type ListBlocksResult,
} from "@renderer/clients";
import { BLOCKS_QUERY_KEY } from "@renderer/features/blocks/block-query";

export const BLOCKS_PAGE_SIZE = 10;

export interface WorkspaceBlockView {
  tagIds: string[];
  visibility: BlockVisibility;
}

export function normalizeWorkspaceBlockView({ tagIds, visibility }: WorkspaceBlockView) {
  return {
    tagIds: [...tagIds].sort((left, right) => left.localeCompare(right)),
    visibility,
  };
}

export function workspaceBlockListQueryKey(view: WorkspaceBlockView) {
  const normalizedView = normalizeWorkspaceBlockView(view);
  return [...BLOCKS_QUERY_KEY, normalizedView.visibility, normalizedView.tagIds] as const;
}

export function workspaceBlockListPageQueryKey(view: WorkspaceBlockView, offset: number) {
  return [...workspaceBlockListQueryKey(view), "page", offset] as const;
}

export function getWorkspaceBlockPageOffset(index: number) {
  return Math.floor(index / BLOCKS_PAGE_SIZE) * BLOCKS_PAGE_SIZE;
}

export function toWorkspaceListBlocksRequest(
  view: WorkspaceBlockView,
  offset: number,
): ListBlocksRequest {
  const normalizedView = normalizeWorkspaceBlockView(view);
  return {
    tagIds: normalizedView.tagIds.length > 0 ? normalizedView.tagIds : undefined,
    visibility: normalizedView.visibility,
    offset,
    limit: BLOCKS_PAGE_SIZE,
  };
}

export async function listWorkspaceBlockPage(
  view: WorkspaceBlockView,
  offset: number,
): Promise<ListBlocksResult> {
  return await listBlocks(toWorkspaceListBlocksRequest(view, offset));
}

export async function fetchWorkspaceBlockPage(
  view: WorkspaceBlockView,
  offset: number,
  options?: { refresh?: boolean },
): Promise<ListBlocksResult> {
  const queryKey = workspaceBlockListPageQueryKey(view, offset);

  if (options?.refresh) {
    await queryClient.cancelQueries({ exact: true, queryKey });
    const page = await listWorkspaceBlockPage(view, offset);
    queryClient.setQueryData(queryKey, page);
    return page;
  }

  return await queryClient.fetchQuery({
    queryKey,
    queryFn: async () => await listWorkspaceBlockPage(view, offset),
    staleTime: 0,
  });
}

export function patchWorkspaceBlock(updatedBlock: Block): void {
  queryClient.setQueriesData<ListBlocksResult>({ queryKey: BLOCKS_QUERY_KEY }, (current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      blocks: current.blocks.map((block) => (block.id === updatedBlock.id ? updatedBlock : block)),
    };
  });
}

export function getCachedWorkspaceBlock(blockId: string): Block | undefined {
  for (const [, cached] of queryClient.getQueriesData<ListBlocksResult>({
    queryKey: BLOCKS_QUERY_KEY,
  })) {
    const found = cached?.blocks.find((block) => block.id === blockId);
    if (found) {
      return found;
    }
  }
  return undefined;
}
