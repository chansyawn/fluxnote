mod models;
mod service;

use std::sync::Mutex;

use garde::Validate;
use serde::Deserialize;
use tauri::{AppHandle, State};
use tracing::{info, warn};

use crate::error::{AppResult, BusinessError};

pub use models::{DeleteNoteBlockResult, HomeNote, NoteBlock};
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
pub struct CreateNoteBlockArgs {
    #[garde(length(min = 1))]
    pub note_id: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateNoteBlockContentArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
    #[garde(skip)]
    pub content: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct DeleteNoteBlockArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
}

fn validate_args<T: Validate>(args: &T, command_name: &str) -> AppResult<()>
where
    T::Context: Default,
{
    args.validate().map_err(|report| {
        warn!(command = command_name, error = %report, "note command argument validation failed");
        let details = serde_json::to_value(&report)
            .ok()
            .or_else(|| Some(serde_json::json!({ "report": report.to_string() })));

        BusinessError::InvalidInvoke("Validation failed".to_string(), details).into()
    })
}

#[tauri::command]
#[tracing::instrument(name = "command.get_home_note", skip(state))]
pub fn get_home_note(state: State<'_, NoteState>) -> AppResult<HomeNote> {
    info!("loading home note");
    let mut service = state.lock()?;
    service.get_home_note()
}

#[tauri::command]
#[tracing::instrument(name = "command.create_note_block", skip(state, note_id))]
pub fn create_note_block(state: State<'_, NoteState>, note_id: String) -> AppResult<NoteBlock> {
    let args = CreateNoteBlockArgs { note_id };
    validate_args(&args, "create_note_block")?;

    info!("creating note block");
    let mut service = state.lock()?;
    service.create_note_block(&args.note_id)
}

#[tauri::command]
#[tracing::instrument(
    name = "command.update_note_block_content",
    skip(state, content),
    fields(content_len = tracing::field::Empty)
)]
pub fn update_note_block_content(
    state: State<'_, NoteState>,
    block_id: String,
    content: String,
) -> AppResult<NoteBlock> {
    let args = UpdateNoteBlockContentArgs { block_id, content };
    validate_args(&args, "update_note_block_content")?;
    tracing::Span::current().record("content_len", tracing::field::display(args.content.len()));

    info!("updating note block content");
    let mut service = state.lock()?;
    service.update_note_block_content(&args.block_id, &args.content)
}

#[tauri::command]
#[tracing::instrument(name = "command.delete_note_block", skip(state, block_id))]
pub fn delete_note_block(
    state: State<'_, NoteState>,
    block_id: String,
) -> AppResult<DeleteNoteBlockResult> {
    let args = DeleteNoteBlockArgs { block_id };
    validate_args(&args, "delete_note_block")?;

    info!("deleting note block");
    let mut service = state.lock()?;
    service.delete_note_block(&args.block_id)
}
