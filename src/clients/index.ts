export { greet } from "@/clients/sample";
export { createBlock, deleteBlock, listBlocks, updateBlockContent } from "@/clients/blocks";
export { createTag, deleteTag, listTags, setBlockTags } from "@/clients/tags";
export type { GreetRequest, GreetResponse } from "@/clients/sample";
export type {
  Block,
  DeleteBlockResult,
  ListBlocksRequest,
  UpdateBlockContentRequest,
} from "@/clients/blocks";
export type { CreateTagRequest, DeleteTagRequest, SetBlockTagsRequest, Tag } from "@/clients/tags";
