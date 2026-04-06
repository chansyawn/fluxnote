export const inboxNoteIdQueryKey = ["notes", "inbox-id"] as const;

export const noteDetailQueryKey = (noteId: string) => ["notes", noteId] as const;
