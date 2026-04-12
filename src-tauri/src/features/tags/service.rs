use std::collections::HashMap;

use anyhow::{anyhow, Context};
use rusqlite::{params, Connection, OptionalExtension, ToSql};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::error::{AppResult, BusinessError};
use crate::features::blocks;
use crate::features::blocks::Block;

use super::models::Tag;

pub fn list_tags(conn: &Connection) -> AppResult<Vec<Tag>> {
    let mut statement = conn
        .prepare(
            "SELECT id, name, created_at, updated_at
             FROM tags
             ORDER BY name COLLATE NOCASE ASC, created_at ASC",
        )
        .context("failed to prepare tag list query")?;

    let rows = statement
        .query_map([], map_tag)
        .context("failed to query tags")?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .context("failed to materialize tags")
        .map_err(Into::into)
}

pub fn create_tag(conn: &mut Connection, raw_name: &str) -> AppResult<Tag> {
    let name = normalize_tag_name(raw_name)?;
    let now = timestamp_now()?;
    let tag_id = create_id();
    let tx = conn
        .transaction()
        .context("failed to start create tag transaction")?;

    tx.execute(
        "INSERT INTO tags (id, name, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![tag_id, name, now, now],
    )
    .map_err(map_tag_write_error)?;

    let tag = get_tag_by_id(&tx, &tag_id)?
        .ok_or_else(|| anyhow!("created tag was not found immediately after insert"))?;

    tx.commit()
        .context("failed to commit create tag transaction")?;

    Ok(tag)
}

pub fn delete_tag(conn: &mut Connection, tag_id: &str) -> AppResult<()> {
    let deleted_rows = conn
        .execute("DELETE FROM tags WHERE id = ?1", params![tag_id])
        .context("failed to delete tag")?;

    if deleted_rows == 0 {
        return Err(BusinessError::NotFound(tag_id.to_string()).into());
    }

    Ok(())
}

pub fn set_block_tags(
    conn: &mut Connection,
    block_id: &str,
    tag_ids: &[String],
) -> AppResult<Block> {
    let normalized_tag_ids = dedupe_ids(tag_ids);
    let tx = conn
        .transaction()
        .context("failed to start set block tags transaction")?;
    blocks::service::get_block_by_id(&tx, block_id)?
        .ok_or_else(|| BusinessError::NotFound(block_id.to_string()))?;

    if !normalized_tag_ids.is_empty() {
        let matched_tag_count = count_matching_tags(&tx, &normalized_tag_ids)?;
        if matched_tag_count != normalized_tag_ids.len() {
            return Err(BusinessError::InvalidOperation(
                "One or more tags do not exist".to_string(),
                None,
            )
            .into());
        }
    }

    tx.execute(
        "DELETE FROM block_tags WHERE block_id = ?1",
        params![block_id],
    )
    .context("failed to clear block tags")?;

    for tag_id in &normalized_tag_ids {
        tx.execute(
            "INSERT INTO block_tags (block_id, tag_id)
             VALUES (?1, ?2)",
            params![block_id, tag_id],
        )
        .context("failed to attach tag to block")?;
    }

    let block = blocks::service::get_block_by_id(&tx, block_id)?
        .ok_or_else(|| anyhow!("updated block was not found after setting tags"))?;

    tx.commit()
        .context("failed to commit set block tags transaction")?;

    let mut blocks = blocks::service::attach_tags(conn, vec![block])?;
    blocks
        .pop()
        .ok_or_else(|| anyhow!("updated block was not found after attaching tags").into())
}

pub(crate) fn timestamp_now() -> anyhow::Result<String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .context("failed to format timestamp")
}

pub(crate) fn create_id() -> String {
    Uuid::now_v7().to_string()
}

pub(crate) fn list_tags_for_block_ids(
    conn: &Connection,
    block_ids: &[String],
) -> anyhow::Result<HashMap<String, Vec<Tag>>> {
    let placeholders = std::iter::repeat_n("?", block_ids.len())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "SELECT bt.block_id, t.id, t.name, t.created_at, t.updated_at
         FROM block_tags bt
         JOIN tags t ON t.id = bt.tag_id
         WHERE bt.block_id IN ({placeholders})
         ORDER BY t.name COLLATE NOCASE ASC, t.created_at ASC"
    );
    let params = block_ids
        .iter()
        .map(|block_id| block_id as &dyn ToSql)
        .collect::<Vec<_>>();
    let mut statement = conn
        .prepare(&sql)
        .context("failed to prepare block tags query")?;
    let rows = statement
        .query_map(params.as_slice(), |row| {
            Ok((
                row.get::<_, String>(0)?,
                Tag {
                    id: row.get(1)?,
                    name: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                },
            ))
        })
        .context("failed to query block tags")?;

    let pairs = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .context("failed to materialize block tags")?;
    let mut tags_by_block_id: HashMap<String, Vec<Tag>> = HashMap::new();

    for (block_id, tag) in pairs {
        tags_by_block_id.entry(block_id).or_default().push(tag);
    }

    Ok(tags_by_block_id)
}

fn dedupe_ids(ids: &[String]) -> Vec<String> {
    let mut deduped_ids = Vec::with_capacity(ids.len());

    for id in ids {
        if id.is_empty() || deduped_ids.contains(id) {
            continue;
        }

        deduped_ids.push(id.clone());
    }

    deduped_ids
}

fn normalize_tag_name(raw_name: &str) -> AppResult<String> {
    let trimmed_name = raw_name.trim();

    if trimmed_name.is_empty() {
        return Err(BusinessError::InvalidOperation(
            "Tag name must not be empty".to_string(),
            None,
        )
        .into());
    }

    Ok(trimmed_name.to_string())
}

fn count_matching_tags(
    conn: &rusqlite::Transaction<'_>,
    tag_ids: &[String],
) -> anyhow::Result<usize> {
    let placeholders = std::iter::repeat_n("?", tag_ids.len())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!("SELECT COUNT(*) FROM tags WHERE id IN ({placeholders})");
    let params = tag_ids
        .iter()
        .map(|id| id as &dyn ToSql)
        .collect::<Vec<_>>();

    conn.query_row(&sql, params.as_slice(), |row| row.get::<_, i64>(0))
        .map(|count| count as usize)
        .context("failed to count matching tags")
}

fn get_tag_by_id(tx: &rusqlite::Transaction<'_>, tag_id: &str) -> anyhow::Result<Option<Tag>> {
    tx.query_row(
        "SELECT id, name, created_at, updated_at FROM tags WHERE id = ?1",
        params![tag_id],
        map_tag,
    )
    .optional()
    .context("failed to query tag by id")
}

fn map_tag_write_error(error: rusqlite::Error) -> crate::error::AppError {
    match error {
        rusqlite::Error::SqliteFailure(sqlite_error, _) => {
            if sqlite_error.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE {
                return BusinessError::InvalidOperation(
                    "Tag name already exists".to_string(),
                    None,
                )
                .into();
            }

            anyhow::Error::new(rusqlite::Error::SqliteFailure(sqlite_error, None)).into()
        }
        other => anyhow::Error::new(other).into(),
    }
}

fn map_tag(row: &rusqlite::Row<'_>) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        updated_at: row.get(3)?,
    })
}
