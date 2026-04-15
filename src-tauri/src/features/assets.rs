pub(crate) mod service;

use garde::Validate;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tracing::info;

use crate::error::AppResult;
use crate::features::validated_command_arg::Validated;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssetArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
    #[garde(length(min = 1))]
    pub mime_type: String,
    #[garde(skip)]
    pub file_name: Option<String>,
    #[garde(length(min = 1))]
    pub data_base64: String,
}

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ResolveAssetArgs {
    #[garde(length(min = 1))]
    pub block_id: String,
    #[garde(length(min = 1))]
    pub asset_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssetResult {
    pub asset_url: String,
    pub alt_text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveAssetResult {
    pub resolved_path: String,
}

#[tauri::command]
#[tracing::instrument(name = "command.assets_create", skip(app, args))]
pub fn assets_create(
    app: AppHandle,
    args: Validated<CreateAssetArgs>,
) -> AppResult<CreateAssetResult> {
    let args = args.into_inner();

    info!(block_id = %args.block_id, mime_type = %args.mime_type, "creating asset");
    service::create_asset(
        &app,
        &args.block_id,
        &args.mime_type,
        args.file_name.as_deref(),
        &args.data_base64,
    )
}

#[tauri::command]
#[tracing::instrument(name = "command.assets_resolve", skip(app, args))]
pub fn assets_resolve(
    app: AppHandle,
    args: Validated<ResolveAssetArgs>,
) -> AppResult<ResolveAssetResult> {
    let args = args.into_inner();

    info!(block_id = %args.block_id, asset_url = %args.asset_url, "resolving asset");
    service::resolve_asset(&app, &args.block_id, &args.asset_url)
}
