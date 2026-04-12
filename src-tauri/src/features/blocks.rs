pub(crate) mod models;
pub(crate) mod service;

use garde::Validate;
use serde::Deserialize;
use tauri::State;
use tracing::info;

use crate::database::DatabaseState;
use crate::error::AppResult;
use crate::features::validated_command_arg::Validated;

pub use models::{Block, DeleteBlockResult};

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BlockVisibility {
    #[default]
    Active,
    Archived,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ListBlocksArgs {
    #[garde(skip)]
    pub tag_ids: Option<Vec<String>>,
    #[garde(skip)]
    pub visibility: Option<BlockVisibility>,
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
pub struct BlockMutationArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
}

#[tauri::command]
#[tracing::instrument(name = "command.blocks_list", skip(state, args))]
pub fn blocks_list(
    state: State<'_, DatabaseState>,
    args: Validated<ListBlocksArgs>,
) -> AppResult<Vec<Block>> {
    let args = args.into_inner();

    info!("listing blocks");
    let conn = state.lock()?;
    service::list_blocks(
        &conn,
        args.tag_ids.as_deref().unwrap_or(&[]),
        args.visibility.unwrap_or_default(),
    )
}

#[tauri::command]
#[tracing::instrument(name = "command.blocks_create", skip(state))]
pub fn blocks_create(state: State<'_, DatabaseState>) -> AppResult<Block> {
    info!("creating block");
    let mut conn = state.lock()?;
    service::create_block(&mut conn)
}

#[tauri::command]
#[tracing::instrument(
    name = "command.blocks_update_content",
    skip(state, args),
    fields(content_len = tracing::field::Empty)
)]
pub fn blocks_update_content(
    state: State<'_, DatabaseState>,
    args: Validated<UpdateBlockContentArgs>,
) -> AppResult<Block> {
    let args = args.into_inner();
    tracing::Span::current().record("content_len", tracing::field::display(args.content.len()));

    info!("updating block content");
    let mut conn = state.lock()?;
    service::update_block_content(&mut conn, &args.block_id, &args.content)
}

#[tauri::command]
#[tracing::instrument(name = "command.blocks_delete", skip(state, args))]
pub fn blocks_delete(
    state: State<'_, DatabaseState>,
    args: Validated<DeleteBlockArgs>,
) -> AppResult<DeleteBlockResult> {
    let args = args.into_inner();

    info!("deleting block");
    let mut conn = state.lock()?;
    service::delete_block(&mut conn, &args.block_id)
}

#[tauri::command]
#[tracing::instrument(name = "command.blocks_archive", skip(state, args))]
pub fn blocks_archive(
    state: State<'_, DatabaseState>,
    args: Validated<BlockMutationArgs>,
) -> AppResult<Block> {
    let args = args.into_inner();

    info!("archiving block");
    let mut conn = state.lock()?;
    service::archive_block(&mut conn, &args.block_id)
}

#[tauri::command]
#[tracing::instrument(name = "command.blocks_restore", skip(state, args))]
pub fn blocks_restore(
    state: State<'_, DatabaseState>,
    args: Validated<BlockMutationArgs>,
) -> AppResult<Block> {
    let args = args.into_inner();

    info!("restoring block");
    let mut conn = state.lock()?;
    service::restore_block(&mut conn, &args.block_id)
}
