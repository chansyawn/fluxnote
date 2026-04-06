mod models;
mod service;

use std::sync::Mutex;

use garde::Validate;
use serde::Deserialize;
use tauri::{AppHandle, State};
use tracing::info;

use crate::error::{AppResult, BusinessError};
use crate::features::validated_command_arg::Validated;

pub use models::{DeleteNoteBlockResult, InboxNoteIdResult, NoteBlock, NoteDetail};
use service::NoteService;

pub struct NoteState {
    service: Mutex<NoteService>,
}

impl NoteState {
    fn lock(&self) -> AppResult<std::sync::MutexGuard<'_, NoteService>> {
        self.service.lock().map_err(|_| {
            BusinessError::InternalState("Note state lock poisoned".to_string()).into()
        })
    }
}

pub fn init_note_state(app: &AppHandle) -> anyhow::Result<NoteState> {
    let service = NoteService::open(app)?;
    Ok(NoteState {
        service: Mutex::new(service),
    })
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct GetNoteByIdArgs {
    #[garde(length(min = 1))]
    pub note_id: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteBlockArgs {
    #[garde(length(min = 1))]
    pub note_id: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteBlockContentArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
    #[garde(skip)]
    pub content: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct DeleteNoteBlockArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
}

#[tauri::command]
#[tracing::instrument(name = "command.get_inbox_note_id", skip(state))]
pub fn get_inbox_note_id(state: State<'_, NoteState>) -> AppResult<InboxNoteIdResult> {
    info!("loading inbox note id");
    let mut service = state.lock()?;
    let note_id = service.get_inbox_note_id()?;
    Ok(InboxNoteIdResult { note_id })
}

#[tauri::command]
#[tracing::instrument(name = "command.get_note_by_id", skip(state, args))]
pub fn get_note_by_id(
    state: State<'_, NoteState>,
    args: Validated<GetNoteByIdArgs>,
) -> AppResult<NoteDetail> {
    let args = args.into_inner();

    info!("loading note by id");
    let mut service = state.lock()?;
    service.get_note_by_id(&args.note_id)
}

#[tauri::command]
#[tracing::instrument(name = "command.create_note_block", skip(state, args))]
pub fn create_note_block(
    state: State<'_, NoteState>,
    args: Validated<CreateNoteBlockArgs>,
) -> AppResult<NoteBlock> {
    let args = args.into_inner();

    info!("creating note block");
    let mut service = state.lock()?;
    service.create_note_block(&args.note_id)
}

#[tauri::command]
#[tracing::instrument(
    name = "command.update_note_block_content",
    skip(state, args),
    fields(content_len = tracing::field::Empty)
)]
pub fn update_note_block_content(
    state: State<'_, NoteState>,
    args: Validated<UpdateNoteBlockContentArgs>,
) -> AppResult<NoteBlock> {
    let args = args.into_inner();
    tracing::Span::current().record("content_len", tracing::field::display(args.content.len()));

    info!("updating note block content");
    let mut service = state.lock()?;
    service.update_note_block_content(&args.block_id, &args.content)
}

#[tauri::command]
#[tracing::instrument(name = "command.delete_note_block", skip(state, args))]
pub fn delete_note_block(
    state: State<'_, NoteState>,
    args: Validated<DeleteNoteBlockArgs>,
) -> AppResult<DeleteNoteBlockResult> {
    let args = args.into_inner();

    info!("deleting note block");
    let mut service = state.lock()?;
    service.delete_note_block(&args.block_id)
}
