mod models;
mod service;

use std::sync::Mutex;

use garde::Validate;
use serde::Deserialize;
use tauri::{AppHandle, State};
use tracing::info;

use crate::error::{AppResult, BusinessError};
use crate::features::validated_command_arg::Validated;

pub use models::{Block, DeleteBlockResult, Tag};
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
pub struct ListBlocksArgs {
    #[garde(skip)]
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBlockContentArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
    #[garde(skip)]
    pub content: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBlockArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagArgs {
    #[garde(skip)]
    pub name: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct DeleteTagArgs {
    #[garde(length(min = 1))]
    pub tag_id: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct SetBlockTagsArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
    #[garde(skip)]
    pub tag_ids: Vec<String>,
}

#[tauri::command]
#[tracing::instrument(name = "command.list_blocks", skip(state, args))]
pub fn list_blocks(
    state: State<'_, NoteState>,
    args: Validated<ListBlocksArgs>,
) -> AppResult<Vec<Block>> {
    let args = args.into_inner();

    info!("listing blocks");
    let mut service = state.lock()?;
    service.list_blocks(args.tag_ids.as_deref().unwrap_or(&[]))
}

#[tauri::command]
#[tracing::instrument(name = "command.create_block", skip(state))]
pub fn create_block(state: State<'_, NoteState>) -> AppResult<Block> {
    info!("creating block");
    let mut service = state.lock()?;
    service.create_block()
}

#[tauri::command]
#[tracing::instrument(
    name = "command.update_block_content",
    skip(state, args),
    fields(content_len = tracing::field::Empty)
)]
pub fn update_block_content(
    state: State<'_, NoteState>,
    args: Validated<UpdateBlockContentArgs>,
) -> AppResult<Block> {
    let args = args.into_inner();
    tracing::Span::current().record("content_len", tracing::field::display(args.content.len()));

    info!("updating block content");
    let mut service = state.lock()?;
    service.update_block_content(&args.block_id, &args.content)
}

#[tauri::command]
#[tracing::instrument(name = "command.delete_block", skip(state, args))]
pub fn delete_block(
    state: State<'_, NoteState>,
    args: Validated<DeleteBlockArgs>,
) -> AppResult<DeleteBlockResult> {
    let args = args.into_inner();

    info!("deleting block");
    let mut service = state.lock()?;
    service.delete_block(&args.block_id)
}

#[tauri::command]
#[tracing::instrument(name = "command.list_tags", skip(state))]
pub fn list_tags(state: State<'_, NoteState>) -> AppResult<Vec<Tag>> {
    info!("listing tags");
    let mut service = state.lock()?;
    service.list_tags()
}

#[tauri::command]
#[tracing::instrument(name = "command.create_tag", skip(state, args))]
pub fn create_tag(state: State<'_, NoteState>, args: Validated<CreateTagArgs>) -> AppResult<Tag> {
    let args = args.into_inner();

    info!("creating tag");
    let mut service = state.lock()?;
    service.create_tag(&args.name)
}

#[tauri::command]
#[tracing::instrument(name = "command.delete_tag", skip(state, args))]
pub fn delete_tag(state: State<'_, NoteState>, args: Validated<DeleteTagArgs>) -> AppResult<()> {
    let args = args.into_inner();

    info!("deleting tag");
    let mut service = state.lock()?;
    service.delete_tag(&args.tag_id)
}

#[tauri::command]
#[tracing::instrument(name = "command.set_block_tags", skip(state, args))]
pub fn set_block_tags(
    state: State<'_, NoteState>,
    args: Validated<SetBlockTagsArgs>,
) -> AppResult<Block> {
    let args = args.into_inner();

    info!("updating block tags");
    let mut service = state.lock()?;
    service.set_block_tags(&args.block_id, &args.tag_ids)
}
