use serde::Serialize;

use crate::features::tags::Tag;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Block {
    pub id: String,
    pub position: i64,
    pub content: String,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub will_archive: bool,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBlockResult {
    pub deleted_block_id: String,
}
