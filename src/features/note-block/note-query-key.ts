export const blockListQueryKey = (tagIds: string[]) =>
  ["blocks", [...tagIds].sort((left, right) => left.localeCompare(right))] as const;

export const tagListQueryKey = ["tags"] as const;
