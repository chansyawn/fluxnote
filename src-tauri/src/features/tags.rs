pub(crate) mod models;
pub(crate) mod service;

use garde::Validate;
use serde::Deserialize;
use tauri::State;
use tracing::info;

use crate::database::DatabaseState;
use crate::error::AppResult;
use crate::features::blocks::Block;
use crate::features::validated_command_arg::Validated;

pub use models::Tag;

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
#[tracing::instrument(name = "command.tags_list", skip(state))]
pub fn tags_list(state: State<'_, DatabaseState>) -> AppResult<Vec<Tag>> {
    info!("listing tags");
    let conn = state.lock()?;
    service::list_tags(&conn)
}

#[tauri::command]
#[tracing::instrument(name = "command.tags_create", skip(state, args))]
pub fn tags_create(
    state: State<'_, DatabaseState>,
    args: Validated<CreateTagArgs>,
) -> AppResult<Tag> {
    let args = args.into_inner();

    info!("creating tag");
    let mut conn = state.lock()?;
    service::create_tag(&mut conn, &args.name)
}

#[tauri::command]
#[tracing::instrument(name = "command.tags_delete", skip(state, args))]
pub fn tags_delete(
    state: State<'_, DatabaseState>,
    args: Validated<DeleteTagArgs>,
) -> AppResult<()> {
    let args = args.into_inner();

    info!("deleting tag");
    let mut conn = state.lock()?;
    service::delete_tag(&mut conn, &args.tag_id)
}

#[tauri::command]
#[tracing::instrument(name = "command.tags_set_block_tags", skip(state, args))]
pub fn tags_set_block_tags(
    state: State<'_, DatabaseState>,
    args: Validated<SetBlockTagsArgs>,
) -> AppResult<Block> {
    let args = args.into_inner();

    info!("updating block tags");
    let mut conn = state.lock()?;
    service::set_block_tags(&mut conn, &args.block_id, &args.tag_ids)
}
