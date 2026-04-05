export { greet } from "@/clients/sample";
export {
  createNoteBlock,
  deleteNoteBlock,
  getHomeNote,
  updateNoteBlockContent,
} from "@/clients/note";
export type { GreetRequest, GreetResponse } from "@/clients/sample";
export type {
  CreateNoteBlockRequest,
  DeleteNoteBlockRequest,
  DeleteNoteBlockResult,
  HomeNote,
  NoteBlock,
  NoteSummary,
  UpdateNoteBlockContentRequest,
} from "@/clients/note";
