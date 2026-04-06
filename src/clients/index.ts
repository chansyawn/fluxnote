export { greet } from "@/clients/sample";
export {
  createNoteBlock,
  deleteNoteBlock,
  getInboxNoteId,
  getNoteById,
  updateNoteBlockContent,
} from "@/clients/note";
export type { GreetRequest, GreetResponse } from "@/clients/sample";
export type {
  CreateNoteBlockRequest,
  DeleteNoteBlockRequest,
  DeleteNoteBlockResult,
  GetInboxNoteIdResponse,
  GetNoteByIdRequest,
  NoteDetail,
  NoteBlock,
  NoteSummary,
  UpdateNoteBlockContentRequest,
} from "@/clients/note";
