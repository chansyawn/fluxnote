export { greet } from "@/clients/sample";
export {
  createBlock,
  createTag,
  deleteBlock,
  deleteTag,
  listBlocks,
  listTags,
  setBlockTags,
  updateBlockContent,
} from "@/clients/note";
export type { GreetRequest, GreetResponse } from "@/clients/sample";
export type {
  Block,
  CreateTagRequest,
  DeleteBlockResult,
  DeleteTagRequest,
  ListBlocksRequest,
  SetBlockTagsRequest,
  Tag,
  UpdateBlockContentRequest,
} from "@/clients/note";
