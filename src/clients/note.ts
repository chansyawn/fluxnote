import { invoke } from "@/app/invoke";

export interface NoteSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteBlock {
  id: string;
  noteId: string;
  position: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomeNote {
  note: NoteSummary;
  blocks: NoteBlock[];
}

export interface CreateNoteBlockRequest {
  noteId: string;
}

export interface UpdateNoteBlockContentRequest {
  blockId: string;
  content: string;
}

export interface DeleteNoteBlockRequest {
  blockId: string;
}

export interface DeleteNoteBlockResult {
  deletedBlockId: string;
}

export async function getHomeNote(): Promise<HomeNote> {
  return await invoke<HomeNote>("get_home_note");
}

export async function createNoteBlock(req: CreateNoteBlockRequest): Promise<NoteBlock> {
  return await invoke<NoteBlock>("create_note_block", { ...req });
}

export async function updateNoteBlockContent(
  req: UpdateNoteBlockContentRequest,
): Promise<NoteBlock> {
  return await invoke<NoteBlock>("update_note_block_content", { ...req });
}

export async function deleteNoteBlock(req: DeleteNoteBlockRequest): Promise<DeleteNoteBlockResult> {
  return await invoke<DeleteNoteBlockResult>("delete_note_block", { ...req });
}
